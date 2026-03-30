import { plugin } from '../../utils/plugin.js'
import QRCode from 'qrcode'

plugin(
    {
        name: 'qrcode',
        aliases: ['qr'],
        category: 'utils',
        description: {
            usage: '<text | url>',
            content: 'Generate a QR code for any text or link.',
            example: 'https://google.com'
        }
    },
    async (_, M, { text }) => {
        if (!text) {
            return M.reply(
                `❌ Please provide text or a link to generate QR code.\n\n` +
                    `Example:\n` +
                    `${global.config.prefix}qrcode https://google.com`
            )
        }

        try {
            const dataUrl = await QRCode.toDataURL(text)
            const base64Data = dataUrl.split(',')[1]
            const buffer = Buffer.from(base64Data, 'base64')

            await M.replyRaw({
                image: buffer,
                caption: `🔗 *QR Code Generated*\n\n${text}`
            })
        } catch (err) {
            console.error(err)
            return M.reply('⚠️ Failed to generate QR code.')
        }
    }
)
