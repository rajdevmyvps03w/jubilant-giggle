import { plugin } from '../../utils/plugin.js'
import { loadMarket } from '../../database/db.js'

plugin(
    {
        name: 'market',
        aliases: ['stocks'],
        category: 'stocks',
        description: {
            content: 'View live global stock prices.'
        }
    },
    async (_, M) => {
        try {
            const market = await loadMarket()

            let text = '📈 Live Global Market\n\n'
            for (const a of market.assets) {
                text += `• ${a.id} | Price: ${a.price}\n`
            }

            return M.reply(text)
        } catch (err) {
            console.error('[MARKET]', err)
            return M.reply('❌ Failed to fetch market.')
        }
    }
)
