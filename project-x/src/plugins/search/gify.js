import { fetch, getBuffer, getRandomInt } from '../../functions/helpler.js'
import { plugin } from '../../utils/plugin.js'

plugin(
    {
        name: 'gifsearch',
        aliases: ['gify'],
        category: 'search',
        description: {
            content: 'Send a GIF related to the given search query.',
            usage: '<text>',
            example: 'cat funny'
        }
    },
    async (_, M, { text }) => {
        try {
            const query = text?.trim()

            if (!query) {
                return M.reply(`❌ Please provide a search query.\nExample: ${global.config.prefix}gifsearch cat`)
            }

            const data = await fetch(
                `https://g.tenor.com/v1/search?q=${encodeURIComponent(query)}&key=LIVDSRZULELA&limit=8`
            )

            const results = data?.results
            if (!results || results.length === 0) {
                return M.reply(`❌ No GIFs found for *${query}*.`)
            }

            const randomIndex = getRandomInt(0, results.length - 1)
            const mediaUrl = results[randomIndex]?.media?.[0]?.mp4?.url

            if (!mediaUrl) {
                return M.reply('❌ Failed to retrieve GIF media.')
            }

            let buffer = null
            try {
                buffer = await getBuffer(mediaUrl)
            } catch {}

            if (!buffer) {
                return M.reply('❌ Could not download the GIF.')
            }

            return M.replyRaw({
                video: buffer,
                gifPlayback: true
            })
        } catch (err) {
            console.error('[GIFSEARCH]', err)
            return M.reply('❌ Failed to fetch GIF. Please try again later.')
        }
    }
)
