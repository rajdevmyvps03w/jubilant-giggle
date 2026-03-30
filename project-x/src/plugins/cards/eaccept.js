import { plugin } from '../../utils/plugin.js'
import {
    findUser,
    editUser,
    getState,
    deleteState,
    addCardToDeck,
    addCardToCollection,
    removeCardFromDeck
} from '../../database/db.js'

plugin(
    {
        name: 'eaccept',
        aliases: ['accepttrade', 'atrade'],
        category: 'cards',
        isGroup: true,
        description: {
            content: 'Accept a pending card exchange request (Deck Only).',
            usage: '<exchangeID>',
            example: 'ABC123'
        }
    },
    async (client, M, { args }) => {
        try {
            const exchangeId = args?.[0]?.toUpperCase()
            if (!exchangeId) {
                return M.reply('❌ Please provide the Exchange ID.')
            }

            /* ---------- FETCH STATE ---------- */
            const data = await getState(`exchange_info:${exchangeId}`)
            if (!data) {
                return M.reply('❌ Exchange request not found or expired.')
            }

            if (data.to !== M.sender.id) {
                return M.reply('❌ This trade request was sent to someone else.')
            }

            /* ---------- FETCH USERS ---------- */
            const userA = await findUser(data.from, 'name cards.deck') // Sender
            const userB = await findUser(data.to, 'name cards.deck') // You (Receiver)

            /* ---------- STRICT DECK POSITION VALIDATION ---------- */
            const deckA = userA.cards?.deck || []
            const deckB = userB.cards?.deck || []

            const cardA = deckA[data.fromIdx]
            const cardB = deckB[data.toIdx]

            // Check if the card at the EXACT deck index matches the ID saved in state
            const isAValid = cardA && cardA.id === data.fromCard.id
            const isBValid = cardB && cardB.id === data.toCard.id

            if (!isAValid || !isBValid) {
                await Promise.all([
                    deleteState(`exchange:${data.from}`),
                    deleteState(`exchange:${data.to}`),
                    deleteState(`exchange_info:${exchangeId}`)
                ])

                const reason = !isAValid ? "Sender's" : 'Your'
                return M.reply(
                    `❌ *Trade Invalid:* ${reason} card has been moved from its deck position. Trade cancelled.`
                )
            }

            /* ---------- PROCESS SWAP ---------- */
            // 1. Extract cards using the deck-specific helper
            const actualCardA = await removeCardFromDeck(data.from, data.fromIdx)
            const actualCardB = await removeCardFromDeck(data.to, data.toIdx)

            if (!actualCardA || !actualCardB) {
                return M.reply('❌ Failed to extract cards for the swap.')
            }

            // 2. Cross-deliver
            // FIX BUG3: deliverCard was receiving (jid_string, card) but checking
            // user.cards?.deck?.length — 'user' was a jid string so .cards was always
            // undefined, condition always true, always called addCardToDeck regardless
            // of deck size. When deck was full addCardToDeck returned false and no
            // fallback ran → card silently dropped.
            // Fix: let addCardToDeck's own atomic 12-card guard decide, fall back to collection.
            const deliverCard = async (jid, card) => {
                const wentToDeck = await addCardToDeck(jid, card)
                if (!wentToDeck) {
                    await addCardToCollection(jid, card)
                }
            }

            await deliverCard(data.from, actualCardB)
            await deliverCard(data.to, actualCardA)

            /* ---------- CLEANUP STATE ---------- */
            await Promise.all([
                deleteState(`exchange:${data.from}`),
                deleteState(`exchange:${data.to}`),
                deleteState(`exchange_info:${exchangeId}`)
            ])

            // Notify the Sender (User A)
            await client
                .sendMessage(data.from, {
                    text: `✅ *TRADE SUCCESSFUL*\n\nYou received: ${actualCardB.title}\nSent to: ${userB.name}`
                })
                .catch(() => {})

            return M.reply(
                `✅ *EXCHANGE SUCCESSFUL*\n\n` +
                    `🤝 *${userA.name}* ↔️ *${userB.name}*\n` +
                    `🔄 *Swapped:* ${actualCardA.title} for ${actualCardB.title}`
            )
        } catch (err) {
            console.error('[EACCEPT ERROR]', err)
            return M.reply('❌ An error occurred while completing the exchange.')
        }
    }
)
