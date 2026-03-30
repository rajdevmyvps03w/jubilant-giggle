import { plugin } from '../../utils/plugin.js'
import { getBuffer } from '../../functions/helpler.js'

plugin(
    {
        name: 'caution',
        category: 'image',
        description: {
            content: 'Create a caution sign image.',
            usage: '<text>',
            example: 'bugs ahead'
        }
    },
    async (_, M, { text }) => {
        if (!text) {
            return M.reply('❌ Please provide text.')
        }

        try {
            const buffer = await getBuffer(`https://api.popcat.xyz/v2/caution?text=${encodeURIComponent(text)}`)
            if (!buffer) {
                return M.reply('❌ Failed to generate image.')
            }

            return M.reply(buffer, 'image')
        } catch (e) {
            console.error('[CAUTION]', e)
            return M.reply('❌ Error generating caution image.')
        }
    }
)
