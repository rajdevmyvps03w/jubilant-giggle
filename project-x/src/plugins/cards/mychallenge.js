// src/plugins/cards/mychallenge.js

import { plugin } from '../../utils/plugin.js'
import {
    assignChallenge,
    getActiveChallenge,
    checkLiveChallenge,
    findUser,
    isPotionValid,
    getGroupLuckBonus,
    getState,
    saveState
} from '../../database/db.js'
import { CHALLENGE_DEFS } from '../../database/db.js'
import { getTierEmoji } from '../../handler/card.js'

const CHANCE_BASE = 25
const CHANCE_LUCKY_POT = 35
const CHANCE_GROUP_LUCK = 37
const ROLL_COOLDOWN_MS = 24 * 60 * 60 * 1000 // 24h between roll attempts

export const progressBar = (current, goal, size = 10) => {
    if (!goal || goal <= 0) {
        return '░'.repeat(size) + ' 0%'
    }
    const pct = Math.min(current / goal, 1)
    const filled = Math.round(pct * size)
    return `${'█'.repeat(filled)}${'░'.repeat(size - filled)} ${Math.round(pct * 100)}%`
}

const fmtMs = (ms) => {
    const h = Math.floor(ms / 3600000)
    const m = Math.floor((ms % 3600000) / 60000)
    if (h > 0) {
        return `${h}h ${m}m`
    }
    return `${m}m`
}

