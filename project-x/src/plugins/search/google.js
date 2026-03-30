import { fetch } from '../../functions/helpler.js'
import { plugin } from '../../utils/plugin.js'

plugin(
    {
        name: 'search',
        aliases: ['google', 'duckduckgo', 'ddg'],
        category: 'search',
        description: {
            content: 'Search DuckDuckGo and return top results.',
            usage: '<text>',
            example: 'anime'
        }
    },
    async (_, M, { text }) => {
        try {
            const query = text?.trim()

            if (!query) {
                return M.reply(`❌ Please provide a search query.\nExample: ${global.config.prefix}search anime`)
            }

            // Using DuckDuckGo Instant Answer API
            const res = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1`)

            if (!res) {
                return M.reply(`❌ No results found for *${query}*.`)
            }

            let message = `🔎 *Search Results for:* ${query}\n\n`

            // 1. Check for a Direct Abstract (Instant Answer)
            if (res.AbstractText) {
                message += `📝 *Summary:* ${res.AbstractText}\n`
                if (res.AbstractURL) message += `🔗 *Source:* ${res.AbstractURL}\n\n`
            }

            // 2. Add Related Topics (Alternative results)
            const topics = res.RelatedTopics?.slice(0, 20) || []
            if (topics.length > 0) {
                message += `📌 *Related Topics:*\n`
                topics.forEach((topic, i) => {
                    // DuckDuckGo sometimes groups topics; we only want the direct links
                    if (topic.Text && topic.FirstURL) {
                        message += `\n${i + 1}. *${topic.Text.split(' - ')[0]}*`
                        message += `\n🔗 ${topic.FirstURL}\n`
                    }
                })
            }

            // 3. Final Check if everything is empty
            if (!res.AbstractText && topics.length === 0) {
                return M.reply(`❌ No specific information found for *${query}*. Try a more general term.`)
            }

            return M.reply(message.trim())
        } catch (err) {
            console.error('[SEARCH_ERROR]', err)
            return M.reply('❌ Failed to fetch results. The search service might be down.')
        }
    }
)
