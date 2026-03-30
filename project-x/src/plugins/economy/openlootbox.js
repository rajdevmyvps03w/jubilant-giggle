import { plugin } from '../../utils/plugin.js'
import {
    findUser,
    addToWallet,
    addGroupFunds,
    generateSecureCode,
    addCardToDeck,
    addCardToCollection,
    isPotionValid,
    isRegUser,
    isSupportGroup,
    hasWarnType,
    getGroupLuckBonus,
    claimLootboxSlot,
    releaseLootboxSlot,
    addItemToInventory,
    removeLootboxFromInventory,
    addExp
} from '../../database/db.js'

import { summonMazCard, summonShoobCard } from '../../handler/card.js'
import { getRandomInt } from '../../functions/helpler.js'

const MAX_TRIES = 10
const DAILY_LIMIT = 30
const SPAM_WINDOW_MS = 2 * 60 * 1000
const SPAM_COOLDOWN = 10 * 60 * 60 * 1000
const BASE_COOLDOWN = 5 * 60 * 60 * 1000
const WARN2_COOLDOWN = 12 * 60 * 60 * 1000

const fmtMs = (ms) => {
    const h = Math.floor(ms / 3600000)
    const m = Math.floor((ms % 3600000) / 60000)
    const s = Math.floor((ms % 60000) / 1000)
    if (h > 0) return `${h}h ${m}m`
    if (m > 0) return `${m}m ${s}s`
    return `${s}s`
}