plugin(
    {
        name: 'mychallenge',
        aliases: ['challenge', 'mychal', 'chal'],
        category: 'cards',
        description: {
            content:
                'Try your luck to get a challenge. Complete it to earn a card from your wishlist. One roll attempt per 24h.'
        }
    },
    async (_, M) => {
        try {
            const prefix = global.config.prefix
            const jid = M.sender.id

            let active = await getActiveChallenge(jid)

            if (active) {
                await checkLiveChallenge(jid, M.from)
                active = await getActiveChallenge(jid)
            }

            // ── Display existing challenge ─────────────────────────────────────
            if (active) {
                const def = CHALLENGE_DEFS.find((d) => d.id === active.challengeId)
                const label = def?.label || active.challengeId
                const taskText = def
                    ? def.description.replace('{goal}', active.goal).replace('{tier}', active.targetTier)
                    : `Complete ${active.goal} task(s).`

                const user = await findUser(jid, 'name wishlist')
                const rewardCard = (user?.wishlist || []).find((c) => c.id === active.cardId)
                const rewardLine = rewardCard
                    ? `🎁 *Reward:* ${rewardCard.title} (${rewardCard.tier})`
                    : `🎁 *Reward:* Card ID \`${active.cardId}\` _(must still be in your wishlist)_`

                const statusEmoji = active.completed ? '✅' : '🔄'
                const statusText = active.completed
                    ? `COMPLETED ~ Use *${prefix}claimchallenge* to collect!`
                    : `In Progress`

                return M.reply(
                    `🎯 *YOUR ACTIVE CHALLENGE*\n\n` +
                        `📌 *Type:* ${label}\n` +
                        `📝 *Task:* ${taskText}\n\n` +
                        `${rewardLine}\n\n` +
                        `📊 *Progress:* ${active.progress} / ${active.goal}\n` +
                        `${progressBar(active.progress, active.goal)}\n\n` +
                        `${statusEmoji} *Status:* ${statusText}\n\n` +
                        `_Use *${prefix}forfeitchallenge* to give up.\n` +
                        `⚠️ Forfeiting will remove this card from your wishlist permanently._`
                )
            }

            // ── No active challenge — check wishlist ───────────────────────────
            const user = await findUser(jid, 'wishlist challenges')
            if (!user?.wishlist?.length) {
                return M.reply(
                    `📋 *No Wishlist Found*\n\n` +
                        `You need at least one card in your wishlist to receive challenges.\n\n` +
                        `Add cards with:\n*${prefix}wishlistadd <mazoku or shoob url>*\n\n` +
                        `_Note: There is a 24-hour cooldown between wishlist adds._`
                )
            }

            const usedCardIds = new Set((user.challenges || []).filter((c) => c.cardId).map((c) => c.cardId))
            const availableCards = (user.wishlist || []).filter((c) => !usedCardIds.has(c.id))

            if (availableCards.length === 0) {
                return M.reply(
                    `♻️ *All Wishlist Cards Used!*\n\n` +
                        `Every card in your wishlist has already been assigned as a challenge reward.\n\n` +
                        `To get new challenges:\n` +
                        `• Add new cards: *${prefix}wishlistadd <url>*\n` +
                        `• Or remove old ones: *${prefix}mywishlist --remove=INDEX*\n\n` +
                        `_Each card can only be a challenge reward once._`
                )
            }

            // ── ROLL COOLDOWN — one attempt per 24h ───────────────────────────
            const rollKey = `chal_roll:${jid}`
            const lastRoll = await getState(rollKey)
            const now = Date.now()

            if (lastRoll !== null) {
                const elapsed = now - lastRoll
                const remaining = ROLL_COOLDOWN_MS - elapsed
                if (remaining > 0) {
                    return M.reply(
                        `⏳ *Challenge Roll on Cooldown*\n\n` +
                            `You already rolled today.\n` +
                            `Try again in *${fmtMs(remaining)}*.\n\n` +
                            `_You get one roll attempt every 24 hours._`
                    )
                }
            }

            // ── Roll for challenge chance ──────────────────────────────────────
            const [hasLuckyPotion, groupLuckBonus] = await Promise.all([
                isPotionValid(jid, 'luckpotion'),
                M.chat === 'group' ? getGroupLuckBonus(jid, M.from) : Promise.resolve(0)
            ])

            const hasGroupLuck = groupLuckBonus > 0

            let chance = CHANCE_BASE
            let chanceLabel = `🎲 Base chance`

            if (hasGroupLuck) {
                chance = CHANCE_GROUP_LUCK
                chanceLabel = `✨ Group Luck bonus active`
            } else if (hasLuckyPotion) {
                chance = CHANCE_LUCKY_POT
                chanceLabel = `🍀 Lucky Potion active`
            }

            const roll = Math.floor(Math.random() * 100) + 1
            const success = roll <= chance

            // Stamp the roll attempt BEFORE checking success so both outcomes consume the cooldown
            await saveState(rollKey, now, ROLL_COOLDOWN_MS)

            if (!success) {
                return M.reply(
                    `🎲 *No Challenge This Time!*\n\n` +
                        `You rolled *${roll}*  needed *${chance} or below*.\n\n` +
                        `${chanceLabel}: *${chance}%*\n` +
                        `🃏 *Available cards:* ${availableCards.length}/${user.wishlist.length}\n\n` +
                        `⏳ *Next roll in:* 24 hours\n\n` +
                        `💡 *Boost your odds:*\n` +
                        `• Buy a 🍀 *Lucky Potion* from *${prefix}store* → 35%\n` +
                        `• Be a home member with *Lucky Users* group feature → 37%`
                )
            }

            // ── Assign challenge ───────────────────────────────────────────────
            const result = await assignChallenge(jid)

            if (!result.ok) {
                if (result.error === 'ALL_CARDS_USED') {
                    return M.reply(
                        `♻️ *All Wishlist Cards Used!*\n\nAdd new cards with *${prefix}wishlistadd <url>* to continue.`
                    )
                }
                if (result.error === 'ALREADY_HAS_CHALLENGE') {
                    return M.reply(`⚠️ You already have an active challenge. Use *${prefix}mychallenge* to view it.`)
                }
                return M.reply(`❌ Could not assign a challenge right now. Please try again in a moment.`)
            }

            const { challenge, def, rewardCard, availableCount } = result
            const emoji = getTierEmoji(rewardCard.tier)

            return M.reply(
                `🎉 *YOU GOT A CHALLENGE!*\n\n` +
                    `You rolled *${roll}* needed *${chance} or below*. Lucky!\n` +
                    `${chanceLabel}: *${chance}%*\n\n` +
                    `📌 *Challenge:* ${def.label}\n` +
                    `📝 *Task:* ${def.description.replace('{goal}', challenge.goal).replace('{tier}', challenge.targetTier)}\n\n``🎁 *Reward Card:* ${rewardCard.title}\n` +
                    `${emoji} *Tier:* ${rewardCard.tier}\n` +
                    `📺 *Source:* ${rewardCard.source || 'Unknown'}\n\n` +
                    `📊 *Progress:* 0 / ${challenge.goal}\n` +
                    `${progressBar(0, challenge.goal)}\n\n` +
                    `🃏 *Cards remaining:* ${availableCount - 1} more unused card(s)\n\n` +
                    `_Complete the task and use *${prefix}claimchallenge* to collect your card!_\n` +
                    `_To give up: *${prefix}forfeitchallenge* (removes card from wishlist)_`
            )
        } catch (err) {
            console.error('[MYCHALLENGE ERROR]', err)
            return M.reply('❌ An error occurred while fetching your challenge.')
        }
    }
)
