import { plugin } from '../../utils/plugin.js'
import { fetch, getBuffer, getRandomItem } from '../../functions/helpler.js'
import { Sticker, StickerTypes } from 'wa-sticker-formatter'

plugin(
    {
        name: 'tenorsticker',
        aliases: ['gifsticker', 'gsticker'],
        category: 'sticker',
        description: {
            content: 'Search a GIF from Tenor and convert it into a sticker.',
            usage: '<search text>',
            example: 'tenorsticker cat'
        }
    },
    async (_, M, { text }) => {
        const query = text.trim()
        if (!query) {
            return M.reply('❌ Provide a search query.\nExample: .tenorsticker cat')
        }

        try {
            const data = await fetch(
                `https://g.tenor.com/v1/search?q=${encodeURIComponent(query)}&key=LIVDSRZULELA&limit=8`
            )

            const results = data?.results || []
            if (!results.length) {
                return M.reply('❌ No GIF results found.')
            }
            const random = getRandomItem(results)
            const videoUrl = random?.media?.[0]?.mp4?.url

            if (!videoUrl) {
                return M.reply('❌ Failed to extract GIF video.')
            }

            let buffer = null
            try {
                buffer = await getBuffer(videoUrl)
            } catch {}

            if (!buffer) {
                return M.reply('❌ Failed to download the GIF.')
            }

            const sticker = new Sticker(buffer, {
                pack: `${global.config.name || 'Bot'} Stickers`,
                author: 'Tenor Import ✨',
                type: StickerTypes.CROPPED,
                categories: ['🤩', '🎉'],
                id: '12345',
                quality: 50,
                background: 'transparent'
            })

            await M.replyRaw({ sticker: await sticker.build() })
        } catch (err) {
            console.error('[TENOR STICKER]', err)
            return M.reply('❌ Failed to create sticker from Tenor GIF.')
        }
    }
)
