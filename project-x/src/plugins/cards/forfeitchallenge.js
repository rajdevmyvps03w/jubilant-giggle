import { plugin } from '../../utils/plugin.js'
import { forfeitChallenge, getActiveChallenge } from '../../database/db.js'
import { getTierEmoji } from '../../handler/card.js'
import { CHALLENGE_DEFS } from '../../database/db.js'
import { progressBar } from './mychallenge.js'

plugin(
    {
        name: 'forfeitchallenge',
        aliases: ['forfeitchal', 'abandonchallenge', 'giveupchal', 'ffc'],
        category: 'cards',
        description: {
            content:
                'Forfeit your active challenge. Your progress will be lost and the reward card will be permanently removed from your wishlist.',
            usage: '[--confirm]',
            example: '--confirm'
        }
    },
    async (_, M, { flags }) => {
        try {
            const prefix = global.config.prefix
            const jid = M.sender.id

            // Fetch current challenge to show the user what they're giving up
            const active = await getActiveChallenge(jid)

            if (!active) {
                return M.reply(
                    `❌ *No active challenge to forfeit.*\n\n` +
                        `Use *${prefix}mychallenge* to try your luck at getting one.`
                )
            }

            // ── Safety gate — require --confirm flag ──────────────────────────
            // Without it, show a warning so user knows what they're about to lose.
            if (!('confirm' in flags)) {
                const def = CHALLENGE_DEFS.find((d) => d.id === active.challengeId)

                return M.reply(
                    `⚠️ *Are you sure you want to forfeit?*\n\n` +
                        `📌 *Challenge:* ${def?.label || active.challengeId}\n` +
                        `📊 *Progress:* ${active.progress} / ${active.goal}\n` +
                        `${progressBar(active.progress, active.goal)}\n\n` +
                        `🎁 *Reward Card ID:* \`${active.cardId}\`\n\n` +
                        `*If you forfeit:*\n` +
                        `• ❌ All your progress will be lost\n` +
                        `• 🗑️ The reward card will be removed from your wishlist permanently\n` +
                        `• 🔄 You can try for a new challenge after forfeiting\n\n` +
                        `_To confirm, run:_\n` +
                        `*${prefix}forfeitchallenge --confirm*`
                )
            }

            // ── Confirmed — execute forfeit ────────────────────────────────────
            const result = await forfeitChallenge(jid)

            if (!result.ok) {
                if (result.error === 'NO_ACTIVE_CHALLENGE') {
                    return M.reply(`❌ You don't have an active challenge to forfeit.`)
                }
                return M.reply(`❌ An error occurred while forfeiting. Please try again.`)
            }

            const cardTitle = result.rewardCard?.title || `Card \`${result.cardId}\``
            const cardTier = result.rewardCard?.tier || 'Unknown'
            const emoji = getTierEmoji(cardTier)

            return M.reply(
                `🏳️ *Challenge Forfeited.*\n\n` +
                    `Your challenge has been abandoned and all progress has been wiped.\n\n` +
                    `🗑️ *Removed from wishlist:*\n` +
                    `${emoji} ${cardTitle} (${cardTier})\n\n` +
                    `_This card can no longer be a challenge reward for you._\n\n` +
                    `Ready to try again? Use *${prefix}mychallenge* to roll for a new challenge.`
            )
        } catch (err) {
            console.error('[FORFEITCHALLENGE ERROR]', err)
            return M.reply('❌ An error occurred. Please try again.')
        }
    }
)
