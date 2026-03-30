import { plugin } from '../../utils/plugin.js'
import { getBuffer } from '../../functions/helpler.js'

plugin(
    {
        name: 'pikachu',
        category: 'image',
        description: {
            content: 'Generate a Pikachu text meme.',
            usage: '<text>',
            example: 'hello'
        }
    },
    async (_, M, { text }) => {
        if (!text) {
            return M.reply('❌ Please provide text.')
        }

        try {
            const buffer = await getBuffer(`https://api.popcat.xyz/v2/pikachu?text=${encodeURIComponent(text)}`)
            if (!buffer) {
                return M.reply('❌ Failed to generate image.')
            }

            return M.reply(buffer, 'image')
        } catch (e) {
            console.error('[PIKACHU]', e)
            return M.reply('❌ Error generating meme.')
        }
    }
)
