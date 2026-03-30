import { plugin } from '../../utils/plugin.js'
import { getState, moveCollectionToDeck } from '../../database/db.js'
import { extractNumbers } from '../../functions/helpler.js'

plugin(
    {
        name: 'col2deck',
        aliases: ['t2deck', 'c2d'],
        category: 'cards',
        isGroup: true,
        description: {
            content: 'Move a card from your collection to your deck (max 12 cards).',
            usage: '<collection_index>',
            example: '2'
        }
    },
    async (_, M, { text }) => {
        try {
            /* ---------- INPUT PARSING ---------- */
            const [num] = extractNumbers(text)
            const index = num - 1

            if (!num || isNaN(index) || index < 0) {
                return M.reply('❌ Invalid format! Please provide a valid collection index.')
            }

            /* ---------- TRANSACTION LOCKS ---------- */
            const activeExchange = await getState(`exchange:${M.sender.id}`)
            const activeAuction = await getState(`auc:seller:${M.sender.id}`)

            if (activeExchange || activeAuction) {
                return M.reply('❌ Security Lock: Action blocked during active trades or auctions.')
            }

            const result = await moveCollectionToDeck(M.sender.id, index)

            if (!result) {
                return M.reply(
                    `❌ Could not move card, your deck may be full (12/12) or the index has changed.\n` +
                        `Use *${global.config.prefix}collection* to check your current list.`
                )
            }

            return M.reply(
                `✅ *CARD MOVED TO DECK!*\n\n` +
                    `🃏 *Title:* ${result.card.title}\n` +
                    `👑 *Tier:* ${result.card.tier}\n` +
                    `📦 *Deck Space:* ${result.newDeckSize}/12`
            )
        } catch (err) {
            console.error('[COL2DECK ERROR]', err)
            return M.reply('❌ An error occurred while processing the card move.')
        }
    }
)
