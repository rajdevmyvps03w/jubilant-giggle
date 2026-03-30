import { plugin } from '../../utils/plugin.js'
import { getBuffer } from '../../functions/helpler.js'

plugin(
    {
        name: 'supreme',
        category: 'image',
        description: {
            content: 'Create a Supreme-style logo from text.',
            usage: '<text>',
            example: 'PopCat'
        }
    },
    async (_, M, { text }) => {
        if (!text) {
            return M.reply('❌ Please provide text.')
        }

        try {
            const buffer = await getBuffer(`https://api.popcat.xyz/v2/supreme?text=${encodeURIComponent(text)}`)
            if (!buffer) {
                return M.reply('❌ Failed to generate image.')
            }

            return M.reply(buffer, 'image')
        } catch (e) {
            console.error('[SUPREME]', e)
            return M.reply('❌ Error generating Supreme logo.')
        }
    }
)
