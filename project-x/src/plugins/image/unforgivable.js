import { plugin } from '../../utils/plugin.js'
import { getBuffer } from '../../functions/helpler.js'

plugin(
    {
        name: 'unforgivable',
        category: 'image',
        description: {
            content: 'Generate an unforgivable meme image.',
            usage: '<text>',
            example: 'bad coding'
        }
    },
    async (_, M, { text }) => {
        if (!text) {
            return M.reply('❌ Please provide text.')
        }

        try {
            const buffer = await getBuffer(`https://api.popcat.xyz/v2/unforgivable?text=${encodeURIComponent(text)}`)
            if (!buffer) {
                return M.reply('❌ Failed to generate image.')
            }

            return M.reply(buffer, 'image')
        } catch (e) {
            console.error('[UNFORGIVABLE]', e)
            return M.reply('❌ Error generating image.')
        }
    }
)
