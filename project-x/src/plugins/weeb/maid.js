import { getBuffer, fetch } from '../../functions/helpler.js'
import { plugin } from '../../utils/plugin.js'

plugin(
    {
        name: 'maid',
        category: 'weeb',
        description: {
            content: 'Send a random maid anime image.'
        }
    },
    async (_, M) => {
        try {
            const data = await fetch('https://api.waifu.im/images?IncludedTags=maid')

            const url = data?.items?.[0]?.url
            if (!url) {
                return M.reply('❌ Failed to fetch a maid image.')
            }

            let buffer = null
            try {
                buffer = await getBuffer(url)
            } catch {}

            if (!buffer) {
                return M.reply('❌ Could not download the maid image.')
            }

            return M.reply(buffer, 'image')
        } catch (err) {
            console.error('[MAID]', err)
            return M.reply('❌ Failed to get a maid image.')
        }
    }
)
