import { plugin } from '../../utils/plugin.js'
import { webpToMp4, webpToPng } from '../../functions/helpler.js'

plugin(
    {
        name: 'unsticker',
        aliases: ['sticker2media', 's2m'],
        category: 'sticker',
        description: {
            content: 'Convert a quoted sticker into image or video.',
            usage: '<reply to sticker>'
        }
    },
    async (_, M) => {
        if (!M.isQuoted || M.quotedMessage?.type != 'sticker') {
            return M.reply('❌ Reply to the sticker you want to convert.')
        }

        let buffer = null
        try {
            buffer = await M.quotedMessage.download()
        } catch {}

        if (!buffer) {
            return M.reply('❌ Failed to download the sticker.')
        }

        const animated = M.quotedMessage.isAnimated
        const type = animated ? 'video' : 'image'

        try {
            const result = animated ? await webpToMp4(buffer) : await webpToPng(buffer)

            await M.replyRaw({
                [type]: result,
                gifPlayback: animated || undefined
            })
        } catch (err) {
            console.error('[UNSTICKER]', err)
            return M.reply('❌ Conversion failed. Try again.')
        }
    }
)
