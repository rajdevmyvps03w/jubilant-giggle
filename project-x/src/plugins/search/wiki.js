import { plugin } from '../../utils/plugin.js'
import wiki from 'wikijs'

plugin(
    {
        name: 'wikipedia',
        aliases: ['wiki'],
        category: 'utils',
        description: {
            content: 'Search Wikipedia and get a short summary.',
            usage: '<search term>',
            example: 'Narendra Modi'
        }
    },
    async (_, M, { text }) => {
        if (!text || !text.trim()) {
            return M.reply(`❌ Provide a search term.\nExample: ${global.config.prefix}wiki India`)
        }

        const query = text.trim()

        try {
            const page = await wiki()
                .page(query)
                .catch(() => null)
            if (!page) {
                return M.reply(`❌ No Wikipedia page found for *"${query}"*.`)
            }
            let summary = await page.summary().catch(() => null)

            if (!summary || summary.trim().length === 0) {
                return M.reply(`❌ No readable summary available for *"${query}"*.`)
            }
            if (summary.length > 700) {
                summary = summary.slice(0, 700).trim() + '...'
            }

            const url = page.url() || 'Unavailable'

            const message = `📚 *${query}* — Wikipedia\n\n` + `${summary}\n\n` + `🔗 Read more: ${url}`

            return M.reply(message)
        } catch (err) {
            console.error('[WIKIPEDIA]', err)
            return M.reply(`❌ Failed to fetch Wikipedia results for *"${query}"*.`)
        }
    }
)
