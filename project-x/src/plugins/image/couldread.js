import { plugin } from '../../utils/plugin.js'
import { getBuffer } from '../../functions/helpler.js'

plugin(
    {
        name: 'couldread',
        category: 'image',
        description: {
            content: 'Generate a “could read” meme image from text.',
            usage: '<text>',
            example: 'Never gonna give you up'
        }
    },
    async (_, M, { text }) => {
        if (!text) {
            return M.reply('❌ Please provide text.')
        }

        try {
            const url = `https://api.popcat.xyz/v2/couldread?text=${encodeURIComponent(text)}`
            const buffer = await getBuffer(url)
            if (!buffer) {
                return M.reply('❌ Failed to generate image.')
            }

            return M.reply(buffer, 'image')
        } catch (e) {
            console.error('[COULDREAD]', e)
            return M.reply('❌ Error generating image.')
        }
    }
)
