// src/plugins/economy/daily.js  — FULL PATCHED VERSION

import { plugin } from '../../utils/plugin.js'
import {
    findUser,
    editUser,
    addToWallet,
    generateSecureCode,
    addItemToInventory,
    hasWarnType,
    addGroupFunds,
    updateDailyStreak,
    incrementChallengeProgress
} from '../../database/db.js'
import { getRandomInt, getRandomFloat } from '../../functions/helpler.js'

plugin(
    {
        name: 'daily',
        aliases: ['claimdaily', 'dailyreward'],
        category: 'economy',
        isGroup: true,
        description: {
            content: 'Claim your daily reward once every 24 hours.'
        }
    },
    async (_, M) => {
        try {
            const user = await findUser(M.sender.id, 'daily wallet inventory')
            const now = new Date()
            const lastClaim = user.daily ? new Date(user.daily) : null
            const baseCooldown = 24 * 60 * 60 * 1000
            const penaltyCooldown = 48 * 60 * 60 * 1000
            const isRestricted2 = await hasWarnType(M.sender.id, M.from, 2)
            const currentCooldown = isRestricted2 ? penaltyCooldown : baseCooldown
            const formatter = new Intl.DateTimeFormat('en-GB', {
                dateStyle: 'full',
                timeStyle: 'short'
            })

            if (lastClaim && now - lastClaim < currentCooldown) {
                const nextClaim = new Date(lastClaim.getTime() + currentCooldown)
                const penaltyNote = isRestricted2
                    ? `\n\n⚠️ *PENALTY ACTIVE:* Your daily cooldown is increased to *48 hours* due to Warning Type 2.`
                    : ''
                return M.reply(
                    `⏳ *Cooldown Active!*\n\nYou've already claimed your daily reward.\n` +
                        `Next claim available at: *${formatter.format(nextClaim)}*${penaltyNote}`
                )
            }

            /* ---------- LUCK LOGIC ---------- */
            const hasLuckyPotion = user.inventory?.some((i) => i.name === 'luckpotion' && i.type === 'POTION')
            const baseChance = getRandomFloat(0, 1)
            const finalChance = hasLuckyPotion ? Math.min(baseChance + 0.2, 1) : baseChance

            let message = `🎁 *Daily Reward Claimed!* 🎁\n\n`

            /* ---------- REWARD GENERATION ---------- */
            if (finalChance > 0.7) {
                const isDiscount = getRandomFloat(0, 1) < 0.5
                const rewardCategory = isDiscount ? 'DISCOUNT' : 'REDEEMCODE'
                const discount = hasLuckyPotion ? 40 : getRandomInt(10, 30)
                const minPurchase = hasLuckyPotion ? 0 : getRandomInt(0, 100000)
                const rewardType = ['LOOTBOX', 'POTION', 'ANIME_CARD'][getRandomInt(0, 2)]

                const code = await generateSecureCode({
                    type: rewardCategory,
                    discountPercent: isDiscount ? discount : undefined,
                    minPurchase: isDiscount ? minPurchase : undefined,
                    reward: isDiscount ? undefined : rewardType,
                    createdAt: now
                })

                const newItem = {
                    type: 'REDEEMCODE',
                    usage: 'ONETIME',
                    name: code,
                    purchasedAt: now.toISOString()
                }
                await addItemToInventory(M.sender.id, newItem)

                if (isDiscount) {
                    message += `🎟️ You received a *${discount}% Discount Code!*\n🔖 Code: *${code}*\n💰 Min Purchase: ₹${minPurchase.toLocaleString()}`
                } else {
                    message += `🎟️ You received a special *${rewardType.toUpperCase()} Redeem Code!*\n🔖 Code: *${code}*`
                }
            } else {
                const baseReward = getRandomInt(5000, 15000)
                const expBonus = Math.floor((user.exp || 0) / 200)
                const bonusMultiplier = hasLuckyPotion ? 1.5 : 1
                let totalReward = Math.floor((baseReward + expBonus) * bonusMultiplier)

                const isRestricted5 = await hasWarnType(M.sender.id, M.from, 5)
                if (M.chat === 'group' && isRestricted5) {
                    const penaltyPercent = Math.floor(Math.random() * (90 - 50 + 1)) + 50
                    const deduction = Math.floor(totalReward * (penaltyPercent / 100))
                    totalReward -= deduction
                    await addGroupFunds(M.from, deduction)
                    await M.reply(
                        `📉 *PENALTY NOTICE (Type 5)*\n\n` +
                            `Your earnings were reduced by *${penaltyPercent}%* due to your warning status.\n` +
                            `💰 *$${deduction}* has been transferred to the **Group Funds**.`
                    )
                }

                await addToWallet(M.sender.id, totalReward)
                message += `💸 You received *₹${totalReward.toLocaleString()}* credits in your wallet.`
                if (hasLuckyPotion) message += `\n🍀 *Lucky Potion Bonus applied!*`
            }

            /* ---------- UPDATE CLAIM TIMESTAMP ---------- */
            await editUser(M.sender.id, { daily: now })

            /* ---------- CHALLENGE: daily streak ---------- */
            // Update streak and increment challenge progress — both fire independently
            // so a DB failure in one does not block the other or the daily claim.
            const [newStreak, challengeResult] = await Promise.allSettled([
                updateDailyStreak(M.sender.id),
                incrementChallengeProgress(M.sender.id, 'dailyStreak', 1)
            ])

            const streak = newStreak.status === 'fulfilled' ? newStreak.value : 1

            if (streak > 1) {
                message += `\n\n🔥 *Daily Streak: ${streak} days in a row!*`
            }

            // Notify if challenge just completed
            if (challengeResult.status === 'fulfilled' && challengeResult.value?.completed) {
                message += `\n\n🎯 *Challenge Complete!*\nYour daily streak challenge is done!\nUse *${global.config.prefix}claimchallenge* to collect your card reward!`
            }

            return M.reply(message.trim())
        } catch (err) {
            console.error('[DAILY REWARD ERROR]', err)
            return M.reply('❌ An error occurred while claiming your daily reward.')
        }
    }
)
