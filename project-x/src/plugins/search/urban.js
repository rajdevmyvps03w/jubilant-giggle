import { plugin } from '../../utils/plugin.js'
import { fetch } from '../../functions/helpler.js'

plugin(
    {
        name: 'urbandictionary',
        aliases: ['udictionary', 'urban'],
        category: 'search',
        description: {
            content: 'Search a word or phrase on Urban Dictionary.',
            usage: '<text>',
            example: 'rizz'
        }
    },
    async (_, M, { text }) => {
        if (!text) {
            return M.reply('❌ Provide a word or phrase to search.')
        }

        const query = text.trim()
        let data

        try {
            data = await fetch(`https://api.urbandictionary.com/v0/define?term=${encodeURIComponent(query)}`)
        } catch {
            return M.reply('❌ Failed to reach Urban Dictionary. Try again later.')
        }

        if (!data?.list?.length) {
            return M.reply(`❌ No results found for *${query}*.`)
        }

        const result = data.list[0]
        const clean = (t = '') => t.replace(/\[/g, '').replace(/\]/g, '')
        const definition = clean(result.definition)
        const example = clean(result.example)

        return M.reply(
            `📘 *Urban Dictionary*\n\n` +
                `🔍 *Term:* ${query}\n\n` +
                `📖 *Definition:*\n${definition}\n\n` +
                (example ? `💬 *Example:*\n${example}` : '')
        )
    }
)
