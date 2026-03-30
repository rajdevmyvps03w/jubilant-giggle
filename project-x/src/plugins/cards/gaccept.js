import { plugin } from '../../utils/plugin.js'
import {
    findUser,
    getState,
    deleteState,
    addCardToDeck,
    addCardToCollection,
    removeCardFromDeck
} from '../../database/db.js'

plugin(
    {
        name: 'acceptgift',
        aliases: ['agift'],
        category: 'cards',
        description: {
            content: 'Accept a gifted card with strict deck position validation.',
            usage: '<gift_id>',
            example: 'GIFT123'
        }
    },
    async (client, M, { args }) => {
        try {
            const giftId = args?.[0]?.toUpperCase()
            if (!giftId) {
                return M.reply('❌ Please provide the Gift ID.')
            }

            /* ---------- FETCH GIFT STATE ---------- */
            const gift = await getState(`gift:${giftId}`)
            if (!gift) {
                return M.reply('❌ Gift request not found or has expired.')
            }

            if (gift.to !== M.sender.id) {
                return M.reply('❌ This gift was not sent to you.')
            }

            /* ---------- FETCH SENDER & DECK CHECK ---------- */
            const sender = await findUser(gift.from)

            // Target ONLY the deck for verification
            const deck = sender.cards?.deck || []
            const cardAtPos = deck[gift.cardIdx]

            // VALIDATION: Must be the same card at the same deck position
            if (!cardAtPos || cardAtPos.id !== gift.cardId) {
                // Release the sender's deck lock before returning
                await Promise.all([deleteState(`gift:${giftId}`), deleteState(`exchange:${gift.from}`)])
                return M.reply(
                    '❌ *Gift Invalid:* The sender has moved the card or it is no longer in the original deck position.'
                )
            }

            /* ---------- PROCESS REMOVAL FROM SENDER ---------- */
            // Using your specific function to remove only from deck
            const removedCard = await removeCardFromDeck(sender.jid, gift.cardIdx)

            if (!removedCard) {
                return M.reply('❌ Failed to extract the card from the sender.')
            }

            /* ---------- PROCESS ADDITION TO RECEIVER ---------- */
            const receiver = await findUser(M.sender.id)
            let storedIn = ''

            // Standard logic: fill deck first, then collection
            const wentToDeck = await addCardToDeck(M.sender.id, removedCard)
            storedIn = 'Deck 📦'
            if (!wentToDeck) {
                await addCardToCollection(M.sender.id, removedCard)
                storedIn = 'Collection 🗂'
            }

            /* ---------- CLEANUP & NOTIFY ---------- */
            // Release the sender's deck lock along with the gift state
            await Promise.all([deleteState(`gift:${giftId}`), deleteState(`exchange:${gift.from}`)])

            // Notify Sender
            await client
                .sendMessage(sender.jid, {
                    text: `🎉 Your gift *${removedCard.title}* (${removedCard.tier}) was accepted by ${receiver.name}.`
                })
                .catch(() => {})

            return M.reply(
                `🎁 *GIFT ACCEPTED!*\n\n` +
                    `👤 *From:* ${sender.name}\n` +
                    `🃏 *Card:* ${removedCard.title}\n` +
                    `👑 *Tier:* ${removedCard.tier}\n` +
                    `📥 *Stored in:* ${storedIn}`
            )
        } catch (err) {
            console.error('[ACCEPTGIFT ERROR]', err)
            return M.reply('❌ An error occurred while accepting the gift.')
        }
    }
)
