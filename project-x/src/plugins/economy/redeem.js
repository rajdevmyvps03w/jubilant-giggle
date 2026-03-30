import { plugin } from '../../utils/plugin.js'
import {
    findUser,
    getRedeemCodeInfo,
    removeCode,
    removeCodeFromInventory,
    addCardToDeck,
    hasWarnType,
    isRegUser,
    addCardToCollection,
    addItemToInventory
} from '../../database/db.js' // Updated path
import { summonMazCard, summonShoobCard } from '../../handler/card.js'
import { getRandomInt, getRandomItem } from '../../functions/helpler.js'

plugin(
    {
        name: 'redeem',
        aliases: ['claimcode', 'usecode'],
        category: 'economy',
        isGroup: true,
        description: {
            usage: '<code>',
            content: 'Redeem a valid code to receive rewards.',
            example: '9AD81A8D'
        }
    },
    async (client, M, { args }) => {
        try {
            const code = args[0]?.trim()
            if (!code) {
                return M.reply(`❗ You must provide a redeem code.\nUsage: *${global.config.prefix}redeem <code>*`)
            }

            /* ---------- REGISTRATION CHECK ---------- */
            const user = await findUser(M.sender.id)

            /* ---------- CODE VALIDATION (ASYNC) ---------- */
            const codeInfo = await getRedeemCodeInfo(code)
            if (!codeInfo) {
                return M.reply('❌ Invalid or expired redeem code.')
            }

            const hasCode = user.inventory.some((i) => i.type === 'REDEEMCODE' && i.name === code)
            if (!hasCode) {
                return M.reply('⚠️ You do not own this redeem code or it has already been used.')
            }

            // Prevent direct redemption of Discount codes
            if (codeInfo.type === 'DISCOUNT') {
                return M.reply(
                    `⚠️ This is a *Discount Coupon*!\n🧾 *${codeInfo.discountPercent}%* off on purchases over *₹${(codeInfo.minPurchase || 0).toLocaleString()}*.\n💡 Use this code during your next *${global.config.prefix}buy*, not here.`
                )
            }

            let message = `🎉 *Redeem Successful!* 🎉\n\n`

            /* ---------- REWARD PROCESSING ---------- */
            switch (codeInfo.reward?.toUpperCase()) {
                case 'LOOTBOX': {
                    await addItemToInventory(M.sender.id, {
                        type: 'LOOTBOX',
                        usage: 'ONETIME',
                        name: 'Standard Lootbox',
                        purchasedAt: new Date().toISOString()
                    })
                    message += `🎁 You received a *Lootbox*!\nUse *${global.config.prefix}openlootbox* to open it.`
                    break
                }

                case 'ANIME_CARD': {
                    const random = getRandomInt(0, 1)
                    try {
                        let card
                        if (random === 0) {
                            card = await summonMazCard(null, M.from, client, true)
                        } else {
                            card = await summonShoobCard(null, M.from, client, true)
                        }

                        // 1. Check for Warning Type 6
                        const isRestricted = await hasWarnType(M.sender.id, M.from, 6)

                        if (isRestricted) {
                            // 2. Get all group participants from metadata
                            const participants = M.groupMetadata.participants.map((p) => p.id)

                            // 3. Filter for registered users only (excluding the sender)
                            // We shuffle the array to ensure randomness
                            const shuffled = participants.sort(() => 0.5 - Math.random())
                            let luckyUser = null

                            for (const participant of shuffled) {
                                if (participant !== M.sender.id && (await isRegUser(participant))) {
                                    luckyUser = participant
                                    break
                                }
                            }

                            if (luckyUser) {
                                const selected = await findUser(luckyUser, 'cards.deck')
                                const wentToDeck = await addCardToDeck(luckyUser, card)
                                if (!wentToDeck) {
                                    await addCardToCollection(luckyUser, card)
                                }

                                return M.reply(
                                    `🚫 *CLAIM RESTRICTED*\n\n` +
                                        `Because of your **Warning Type 6**, your claim was blocked.\n` +
                                        `🎁 The card has been redirected to a random registered member: *@${luckyUser.split('@')[0]}*`,
                                    undefined,
                                    undefined,
                                    undefined,
                                    [luckyUser]
                                )
                            } else {
                                return M.reply(
                                    '🚫 *CLAIM RESTRICTED:* You are barred from claiming cards. No other registered members were available to receive the gift.'
                                )
                            }
                        }

                        const freshUser = await findUser(M.sender.id)
                        let storedIn = ''

                        if ((freshUser.cards?.deck?.length || 0) < 12) {
                            await addCardToDeck(M.sender.id, card)
                            storedIn = 'Deck'
                        } else {
                            await addCardToCollection(M.sender.id, card)
                            storedIn = 'Collection'
                        }

                        message += `💠 A card has been added to your ${storedIn}!\n`
                    } catch (e) {
                        console.error('[CARD REDEEM ERROR]', e)
                        message += `❌ Failed to summon card, but the code was consumed. Contact admin.`
                    }
                    break
                }

                case 'POTION': {
                    const possiblePotions = ['moneypotion', 'exppotion', 'robprotection', 'luckpotion']
                    const chosenPotion = getRandomItem(possiblePotions)
                    await addItemToInventory(M.sender.id, {
                        usage: 'TIMEPERIOD',
                        name: chosenPotion,
                        type: 'POTION',
                        duration: 14, // 14 days
                        purchasedAt: new Date()
                    })
                    message += `🧪 *${chosenPotion.replace('potion', ' Potion')}* added for 14 days!`
                    break
                }

                default:
                    message += '🎟️ Code redeemed successfully, but no specific reward was found.'
                    break
            }

            await removeCodeFromInventory(M.sender.id, code)
            await removeCode(code)

            return M.reply(message.trim())
        } catch (err) {
            console.error('[REDEEM ERROR]', err)
            return M.reply('❌ An error occurred during the redemption process.')
        }
    }
)
