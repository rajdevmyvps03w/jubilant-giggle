// src/plugins/economy/gamble.js

import { plugin } from '../../utils/plugin.js'
import {
    findUser,
    addToWallet,
    removeFromWallet,
    isPotionValid,
    isSupportGroup,
    calculateGroupTax,
    addGroupFunds,
    hasWarnType,
    getGroupLuckBonus,
    claimGambleUse,
    incrementChallengeProgress
} from '../../database/db.js'

import { Sticker, StickerTypes } from 'wa-sticker-formatter'
import { getRandomInt, getBuffer } from '../../functions/helpler.js'

const DAILY_LIMIT = 30
const TILT_FLOOR = 10 // win chance never goes below 10%

plugin(
    {
        name: 'gamble',
        aliases: ['bet', 'g'],
        category: 'economy',
        isGroup: true,
        description: {
            usage: '<down/up> <amount>',
            content: `Bet your money on down or up. Max ${DAILY_LIMIT} bets per day, resets at midnight.`,
            example: 'up 10000'
        }
    },
    async (client, M, { args }) => {
        try {
            /* ---------- INPUT PARSING ---------- */
            if (args.length < 2) {
                return M.reply(
                    `❌ You have not provided any valid input. Usage *${global.config.prefix}gamble down/up <amount>*`
                )
            }

            let direction, amount
            const arg0 = args[0]?.toLowerCase()
            const arg1 = args[1]?.toLowerCase()

            if (['down', 'up'].includes(arg0)) {
                direction = arg0
                amount = parseInt(args[1])
            } else if (['down', 'up'].includes(arg1)) {
                direction = arg1
                amount = parseInt(args[0])
            }

            if (!direction || isNaN(amount)) {
                return M.reply(
                    `❌ You have not provided any valid input. Usage *${global.config.prefix}gamble down/up <amount>*`
                )
            }

            if (amount < 100) {
                return M.reply('⚠️ Minimum gamble amount is ₹100.')
            }
            if (amount > 15000) {
                return M.reply('⚠️ Maximum gamble amount is ₹15,000.')
            }

            const user = await findUser(M.sender.id, 'wallet')
            if (user.wallet - amount < 0) {
                return M.reply(`💸 Insufficient balance. Wallet: ₹${user.wallet.toLocaleString()}`)
            }

            const inSupport = isSupportGroup(M.from)

            const gambleResult = await claimGambleUse(M.sender.id, Infinity)
            const usedToday = gambleResult?.gambleDailyCount ?? 1
            const overLimit = usedToday > DAILY_LIMIT

            let footer = ''
            if (inSupport) {
                footer = `\n\n🌐 _Support group, no daily limit_`
            } else {
                const remaining = Math.max(0, DAILY_LIMIT - usedToday)
                footer =
                    `\n\n📊 *Bets today:* ${Math.min(usedToday, DAILY_LIMIT)}/${DAILY_LIMIT}` +
                    (overLimit ? ` _(+${usedToday - DAILY_LIMIT} extra, reduced odds)_` : ` — ${remaining} remaining`)
            }

            let winChance = getRandomInt(10, 45)
            let randomAmount = 0

            if (overLimit) {
                const extraBets = usedToday - DAILY_LIMIT

                const base = 23 // midpoint of normal range (20–55)
                const reductionRate = inSupport ? 1.5 : 7
                winChance = Math.max(TILT_FLOOR, Math.floor(base - extraBets * reductionRate))
            } else {
                const [hasLuckyPotion, hasMoneyPotion] = await Promise.all([
                    isPotionValid(M.sender.id, 'luckpotion'),
                    isPotionValid(M.sender.id, 'moneypotion')
                ])

                if (hasLuckyPotion) {
                    winChance = getRandomInt(10, 60)
                }
                if (hasMoneyPotion) {
                    randomAmount = getRandomInt(100, amount)
                }

                if (M.chat === 'group') {
                    const luckBonus = await getGroupLuckBonus(M.sender.id, M.from)
                    winChance += Math.floor(luckBonus * 35)
                }

                if (winChance > 90) {
                    winChance = 90
                } // hard cap
            }

            const roll = getRandomInt(1, 100)
            const win = roll <= winChance

            let message = ''

            if (win) {
                let reward = amount + randomAmount

                if (!overLimit) {
                    const jackpot = getRandomInt(1, 500) === getRandomInt(1, 250)
                    if (jackpot) {
                        reward *= 100
                    }
                }

                let tax = 0
                if (M.chat === 'group') {
                    const taxData = await calculateGroupTax(M.sender.id, M.from, amount)
                    tax = taxData.tax
                    reward -= tax
                    if (tax > 0) {
                        await addGroupFunds(M.from, tax)
                    }
                }

                const isRestricted5 = await hasWarnType(M.sender.id, M.from, 5)
                if (M.chat === 'group' && isRestricted5) {
                    const penaltyPercent = getRandomInt(50, 90)
                    const deduction = Math.floor(reward * (penaltyPercent / 100))
                    reward -= deduction
                    await addGroupFunds(M.from, deduction)
                    await M.reply(
                        `📉 *PENALTY NOTICE (Type 5)*\n` +
                            `Earnings reduced by *${penaltyPercent}%*. ₹${deduction} to Group Funds.`
                    )
                }

                await addToWallet(M.sender.id, reward)

                message =
                    `${!overLimit && reward >= amount * 100 ? '🍀 *JACKPOT!*' : '🎉 *YOU WON!*'}\n\n` +
                    `💰 Base Win: ₹${amount.toLocaleString()}\n` +
                    (randomAmount > 0 ? `➕ Potion Bonus: ₹${randomAmount.toLocaleString()}\n` : '') +
                    (tax > 0 ? `🏛️ Group Tax: -₹${tax.toLocaleString()}\n` : '') +
                    `✅ Final Gain: ₹${reward.toLocaleString()}\n\n` +
                    `🎯 Win Chance: ${winChance}% (${direction.toUpperCase()})`
            } else {
                await removeFromWallet(M.sender.id, amount)
                message = `📉 *You Lost!* ₹${amount.toLocaleString()} deducted.\nBetter luck next time! 💸`
            }

            incrementChallengeProgress(M.sender.id, 'gambleUses', 1)
                .then((chalResult) => {
                    if (chalResult?.completed) {
                        client
                            .sendMessage(M.sender.id, {
                                text:
                                    `🎯 *Challenge Complete!*\n\n` +
                                    `You've finished the *Gambler's Run* challenge!\n` +
                                    `Use *${global.config.prefix}claimchallenge* to collect your card reward!`
                            })
                            .catch(() => {})
                    }
                })
                .catch(() => {})

            const up =
                'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Telegram-Animated-Emojis/main/Objects/Chart%20Increasing.webp'
            const down =
                'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Telegram-Animated-Emojis/main/Objects/Chart%20Decreasing.webp'
            const url = win ? (direction === 'up' ? up : down) : direction === 'up' ? down : up

            try {
                const buffer = await getBuffer(url)
                const sticker = new Sticker(buffer, {
                    pack: '👾 Handcrafted for you by',
                    author: 'Project-X 👾',
                    type: StickerTypes.FULL,
                    categories: ['🤩', '🎉'],
                    quality: 70
                })
                await M.replyRaw({ sticker: await sticker.build() })
            } catch {}

            return M.reply((message + footer).trim())
        } catch (err) {
            console.error('[GAMBLE ERROR]', err)
            return M.reply('❌ An error occurred while processing your bet.')
        }
    }
)
