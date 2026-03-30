import { plugin } from '../../utils/plugin.js'
import { findUser, loadMarket } from '../../database/db.js'

plugin(
    {
        name: 'portfolio',
        aliases: ['pf'],
        category: 'stocks',
        description: {
            content: 'View your current stock holdings.'
        }
    },
    async (_, M) => {
        try {
            const user = await findUser(M.sender.id)

            const holdings = user.stocks ?? {}
            const market = await loadMarket()

            let text = '📊 *STOCK PORTFOLIO*\n\n'
            let total = 0

            for (const asset of market.assets) {
                const qty = holdings[asset.id] || 0
                if (qty > 0) {
                    const value = Math.floor(qty * asset.price)
                    total += value
                    text += `🔹 *${asset.id}*: ${qty} shares\n   |_ Value: ₹${value}\n\n`
                }
            }

            if (total === 0) text += 'You do not own any stocks yet.\n'

            return M.reply(text)
        } catch (err) {
            console.error('[PORTFOLIO]', err)
            return M.reply('❌ Failed to fetch portfolio.')
        }
    }
)
