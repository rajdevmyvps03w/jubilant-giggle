import { plugin } from '../../utils/plugin.js'
import { Sticker, StickerTypes } from 'wa-sticker-formatter'

plugin(
    {
        name: 'steal',
        aliases: ['take', 'getsticker'],
        category: 'sticker',
        description: {
            content: 'Change the pack name and author of a quoted sticker.\n' + 'You must reply to a sticker message.',
            usage: '<pack | author>',
            example: 'MyPack|ByMe'
        }
    },
    async (_, M, { text }) => {
        /* ---------------- QUOTED STICKER CHECK ---------------- */
        if (!M.isQuoted || M.quotedMessage?.type !== 'sticker') {
            return M.reply('❌ Reply to a sticker to steal and rename it.')
        }

        /* ---------------- DOWNLOAD STICKER ---------------- */
        let buffer = null
        try {
            buffer = await M.quotedMessage.download()
        } catch {}

        if (!buffer) {
            return M.reply('❌ Failed to download the quoted sticker.')
        }
        const parts = text ? text.split('|') : []
        const packName = parts[0]?.trim() || `${global.config.name || 'Bot'} Stickers`
        const authorName = parts[1]?.trim() || 'Sticker Maker'

        try {
            const sticker = new Sticker(buffer, {
                pack: packName,
                author: authorName,
                type: StickerTypes.FULL,
                categories: ['🤩', '🎉'],
                quality: 70
            })

            await M.replyRaw({ sticker: await sticker.build() })
        } catch (err) {
            console.error('[STEAL STICKER]', err)
            return M.reply('❌ Failed to rebuild the sticker.')
        }
    }
)
