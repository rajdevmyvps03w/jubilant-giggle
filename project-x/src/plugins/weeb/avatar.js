import { getBuffer, fetch } from '../../functions/helpler.js'
import { plugin } from '../../utils/plugin.js'

plugin(
    {
        name: 'avatar',
        category: 'weeb',
        description: {
            content: 'Send a random anime avatar image.'
        }
    },
    async (_, M) => {
        try {
            const data = await fetch('https://nekos.life/api/v2/img/avatar')

            if (!data?.url) {
                return M.reply('❌ Failed to fetch an avatar image.')
            }

            let buffer = null
            try {
                buffer = await getBuffer(data.url)
            } catch {}

            if (!buffer) {
                return M.reply('❌ Could not download the avatar image.')
            }

            return M.reply(buffer, 'image')
        } catch (err) {
            console.error('[AVATAR]', err)
            return M.reply('❌ Failed to get an avatar image.')
        }
    }
)
