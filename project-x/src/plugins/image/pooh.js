import { plugin } from '../../utils/plugin.js'
import { getBuffer } from '../../functions/helpler.js'

plugin(
    {
        name: 'pooh',
        category: 'image',
        description: {
            content: 'Create a Pooh comparison meme.',
            usage: '<text1> | <text2>',
            example: 'bad code | good code'
        }
    },
    async (_, M, { text }) => {
        const [t1, t2] = text.split('|').map((v) => v?.trim())

        if (!t1 || !t2) {
            return M.reply('❌ Provide two texts separated by |')
        }

        try {
            const buffer = await getBuffer(
                `https://api.popcat.xyz/v2/pooh?text1=${encodeURIComponent(t1)}&text2=${encodeURIComponent(t2)}`
            )
            if (!buffer) {
                return M.reply('❌ Failed to generate image.')
            }

            return M.reply(buffer, 'image')
        } catch (e) {
            console.error('[POOH]', e)
            return M.reply('❌ Error generating meme.')
        }
    }
)
