import { getBuffer, fetch } from '../../functions/helpler.js'
import { plugin } from '../../utils/plugin.js'

plugin(
    {
        name: 'rpaper',
        category: 'weeb',
        description: {
            content: 'Send a random anime wallpaper.'
        }
    },
    async (_, M) => {
        try {
            const data = await fetch('https://nekos.life/api/v2/img/wallpaper')

            if (!data?.url) {
                return M.reply('❌ Failed to fetch a wallpaper image.')
            }

            let buffer = null
            try {
                buffer = await getBuffer(data.url)
            } catch {}

            if (!buffer) {
                return M.reply('❌ Could not download the wallpaper image.')
            }

            return M.reply(buffer, 'image')
        } catch (err) {
            console.error('[RPAPER]', err)
            return M.reply('❌ Failed to get a wallpaper image.')
        }
    }
)
