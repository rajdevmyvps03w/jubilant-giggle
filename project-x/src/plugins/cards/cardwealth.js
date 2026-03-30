import { plugin } from '../../utils/plugin.js'
import { findUser } from '../../database/db.js'

plugin(
    {
        name: 'totalwealth',
        aliases: ['cardwealth', 'cw', 'networth'],
        category: 'cards',
        description: {
            content: 'Calculate total card wealth using the highest available price for each card.'
        }
    },
    async (_, M) => {
        try {
            const user = await findUser(M.sender.id, 'name cards')

            const deck = user.cards?.deck || []
            const collection = user.cards?.collection || []
            const allCards = [...deck, ...collection]

            if (allCards.length === 0) {
                return M.reply('🃏 Your inventory is empty! No wealth to calculate.')
            }

            let totalValue = 0
            let deckValue = 0
            let colValue = 0

            deck.forEach((card) => {
                const value = Math.max(card.price || 0, card.basePrice || 0)
                deckValue += value
            })

            collection.forEach((card) => {
                const value = Math.max(card.price || 0, card.basePrice || 0)
                colValue += value
            })

            totalValue = deckValue + colValue

            const response = [
                `💰 *CARD WEALTH ANALYSIS* 💰`,
                '',
                `👤 *User:* ${user.name}`,
                `📦 *Deck Value:* ₹${deckValue.toLocaleString()}`,
                `🗂️ *Collection Value:* ₹${colValue.toLocaleString()}`,
                `✨ *Total Net Worth:* *₹${totalValue.toLocaleString()}*`,
                '',
                `🎴 *Total Cards:* ${allCards.length}`,
                `💡 Note: Valuation uses the highest market or base price available per card.`
            ].join('\n')

            return M.reply(response)
        } catch (err) {
            console.error('[TOTALWEALTH ERROR]', err)
            return M.reply('❌ An error occurred while calculating your wealth.')
        }
    }
)
