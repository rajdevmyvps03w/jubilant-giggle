import { getBuffer, fetch } from '../../functions/helpler.js'
import { plugin } from '../../utils/plugin.js'

plugin(
    {
        name: 'husbando',
        category: 'weeb',
        description: {
            content: 'Send a random husbando anime image.'
        }
    },
    async (_, M) => {
        try {
            const data = await fetch('https://nekos.best/api/v2/husbando')

            const url = data?.results?.[0]?.url
            if (!url) {
                return M.reply('❌ Failed to fetch a husbando image.')
            }

            let buffer = null
            try {
                buffer = await getBuffer(url)
            } catch {}

            if (!buffer) {
                return M.reply('❌ Could not download the husbando image.')
            }

            return M.reply(buffer, 'image')
        } catch (err) {
            console.error('[HUSBANDO]', err)
            return M.reply('❌ Failed to get a husbando image.')
        }
    }
)
