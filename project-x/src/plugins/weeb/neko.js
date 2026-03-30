import { getBuffer, fetch } from '../../functions/helpler.js'
import { plugin } from '../../utils/plugin.js'

plugin(
    {
        name: 'neko',
        category: 'weeb',
        description: {
            content: 'Send a random neko anime image.'
        }
    },
    async (_, M) => {
        try {
            const data = await fetch('https://api.waifu.pics/sfw/neko')

            if (!data?.url) {
                return M.reply('❌ Failed to fetch a neko image.')
            }

            let buffer = null
            try {
                buffer = await getBuffer(data.url)
            } catch {}

            if (!buffer) {
                return M.reply('❌ Could not download the neko image.')
            }

            return M.reply(buffer, 'image')
        } catch (err) {
            console.error('[NEKO]', err)
            return M.reply('❌ Failed to get a neko image.')
        }
    }
)
