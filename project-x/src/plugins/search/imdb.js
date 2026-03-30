import { plugin } from '../../utils/plugin.js'
import { fetch, getBuffer } from '../../functions/helpler.js'

plugin(
    {
        name: 'imdb',
        aliases: ['movie'],
        category: 'search',
        description: {
            content: 'Search movie or series information from IMDb.',
            usage: '<movie_name>',
            example: 'iron man'
        }
    },
    async (_, M, { text }) => {
        if (!text) {
            return M.reply(
                `❌ Please provide a movie or series name.\n\nExample: ${global.config.prefix}imdb interstellar`
            )
        }

        try {
            const data = await fetch(`https://api.popcat.xyz/v2/imdb?q=${encodeURIComponent(text)}`)

            if (data?.error || !data?.message) {
                return M.reply(`❌ No results found for *${text}*.`)
            }

            const m = data.message

            const ratings = m.ratings?.map((r) => `• ${r.source}: ${r.value}`).join('\n') || 'No ratings available.'

            const message = [
                `🎬 *${m.title} (${m.year})*`,
                '',
                `⭐ *IMDb Rating:* ${m.rating} (${m.votes} votes)\n`,
                `🏆 *Awards:* ${m.awards || 'N/A'}\n`,
                `🎭 *Genres:* ${m.genres}\n`,
                `🎞 *Runtime:* ${m.runtime}\n`,
                `📅 *Released:* ${new Date(m.released).toDateString()}\n`,
                `🔞 *Rated:* ${m.rated}\n`,
                `🎬 *Director:* ${m.director}\n`,
                `✍️ *Writer:* ${m.writer}\n`,
                `👥 *Actors:* ${m.actors}\n`,
                `🌍 *Country:* ${m.country}\n`,
                `🗣 *Languages:* ${m.languages}\n`,
                `💰 *Box Office:* ${m.boxoffice || 'N/A'}\n`,
                `📊 *Ratings:*\n${ratings}\n`,
                `📝 *Plot:*`,
                m.plot?.length > 700 ? m.plot.slice(0, 700) + '…' : m.plot,
                '',
                `🔗 IMDb: ${m.imdburl}`
            ].join('\n')

            try {
                if (m.poster) {
                    const buffer = await getBuffer(m.poster)
                    return M.reply(buffer, 'image', undefined, message)
                }
            } catch {}

            return M.reply(message)
        } catch (err) {
            console.error('[IMDB]', err)
            return M.reply('❌ Failed to fetch IMDb data. Try again later.')
        }
    }
)
