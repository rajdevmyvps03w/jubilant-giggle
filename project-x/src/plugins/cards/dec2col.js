import { plugin } from '../../utils/plugin.js'
import { getState, moveDeckToCollection } from '../../database/db.js'
import { extractNumbers } from '../../functions/helpler.js'

plugin(
    {
        name: 'deck2col',
        category: 'cards',
        aliases: ['t2coll', 'd2c'],
        isGroup: true,
        description: {
            content: 'Move a card from your deck to your collection to free up space.',
            usage: '<deck_index>',
            example: '3'
        }
    },
    async (_, M, { text }) => {
        try {
            /* ---------- INPUT PARSING ---------- */
            const [num] = extractNumbers(text)

            if (!num || num < 1 || num > 12) {
                return M.reply('❌ Invalid index! The index should be between 1 - 12 (your deck).')
            }

            const index = num - 1

            /* ---------- TRANSACTION LOCKS ---------- */
            const activeExchange = await getState(`exchange:${M.sender.id}`)
            const activeAuction = await getState(`auc:seller:${M.sender.id}`)

            if (activeExchange || activeAuction) {
                return M.reply('❌ Security Lock: Cannot move cards during active trades or auctions.')
            }

            const result = await moveDeckToCollection(M.sender.id, index)

            if (!result) {
                // null means index is stale (concurrent move shifted the deck)
                // or the user wasn't found
                return M.reply(
                    `❌ No card found at deck index ${num}, the deck may have shifted.\n` +
                        `Use *${global.config.prefix}deck* to check your current lineup.`
                )
            }

            return M.reply(
                `📦 *CARD MOVED TO COLLECTION*\n\n` +
                    `🃏 *Title:* ${result.card.title}\n` +
                    `👑 *Tier:* ${result.card.tier}\n` +
                    `📤 *Deck Space:* ${result.newDeckSize}/12`
            )
        } catch (err) {
            console.error('[DECK2COL ERROR]', err)
            return M.reply('❌ An error occurred while moving the card.')
        }
    }
)
