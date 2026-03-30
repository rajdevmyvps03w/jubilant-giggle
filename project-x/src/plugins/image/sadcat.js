import { plugin } from '../../utils/plugin.js'
import { getBuffer } from '../../functions/helpler.js'

plugin(
    {
        name: 'sadcat',
        category: 'image',
        description: {
            content: 'Create a sad cat meme with custom text.',
            usage: '<text>',
            example: 'no bugs fixed'
        }
    },
    async (_, M, { text }) => {
        if (!text) {
            return M.reply('❌ Please provide text.')
        }

        try {
            const buffer = await getBuffer(`https://api.popcat.xyz/v2/sadcat?text=${encodeURIComponent(text)}`)
            if (!buffer) {
                return M.reply('❌ Failed to generate image.')
            }

            return M.reply(buffer, 'image')
        } catch (e) {
            console.error('[SADCAT]', e)
            return M.reply('❌ Error generating image.')
        }
    }
)
