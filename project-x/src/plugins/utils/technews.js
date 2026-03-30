import { plugin } from '../../utils/plugin.js'
import { fetch } from '../../functions/helpler.js'

plugin(
    {
        name: 'technews',
        aliases: ['news', 'tn'],
        category: 'utils',
        description: {
            content: 'Fetch the latest technology news headlines.'
        }
    },
    async (_, M) => {
        try {
            const data = await fetch('https://pvx-api-vercel.vercel.app/api/news')

            if (!data?.inshorts || !Array.isArray(data.inshorts) || data.inshorts.length === 0) {
                return M.reply('❌ Unable to fetch news at the moment. Please try again later.')
            }
            let msg = '💥 *LATEST TECH NEWS* 💥\n'

            data.inshorts.slice(0, 10).forEach((news, i) => {
                msg += `\n\n*${i + 1}.* ${news}`
            })

            return M.reply(msg.trim())
        } catch (err) {
            console.error('[TECHNEWS]', err)

            return M.reply('❌ Failed to retrieve technology news.\nPlease try again later.')
        }
    }
)
