import { getBuffer, fetch } from '../../functions/helpler.js'
import { plugin } from '../../utils/plugin.js'

plugin(
    {
        name: 'waifu',
        category: 'weeb',
        description: {
            content: 'Send a random waifu anime image.'
        }
    },
    async (_, M) => {
        try {
            const data = await fetch('https://api.waifu.im/images?IncludedTags=waifu')

            const url = data?.items?.[0]?.url
            if (!url) {
                return M.reply('❌ Failed to fetch a waifu image.')
            }

            let buffer = null
            try {
                buffer = await getBuffer(url)
            } catch {}

            if (!buffer) {
                return M.reply('❌ Could not download the waifu image.')
            }

            return M.reply(buffer, 'image')
        } catch (err) {
            console.error('[WAIFU]', err)
            return M.reply('❌ Failed to get a waifu image.')
        }
    }
)
