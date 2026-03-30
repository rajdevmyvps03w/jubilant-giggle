import { plugin } from '../../utils/plugin.js'
import { getBuffer } from '../../functions/helpler.js'

plugin(
    {
        name: 'drake',
        category: 'image',
        description: {
            content: 'Create a Drake meme comparison.',
            usage: '<text1> | <text2>',
            example: 'bugs | clean code'
        }
    },
    async (_, M, { text }) => {
        const [t1, t2] = text.split('|').map((v) => v?.trim())
        if (!t1 || !t2) {
            return M.reply('❌ Provide two texts separated by |')
        }

        try {
            const buffer = await getBuffer(
                `https://api.popcat.xyz/v2/drake?text1=${encodeURIComponent(t1)}&text2=${encodeURIComponent(t2)}`
            )
            if (!buffer) {
                return M.reply('❌ Failed to generate image.')
            }

            return M.reply(buffer, 'image')
        } catch (e) {
            console.error('[DRAKE]', e)
            return M.reply('❌ Error generating meme.')
        }
    }
)
