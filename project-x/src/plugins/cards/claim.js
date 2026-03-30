// src/plugins/cards/claim.js

import { plugin } from '../../utils/plugin.js'
import {
    findUser,
    addCardToDeck,
    addCardToCollection,
    removeFromWallet,
    addToWallet,
    hasCodeInInventory,
    getRedeemCodeInfo,
    removeCode,
    isPotionValid,
    saveState,
    getState,
    isRegUser,
    claimCardState,
    hasWarnType,
    incrementChallengeProgress,
    calculateGroupTax,
    addGroupFunds
} from '../../database/db.js'
import { getRandomInt } from '../../functions/helpler.js'

plugin(
    {
        name: 'claim',
        aliases: ['claimcard', 'buycard'],
        category: 'cards',
        isGroup: true,
        description: {
            content: 'Solve the math puzzle and claim the spawned card.',
            usage: '<answer> [--discount=CODE]',
            example: 'claim 39'
        }
    },
    async (client, M, { args, flags }) => {
        try {
            const peekedCard = await getState(`${M.from}:card`)

            if (!peekedCard) {
                return M.reply('❌ There is no card to claim right now, it may have just been claimed by someone else!')
            }

            if (peekedCard.forced) {
                return M.reply('❌ You cannot claim a forced spawn card!')
            }

            if (peekedCard.puzzle) {
                const userAnswerRaw = args[0]
                const correctAnswer = peekedCard.puzzle.answer

                if (!userAnswerRaw) {
                    return M.reply(
                        `🧮 *Math Puzzle Required!*\n\n` +
                            `❓ *${peekedCard.puzzle.question}*\n\n` +
                            `Solve it and use:\n` +
                            `*${global.config.prefix}claim <answer>*\n\n` +
                            `_Example: ${global.config.prefix}claim 09_`
                    )
                }

                const userAnswer = parseInt(userAnswerRaw.trim(), 10)

                // Not a number
                if (isNaN(userAnswer)) {
                    return M.reply(
                        `❌ *"${userAnswerRaw}"* is not a valid number.\n\n` +
                            `The puzzle is: *${peekedCard.puzzle.question}*\n` +
                            `Usage: *${global.config.prefix}claim <number>*`
                    )
                }

                if (userAnswer !== correctAnswer) {
                    return M.reply(
                        `❌ *Wrong answer!*\n\n` +
                            `🧮 *${peekedCard.puzzle.question}*\n\n` +
                            `*${userAnswer}* is incorrect. Try again!\n` +
                            `_Hint: The answer is a whole number._`
                    )
                }
            }

            const card = await claimCardState(M.from)

            if (!card) {
                return M.reply('❌ The card was just claimed by someone else better luck next time!')
            }

            const user = await findUser(M.sender.id, 'cards.deck wallet')

            let basePrice = card.price
            let usedDiscount = null

            if ('discount' in flags) {
                const code = flags.discount.trim()
                const codeInfo = await getRedeemCodeInfo(code)
                const owns = await hasCodeInInventory(M.sender.id, code)

                if (!codeInfo || !owns || codeInfo.type !== 'DISCOUNT') {
                    return M.reply('❌ Invalid or unowned discount code.')
                }

                if (basePrice < codeInfo.minPurchase) {
                    return M.reply(
                        `❌ Minimum purchase of ₹${codeInfo.minPurchase.toLocaleString()} required for this code.`
                    )
                }

                const discountAmount = Math.floor((basePrice * codeInfo.discountPercent) / 100)
                basePrice -= discountAmount
                usedDiscount = code
                await M.reply(
                    `🎟️ *Discount Applied:* -₹${discountAmount.toLocaleString()} (${codeInfo.discountPercent}%)`
                )
            }

            /* ---------- TAX ---------- */
            const { tax, net } = await calculateGroupTax(M.sender.id, M.from, basePrice)
            const finalPrice = net + tax

            if (user.wallet - finalPrice < 0) {
                await saveState(`${M.from}:card`, card, 5 * 60 * 1000)
                return M.reply(
                    `❌ *Insufficient Balance!*\n\n` +
                        `💰 Price: ₹${basePrice.toLocaleString()}\n` +
                        `🏛️ Tax: ₹${tax.toLocaleString()}\n` +
                        `💸 Total: *₹${finalPrice.toLocaleString()}*\n` +
                        `👛 Wallet: ₹${user.wallet.toLocaleString()}\n\n` +
                        `_The card has been put back for 5 minutes. Solve the puzzle again to try._`
                )
            }

            /* ---------- TRANSACTIONS ---------- */
            await removeFromWallet(M.sender.id, finalPrice)

            if (tax > 0) {
                await addGroupFunds(M.from, tax)
            }

            if (usedDiscount) {
                await removeCode(M.sender.id, usedDiscount)
            }

            // Lucky Potion cashback
            let cashback = 0
            const hasLuck = await isPotionValid(M.sender.id, 'luckpotion')
            if (hasLuck) {
                const roll = getRandomInt(1, 100)
                if (roll <= 5) {
                    cashback = basePrice
                } else if (roll <= 30) {
                    const percent = getRandomInt(10, 40)
                    cashback = Math.floor((basePrice * percent) / 100)
                }
                if (cashback > 0) {
                    await addToWallet(M.sender.id, cashback)
                }
            }

            /* ---------- CARD DISTRIBUTION ---------- */
            let storedIn

            const isRestricted = await hasWarnType(M.sender.id, M.from, 6)

            if (isRestricted) {
                const participants = M.groupMetadata.participants.map((p) => p.id)
                const shuffled = participants.sort(() => 0.5 - Math.random())
                let luckyUser = null

                for (const participant of shuffled) {
                    if (participant !== M.sender.id && (await isRegUser(participant))) {
                        luckyUser = participant
                        break
                    }
                }

                if (luckyUser) {
                    const wentToDeck = await addCardToDeck(luckyUser, card)
                    if (!wentToDeck) {
                        await addCardToCollection(luckyUser, card)
                    }

                    return M.reply(
                        `🚫 *CLAIM RESTRICTED*\n\n` +
                            `Because of your Warning Type 6, your claim was blocked.\n` +
                            `🎁 The card has been redirected to: *@${luckyUser.split('@')[0]}*`,
                        undefined,
                        undefined,
                        undefined,
                        [luckyUser]
                    )
                } else {
                    return M.reply(
                        '🚫 *CLAIM RESTRICTED:* No other registered members were available to receive the card.'
                    )
                }
            }

            const wentToDeck = await addCardToDeck(M.sender.id, card)
            if (wentToDeck) {
                storedIn = 'Deck 📦'
            } else {
                await addCardToCollection(M.sender.id, card)
                storedIn = 'Collection 🗂'
            }

            incrementChallengeProgress(M.sender.id, 'collect_cards', 1, card.tier)
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

            /* ---------- RESPONSE ---------- */
            let msg =
                `🃏 *CARD PURCHASED SUCCESSFULLY!*\n\n` +
                (card.puzzle ? `🧮 *Answer:* ${card.puzzle.answer} ✔️\n\n` : '') +
                `💠 *Title:* ${card.title}\n` +
                `👑 *Tier:* ${card.tier}\n` +
                `💰 *Base Price:* ₹${basePrice.toLocaleString()}\n` +
                (tax > 0 ? `🏛️ *Group Tax:* ₹${tax.toLocaleString()}\n` : '') +
                `💸 *Total Paid:* ₹${finalPrice.toLocaleString()}\n` +
                `📦 *Stored In:* ${storedIn}\n`

            if (cashback > 0) {
                msg += `🍀 *Luck Potion:* ₹${cashback.toLocaleString()} cashback!\n`
            }

            msg += `\nUse *${global.config.prefix}cards* to view your inventory.`

            return M.reply(msg.trim())
        } catch (err) {
            console.error('[BUYCARD ERROR]', err)
            return M.reply('❌ A database error occurred while claiming the card.')
        }
    }
)
