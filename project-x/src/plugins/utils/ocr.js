import { plugin } from '../../utils/plugin.js'
import axios from 'axios'
import FormData from 'form-data'

plugin(
    {
        name: 'ocr',
        aliases: ['readtext', 'imgtext'],
        category: 'utils',
        description: {
            content: 'Extract text from an image using OCR.\nReply to an image with this command.',
            usage: '<reply_to_an_image>'
        }
    },
    async (_, M) => {
        if ('image' !== (M.quotedMessage?.type || M.type)) {
            return M.reply(
                `❌ Reply to an *image* to extract text.\n\nExample:\nReply to an image with *${global.config.prefix}ocr*`
            )
        }

        try {
            const buffer = M.isQuoted ? M.quotedMessage.download() : await M.download()

            if (!buffer) {
                return M.reply('❌ Failed to download the image.')
            }
            const form = new FormData()
            form.append('file', buffer, 'image.png')
            form.append('apikey', 'K86862197988957')
            form.append('language', 'eng')
            form.append('isOverlayRequired', 'false')

            const { data } = await axios.post('https://api.ocr.space/parse/image', form, {
                headers: form.getHeaders(),
                timeout: 20000
            })

            const text = data?.ParsedResults?.[0]?.ParsedText?.trim()
            if (!text) {
                return M.reply('⚠️ No readable text found in this image.')
            }
            return M.reply(`🧾 *OCR Result*\n\n${text}`)
        } catch (err) {
            console.error('[OCR]', err)

            return M.reply('❌ Failed to process the image.\nPlease try again later.')
        }
    }
)
