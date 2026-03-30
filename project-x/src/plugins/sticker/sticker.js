import { plugin } from '../../utils/plugin.js'
import { Sticker, StickerTypes } from 'wa-sticker-formatter'

plugin(
    {
        name: 'sticker',
        aliases: ['s', 'stik'],
        category: 'sticker',
        description: {
            content:
                'Convert an image, video, or GIF into a WhatsApp sticker.\n' +
                'You can customize pack name, author, and style.',
            usage: '<pack | author> [--crop | --stretch | --circle]',
            example: 'Reply: MyPack|ByMe --circle\n' + 'Direct: --crop'
        }
    },
    async (_, M, { text, flags }) => {
        const mediaType = M.isQuoted ? M.quotedMessage?.type : M.type

        if (!['image', 'video', 'gif'].includes(mediaType)) {
            return M.reply('❌ Reply to or send an image, video, or GIF to create a sticker.')
        }

        /* ---------------- DOWNLOAD MEDIA ---------------- */
        let buffer = null
        try {
            buffer = M.isQuoted ? await M.quotedMessage.download() : await M.download()
        } catch {}

        if (!buffer) {
            return M.reply('❌ Failed to download media.')
        }

        /* ---------------- PACK INFO ---------------- */
        const parts = text ? text.split('|') : []
        const packName = parts[0]?.trim() || `${global.config.name || 'Bot'} Stickers`
        const authorName = parts[1]?.trim() || 'Sticker Maker'

        /* ---------------- STICKER TYPE ---------------- */
        let type = StickerTypes.FULL

        if ('crop' in flags || 'c' in flags) type = StickerTypes.CROP
        else if ('stretch' in flags || 's' in flags) type = StickerTypes.DEFAULT
        else if ('circle' in flags) type = StickerTypes.CIRCLE

        /* ---------------- BUILD STICKER ---------------- */
        try {
            const sticker = new Sticker(buffer, {
                pack: packName,
                author: authorName,
                categories: ['🤩', '🎉'],
                quality: 70,
                type
            })

            await M.replyRaw({ sticker: await sticker.build() })
        } catch (err) {
            console.error('[STICKER]', err)
            return M.reply('❌ Failed to create sticker. Try another media file.')
        }
    }
)
