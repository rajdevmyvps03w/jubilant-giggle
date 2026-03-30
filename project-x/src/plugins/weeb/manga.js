import { plugin } from '../../utils/plugin.js'
import { fetch, getBuffer } from '../../functions/helpler.js'

plugin(
    {
        name: 'manga',
        category: 'weeb',
        description: {
            content: 'Search and display information about a manga.',
            usage: '<manga_name>',
            example: 'One Piece'
        }
    },
    async (_, M, { text }) => {
        /* ---------- INPUT CHECK ---------- */
        if (!text || !text.trim()) {
            return M.reply('❌ Please provide a manga name to search.')
        }

        try {
            const data = await fetch(`https://weeb-api.vercel.app/manga?search=${encodeURIComponent(text.trim())}`)

            if (!Array.isArray(data) || data.length === 0) {
                return M.reply(`❌ No manga found for *"${text}"*.`)
            }

            const manga = data[0]

            /* ---------- SAFE FIELDS ---------- */
            const titleEn = manga?.title?.english || 'Unknown'
            const titleRo = manga?.title?.romaji || 'Unknown'
            const titleNative = manga?.title?.native || 'Unknown'
            const type = manga?.format || 'Unknown'
            const adult = manga?.isAdult ?? 'Unknown'
            const status = manga?.status || 'Unknown'
            const chapters = manga?.chapters ?? 'Unknown'
            const volumes = manga?.volumes ?? 'Unknown'
            const start = manga?.startDate || 'Unknown'
            const end = manga?.endDate || 'Unknown'
            const genres = Array.isArray(manga?.genres) ? manga.genres.join(', ') : 'Unknown'

            const trailer = manga?.trailer?.id ? `https://youtu.be/${manga.trailer.id}` : 'Not available'

            const descriptionRaw = manga?.description || 'No description available.'
            const description = descriptionRaw.replace(/\([^)]*\)/g, '').trim()

            /* ---------- MESSAGE ---------- */
            const message =
                `🎀 *Name:* ${titleEn}\n\n` +
                `👁️‍🗨️ *Romaji:* ${titleRo}\n\n` +
                `💮 *Japanese:* ${titleNative}\n\n` +
                `♨ *Type:* ${type}\n\n` +
                `🔞 *Is Adult:* ${adult}\n\n` +
                `💫 *Status:* ${status}\n\n` +
                `🚥 *Chapters:* ${chapters}\n\n` +
                `🎭 *Volumes:* ${volumes}\n\n` +
                `🎐 *First Aired:* ${start}\n\n` +
                `🍥 *Last Aired:* ${end}\n\n` +
                `🧧 *Genres:* ${genres}\n\n` +
                `🎞 *Trailer:* ${trailer}\n\n` +
                `📃 *Description:*\n${description}`

            /* ---------- IMAGE ---------- */
            let imageBuffer = null
            try {
                if (manga?.imageUrl) {
                    imageBuffer = await getBuffer(manga.imageUrl)
                }
            } catch {}

            /* ---------- SEND ---------- */
            if (imageBuffer) {
                return M.reply(imageBuffer, 'image', null, message)
            }

            return M.reply(message)
        } catch (err) {
            console.error('[MANGA]', err)
            return M.reply(`❌ Failed to fetch manga results for *"${text}"*.`)
        }
    }
)
