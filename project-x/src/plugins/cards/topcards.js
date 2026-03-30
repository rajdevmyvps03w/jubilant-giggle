import { plugin } from '../../utils/plugin.js'
import { findUser } from '../../database/db.js'

plugin(
    {
        name: 'topcards',
        aliases: ['mytop', 'expensivecards', 'mybest'],
        category: 'cards',
        description: {
            content: 'Displays your top 10 most valuable cards from both deck and collection.'
        }
    },
    async (_, M) => {
        try {
            // 1. Fetch user data from MongoDB
            const user = await findUser(M.sender.id)

            const deck = user.cards?.deck || []
            const collection = user.cards?.collection || []

            // 2. Combine all cards into one list
            const allCards = [...deck, ...collection]

            if (allCards.length === 0) {
                return M.reply("🃏 You don't own any cards yet!")
            }

            // 3. Map and calculate the "Active Price" (Higher of price vs basePrice)
            const valuedCards = allCards.map((card) => ({
                ...card,
                activePrice: Math.max(card.price || 0, card.basePrice || 0)
            }))

            // 4. Sort by price (Descending) and take top 10
            const top10 = valuedCards.sort((a, b) => b.activePrice - a.activePrice).slice(0, 10)

            // 5. Construct the response
            let message = `💎 *YOUR TOP ${top10.length} MOST EXPENSIVE CARDS* 💎\n`
            message += `👤 *User:* ${user.name}\n\n`

            top10.forEach((card, index) => {
                const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🔹'
                message += `${medal} *${card.title}*\n`
                message += `💰 Value: *₹${card.activePrice.toLocaleString()}*\n`
                message += `⭐ Tier: ${card.tier || 'Common'}\n`
                message += `📍 Source: ${card.source || 'Unknown'}\n\n`
            })

            message += `🗂️ Total Inventory: ${allCards.length} cards`

            return M.reply(message)
        } catch (err) {
            console.error('[TOPCARDS ERROR]', err)
            return M.reply('❌ An error occurred while fetching your top cards.')
        }
    }
)
