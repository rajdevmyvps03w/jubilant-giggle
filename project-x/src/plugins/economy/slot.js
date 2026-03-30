import { plugin } from '../../utils/plugin.js'
import {
    findUser,
    isPotionValid,
    addToWallet,
    removeFromWallet,
    calculateGroupTax,
    isSupportGroup,
    hasWarnType,
    addGroupFunds,
    getGroupLuckBonus,
    claimSlotUse,
    incrementChallengeProgress
} from '../../database/db.js'
import { spinSlotMachine } from '../../functions/slotmac.js'
import { getRandomInt } from '../../functions/helpler.js'

const DAILY_LIMIT = 30
const TILT_FLOOR = 10 // win chance never goes below 10%

plugin(
    {
        name: 'slot',
        aliases: ['casino'],
        category: 'economy',
        isGroup: true,
        description: {
            content: 'Play the slot machine.',
            usage: '<amount>',
            example: '20000'
        }
    },
    async (client, M, { args }) => {
        try {
            /* ---------- AMOUNT VALIDATION ---------- */
            const amount = parseInt(args[0])
            if (isNaN(amount) || amount < 10000) {
                return M.reply('❌ Invalid amount. You must bet at least ₹10,000 to play.')
            }
            if (amount > 150000) {
                return M.reply('⚠️ Maximum slot amount is ₹1,50,000.')
            }

            /* ---------- WALLET CHECK ---------- */
            const user = await findUser(M.sender.id, 'wallet slotDailyCount slotDailyReset')
            if (user.wallet - amount < 0) {
                return M.reply(
                    `💸 You need *₹${amount.toLocaleString()}* to play but your wallet only has *₹${(user.wallet || 0).toLocaleString()}*.`
                )
            }

            /* ---------- DAILY USAGE ---------- */
            const inSupport = isSupportGroup(M.from)

            const claimResult = await claimSlotUse(M.sender.id, Infinity)
            const usedToday = claimResult?.slotDailyCount ?? 1
            const overLimit = usedToday > DAILY_LIMIT

            let footer = ''
            if (!inSupport) {
                const remaining = Math.max(0, DAILY_LIMIT - usedToday)
                footer =
                    `\n📊 *Spins today:* ${Math.min(usedToday, DAILY_LIMIT)}/${DAILY_LIMIT}` +
                    (overLimit ? ` _(+${usedToday - DAILY_LIMIT} extra reduced odds)_` : ` — ${remaining} remaining`)
            }

            /* ---------- WIN CHANCE ---------- */
            let winChance
            let extraReward = 0

            if (overLimit) {
                const extraSpins = usedToday - DAILY_LIMIT
                const reductionRate = inSupport ? 1.5 : 7
                winChance = Math.max(TILT_FLOOR, Math.floor(30 - extraSpins * reductionRate))
            } else {
                winChance = getRandomInt(1, 30)

                const [hasLuckyPotion, hasMoneyPotion] = await Promise.all([
                    isPotionValid(M.sender.id, 'luckpotion'),
                    isPotionValid(M.sender.id, 'moneypotion')
                ])

                if (hasLuckyPotion) {
                    winChance = getRandomInt(1, 40)
                }
                if (hasMoneyPotion) {
                    extraReward = getRandomInt(100, amount)
                }

                if (M.chat === 'group') {
                    const luckBonus = await getGroupLuckBonus(M.sender.id, M.from)
                    winChance += Math.floor(winChance * luckBonus)
                }

                if (winChance > 90) {
                    winChance = 90
                }
            }

            /* ---------- SPIN ---------- */
            const spinResult = spinSlotMachine(winChance)
            const totalMatches = (spinResult.matches.rows || 0) + (spinResult.matches.columns || 0)
            const reward = totalMatches * amount

            let message = `🎰 *Slot Machine* 🎰\n\n${spinResult.slot}\n`

            if (totalMatches > 0) {
                let taxAmount = 0
                let finalReward = reward + extraReward

                if (M.chat === 'group') {
                    const taxData = await calculateGroupTax(M.sender.id, M.from, reward)
                    taxAmount = taxData.tax
                    finalReward = reward + extraReward - taxAmount
                    if (taxAmount > 0) {
                        await addGroupFunds(M.from, taxAmount)
                    }
                }

                const isRestricted5 = await hasWarnType(M.sender.id, M.from, 5)
                if (M.chat === 'group' && isRestricted5) {
                    const penaltyPercent = getRandomInt(50, 90)
                    const deduction = Math.floor(finalReward * (penaltyPercent / 100))
                    finalReward -= deduction
                    await addGroupFunds(M.from, deduction)
                    await M.reply(
                        `📉 *PENALTY NOTICE (Type 5)*\n` +
                            `Earnings reduced by *${penaltyPercent}%*. ₹${deduction} to Group Funds.`
                    )
                }

                await addToWallet(M.sender.id, finalReward)

                message +=
                    `🎉 *${totalMatches} match${totalMatches > 1 ? 'es' : ''}!*\n` +
                    `💰 Base Reward: ₹${reward.toLocaleString()}\n` +
                    (extraReward > 0 ? `➕ Potion Bonus: ₹${extraReward.toLocaleString()}\n` : '') +
                    (taxAmount > 0 ? `🏛️ Group Tax: -₹${taxAmount.toLocaleString()}\n` : '') +
                    `✅ Final Gain: *₹${finalReward.toLocaleString()}*`
            } else {
                await removeFromWallet(M.sender.id, amount)
                message += `😢 No matches!\n💸 *₹${amount.toLocaleString()}* deducted.`
            }

            /* ---------- CHALLENGE: slotUses ---------- */
            incrementChallengeProgress(M.sender.id, 'slotUses', 1)
                .then((chalResult) => {
                    if (chalResult?.completed) {
                        client
                            .sendMessage(M.sender.id, {
                                text:
                                    `🎯 *Challenge Complete!*\n\n` +
                                    `You've finished the *Slot Addict* challenge!\n` +
                                    `Use *${global.config.prefix}claimchallenge* to collect your card reward!`
                            })
                            .catch(() => {})
                    }
                })
                .catch(() => {})

            return M.reply((message + footer).trim())
        } catch (err) {
            console.error('[SLOT MACHINE ERROR]', err)
            return M.reply('❌ An error occurred while spinning the slots.')
        }
    }
)
