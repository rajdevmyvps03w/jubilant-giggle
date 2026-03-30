import { plugin } from '../../utils/plugin.js'
import { fetch, getBuffer } from '../../functions/helpler.js'

plugin(
    {
        name: 'anime',
        aliases: ['ani'],
        category: 'weeb',
        description: {
            content: 'Search and display information about an anime.',
            usage: '<anime_name>',
            example: 'Naruto'
        }
    },
    async (_, M, { text }) => {
        if (!text || !text.trim()) {
            return M.reply('❌ Please provide an anime name to search.')
        }

        try {
            const data = await fetch(`https://weeb-api.vercel.app/anime?search=${encodeURIComponent(text.trim())}`)

            if (!Array.isArray(data) || data.length === 0) {
                return M.reply(`❌ No anime found for *"${text}"*.`)
            }

            const anime = data[0]
            const titleEnglish = anime?.title?.english || 'Unknown'
            const titleRomaji = anime?.title?.romaji || 'Unknown'
            const format = anime?.format || 'Unknown'
            const isAdult = anime?.isAdult ? 'Yes' : 'No'
            const status = anime?.status || 'Unknown'
            const episodes = anime?.episodes ?? 'Unknown'
            const duration = anime?.duration ?? 'Unknown'
            const genres = Array.isArray(anime?.genres) ? anime.genres.join(', ') : 'Unknown'
            const trailer = anime?.trailer?.id ? `https://youtu.be/${anime.trailer.id}` : 'Not available'
            const description = anime?.description || 'No description available.'
            const message =
                `🎀 *Name:* ${titleEnglish}\n\n` +
                `👁️‍🗨️ *Romaji:* ${titleRomaji}\n\n` +
                `♨ *Type:* ${format}\n\n` +
                `🔞 *Adult:* ${isAdult}\n\n` +
                `💫 *Status:* ${status}\n\n` +
                `🚥 *Episodes:* ${episodes}\n\n` +
                `🕛 *Duration:* ${duration} min/ep\n\n` +
                `🧧 *Genres:* ${genres}\n\n` +
                `🎞 *Trailer:* ${trailer}\n\n` +
                `📃 *Description:*\n${description}`

            let imageBuffer = null
            try {
                if (anime?.imageUrl) {
                    imageBuffer = await getBuffer(anime.imageUrl)
                }
            } catch {}

            if (imageBuffer) {
                return M.reply(imageBuffer, 'image', null, message)
            }

            return M.reply(message)
        } catch (err) {
            console.error('[ANIME]', err)
            return M.reply(`❌ Failed to fetch anime results for *"${text}"*.`)
        }
    }
)