plugin(
    {
        name: 'openlootbox',
        aliases: ['openlb', 'lootboxopen'],
        category: 'economy',
        isGroup: true,
        description: {
            usage: '<index>',
            content: 'Open lootboxes. Max 10 per session, 30 per day. No limit in support groups.',
            example: '1'
        }
    },
    async (client, M, { args }) => {
        try {
            const now = Date.now()
            const inSupport = isSupportGroup(M.from)

            // ── 1. FETCH USER ─────────────────────────────────────────────
            const user = await findUser(M.sender.id, 'inventory exp lbCount lbResetTime lbDailyCount lbDailyReset')

            // ── 2. DAILY LIMIT — skip entirely for support groups ─────────
            if (!inSupport) {
                const MIDNIGHT = (() => {
                    const d = new Date()
                    d.setHours(0, 0, 0, 0)
                    return d.getTime()
                })()
                const dailyReset = user.lbDailyReset ? new Date(user.lbDailyReset).getTime() : 0
                const dailyCount = dailyReset < MIDNIGHT ? 0 : user.lbDailyCount || 0

                if (dailyCount >= DAILY_LIMIT) {
                    const msLeft = MIDNIGHT + 86400000 - now
                    return M.reply(
                        `🚫 *Daily Limit Reached!*\n\n` +
                            `You've opened *${DAILY_LIMIT}/${DAILY_LIMIT}* lootboxes today.\n` +
                            `⏰ *Resets in:* ${fmtMs(msLeft)}\n\n` +
                            `_Come back tomorrow!_`
                    )
                }
            }

            // ── 3. SESSION COOLDOWN — skip entirely for support groups ────
            const lbCount = user.lbCount || 0
            const resetTime = user.lbResetTime ? new Date(user.lbResetTime).getTime() : 0

            if (!inSupport && lbCount >= MAX_TRIES) {
                const streakDuration = resetTime > 0 ? now - resetTime : Infinity
                const isWarn2 = await hasWarnType(M.sender.id, M.from, 2)
                const isSpam = streakDuration < SPAM_WINDOW_MS
                const cooldown = isSpam ? SPAM_COOLDOWN : isWarn2 ? WARN2_COOLDOWN : BASE_COOLDOWN
                const remaining = cooldown - (now - resetTime)

                if (remaining > 0) {
                    if (isSpam) {
                        return M.reply(
                            `🛑 *Anti-Spam Cooldown*\n\n` +
                                `You opened 10 boxes in under 2 minutes.\n` +
                                `⏳ *Wait:* ${fmtMs(remaining)}\n\n` +
                                `_Slow down, lootboxes aren't going anywhere._`
                        )
                    }
                    return M.reply(
                        `⏳ *Session Limit Reached!*\n\n` +
                            `You've opened ${MAX_TRIES} boxes this session.\n` +
                            `⏰ *Wait:* ${fmtMs(remaining)}` +
                            (isWarn2 ? `\n⚠️ Cooldown extended due to Warning Type 2.` : '')
                    )
                }

                await releaseLootboxSlot(M.sender.id)
            }

            // ── 4. INVENTORY CHECK ────────────────────────────────────────
            const inventory = user.inventory || []
            const lbIndexes = inventory.reduce((acc, item, i) => {
                if (item.type === 'LOOTBOX') acc.push(i)
                return acc
            }, [])

            if (lbIndexes.length === 0) {
                return M.reply('⚠️ *Empty Inventory* You have no lootboxes.\nBuy some from the shop!')
            }

            if (!args[0]) {
                const freshCount = inSupport ? lbCount : (await findUser(M.sender.id, 'lbCount'))?.lbCount || 0
                const MIDNIGHT = (() => {
                    const d = new Date()
                    d.setHours(0, 0, 0, 0)
                    return d.getTime()
                })()
                const dailyReset = user.lbDailyReset ? new Date(user.lbDailyReset).getTime() : 0
                const freshDaily = dailyReset < MIDNIGHT ? 0 : user.lbDailyCount || 0

                let msg = `📦 *Lootbox Collection (${lbIndexes.length})*\n`
                if (inSupport) {
                    msg += `🌐 *Support group unlimited opens*\n\n`
                } else {
                    msg += `⚡ *Session:* ${MAX_TRIES - freshCount}/${MAX_TRIES} remaining\n`
                    msg += `📅 *Daily:*   ${DAILY_LIMIT - freshDaily}/${DAILY_LIMIT} remaining\n\n`
                }

                const limit = Math.min(lbIndexes.length, 15)
                for (let i = 0; i < limit; i++) {
                    const box = inventory[lbIndexes[i]]
                    msg += `${i + 1}# 🎁 ${box.name || 'Standard Box'}\n`
                }
                if (lbIndexes.length > 15) msg += `_...and ${lbIndexes.length - 15} more._\n`
                msg += `\n💡 _Use *${global.config.prefix}openlb <index>* to open_`
                return M.reply(msg)
            }

            const choice = parseInt(args[0]) - 1
            if (isNaN(choice) || choice < 0 || choice >= lbIndexes.length) {
                return M.reply(`❌ Invalid index. You have ${lbIndexes.length} lootbox(es). Use 1–${lbIndexes.length}.`)
            }

            // ── 5. ATOMIC SLOT GATE — skip for support groups ─────────────
            let newCount = lbCount + 1
            let newDailyCount = (user.lbDailyCount || 0) + 1

            if (!inSupport) {
                const MIDNIGHT = (() => {
                    const d = new Date()
                    d.setHours(0, 0, 0, 0)
                    return d.getTime()
                })()
                const dailyReset = user.lbDailyReset ? new Date(user.lbDailyReset).getTime() : 0
                const dailyCount = dailyReset < MIDNIGHT ? 0 : user.lbDailyCount || 0

                const slotResult = await claimLootboxSlot(M.sender.id, MAX_TRIES, DAILY_LIMIT, dailyCount < 1)
                if (!slotResult) {
                    return M.reply(
                        `⏳ *Already at limit!*\n\n` +
                            `Someone (or you) just used your last slot.\n` +
                            `Check *${global.config.prefix}openlb* for your remaining cooldown.`
                    )
                }
                newCount = slotResult.lbCount
                newDailyCount = slotResult.lbDailyCount
            }

            // ── 6. CONSUME THE LOOTBOX ────────────────────────────────────
            const targetItem = inventory[lbIndexes[choice]]
            await removeLootboxFromInventory(M.sender.id, targetItem)

            // ── 7. LUCK ───────────────────────────────────────────────────
            const [hasLuckPotion, groupLuck] = await Promise.all([
                isPotionValid(M.sender.id, 'luckpotion'),
                M.isGroup ? getGroupLuckBonus(M.sender.id, M.from) : Promise.resolve(0)
            ])
            const luckMult = 1 + (hasLuckPotion ? 0.35 : 0) + groupLuck * 0.5

            // ── 8. REWARDS ────────────────────────────────────────────────
            let totalCredits = 0
            let totalExp = 0
            const rewardItems = []
            let cardReward = null
            const rollCount = hasLuckPotion ? getRandomInt(4, 7) : getRandomInt(2, 5)

            for (let i = 0; i < rollCount; i++) {
                const roll = Math.random() * 100
                if (roll < 0.8 * luckMult && !cardReward) {
                    cardReward =
                        Math.random() > 0.5
                            ? await summonMazCard(null, M.from, client, true, Math.random() > 0.5)
                            : await summonShoobCard(null, M.from, client, true, Math.random() > 0.5)
                } else if (roll < 1 * luckMult) {
                    rewardItems.push({
                        type: 'LOOTBOX',
                        usage: 'ONETIME',
                        name: 'Standard Lootbox',
                        purchasedAt: new Date()
                    })
                } else if (roll < 15) {
                    const code = await generateSecureCode({
                        type: 'DISCOUNT',
                        discountPercent: getRandomInt(5, 15),
                        createdAt: new Date()
                    })
                    rewardItems.push({ type: 'REDEEMCODE', name: code })
                } else if (roll < 28) {
                    const pots = ['luckpotion', 'robprotection', 'exppotion', 'moneypotion']
                    rewardItems.push({
                        usage: 'TIMEPERIOD',
                        type: 'POTION',
                        name: pots[getRandomInt(0, 3)],
                        duration: getRandomInt(1, 2),
                        purchasedAt: new Date()
                    })
                } else if (roll < 65) {
                    totalCredits += Math.floor(getRandomInt(300, 10000) * luckMult)
                } else {
                    totalExp += Math.floor(getRandomInt(20, 50) * luckMult)
                }
            }

            // ── 9. WRITE REWARDS ──────────────────────────────────────────
            const dbWrites = []

            if (totalExp > 0) dbWrites.push(addExp(M.sender.id, totalExp))
            for (const item of rewardItems) dbWrites.push(addItemToInventory(M.sender.id, item))

            if (totalCredits > 0) {
                const isRestricted5 = await hasWarnType(M.sender.id, M.from, 5)
                if (M.chat === 'group' && isRestricted5) {
                    const penaltyPct = getRandomInt(50, 90)
                    const deduction = Math.floor(totalCredits * (penaltyPct / 100))
                    totalCredits -= deduction
                    dbWrites.push(addGroupFunds(M.from, deduction))
                    await M.reply(
                        `📉 *PENALTY NOTICE (Type 5)*\nEarnings reduced by *${penaltyPct}%*. ₹${deduction} → Group Funds.`
                    )
                }
                dbWrites.push(addToWallet(M.sender.id, totalCredits))
            }

            if (cardReward) {
                const isRestricted6 = await hasWarnType(M.sender.id, M.from, 6)
                if (isRestricted6) {
                    const participants = M.groupMetadata.participants.map((p) => p.id)
                    const shuffled = [...participants].sort(() => 0.5 - Math.random())
                    let luckyUser = null
                    for (const p of shuffled) {
                        if (p !== M.sender.id && (await isRegUser(p))) {
                            luckyUser = p
                            break
                        }
                    }
                    if (luckyUser) {
                        const wentToDeck = await addCardToDeck(luckyUser, cardReward)
                        if (!wentToDeck) await addCardToCollection(luckyUser, cardReward)
                        await M.reply(
                            `🚫 *CLAIM RESTRICTED* (Warning Type 6)\nCard redirected to *@${luckyUser.split('@')[0]}*`,
                            undefined,
                            undefined,
                            undefined,
                            [luckyUser]
                        )
                    } else {
                        await M.reply('🚫 *CLAIM RESTRICTED:* No available members to receive the card.')
                    }
                    cardReward = null
                } else {
                    const wentToDeck = await addCardToDeck(M.sender.id, cardReward)
                    if (!wentToDeck) await addCardToCollection(M.sender.id, cardReward)
                }
            }

            await Promise.all(dbWrites)

            // ── 10. SUPPORT GROUP USAGE COUNTER ───────────────────────────

            // ── 11. RESPONSE ──────────────────────────────────────────────
            let response = inSupport
                ? `✨ *Lootbox Opened* ✨\n\n`
                : `✨ *Lootbox Opened (${newCount}/${MAX_TRIES}) — Daily: ${newDailyCount}/${DAILY_LIMIT}* ✨\n\n`

            if (totalCredits > 0) response += `💰 *Credits:* +₹${totalCredits.toLocaleString()}\n`
            if (totalExp > 0) response += `⚡ *XP:* +${totalExp}\n`

            rewardItems.forEach((item) => {
                if (item.type === 'REDEEMCODE') {
                    response += `🎟️ *Voucher:* ${item.name}\n`
                } else {
                    const label = item.name.replace('potion', ' Potion').toUpperCase()
                    response += `🎁 *Item:* ${label}${item.duration ? ` (${item.duration}d)` : ''}\n`
                }
            })

            if (cardReward) response += `\n⭐ *JACKPOT:* A Mystery Card was added to your inventory!\n`

            if (!inSupport && newCount >= MAX_TRIES) {
                const streakStart = (await findUser(M.sender.id, 'lbResetTime'))?.lbResetTime
                const streakDuration = streakStart ? now - new Date(streakStart).getTime() : Infinity
                response +=
                    streakDuration < SPAM_WINDOW_MS
                        ? `\n🛑 *Spam detected!* 10-hour cooldown is now active.`
                        : `\n🛑 *Session complete!* 5-hour cooldown started.`
            }

            return M.reply(response.trim())
        } catch (err) {
            console.error('[LOOTBOX_ERROR]', err)
            return M.reply('⚠️ *System Error* The lootbox mechanism jammed. Please try again.')
        }
    }
)
