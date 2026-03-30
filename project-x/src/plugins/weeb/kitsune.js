import { getBuffer, fetch } from '../../functions/helpler.js'
import { plugin } from '../../utils/plugin.js'

plugin(
    {
        name: 'kitsune',
        aliases: ['foxgirl'],
        category: 'weeb',
        description: {
            content: 'Send a random kitsune (fox girl) anime image.'
        }
    },
    async (_, M) => {
        try {
            const data = await fetch('https://nekos.life/api/v2/img/fox_girl')

            if (!data?.url) {
                return M.reply('❌ Failed to fetch a kitsune image. Try again later.')
            }

            let buffer = null
            try {
                buffer = await getBuffer(data.url)
            } catch {}

            if (!buffer) {
                return M.reply('❌ Could not download the image.')
            }
            return M.reply(buffer, 'image')
        } catch (err) {
            console.error('[KITSUNE]', err)
            return M.reply('❌ Failed to get a kitsune image.')
        }
    }
)
