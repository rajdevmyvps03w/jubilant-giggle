import { plugin } from '../../utils/plugin.js'
import { shortenUrl, getUrls } from '../../functions/helpler.js'

plugin(
    {
        name: 'tourl',
        aliases: ['shorturl', 'shorten'],
        category: 'utils',
        description: {
            content: 'Shorten a long URL using TinyURL.',
            usage: '<url> | <custom-alias (optional)>',
            example: 'https://example.com | myalias'
        }
    },
    async (_, M, { text }) => {
        const input = text.trim()
        if (!input) {
            return M.reply(`🔗 Provide a URL to shorten.\n\nExample:\n${global.config.prefix}tourl https://example.com`)
        }

        const [rawUrl, customAlias] = input.split('|').map((s) => s.trim())
        const [longUrl] = getUrls(rawUrl)
        if (!longUrl) {
            return M.reply('❌ Invalid URL. Must start with http:// or https://')
        }

        try {
            const shortUrl = await shortenUrl(longUrl, customAlias || null, global.config.token)
            return M.reply(`🔗 *Shortened URL*\n\n${shortUrl}`)
        } catch (err) {
            console.error('[tourl]', err.message)

            return M.reply(
                '❌ Failed to shorten the URL.\n' +
                    (err.response?.data?.errors?.[0]?.message ? `Reason: ${err.response.data.errors[0].message}` : '')
            )
        }
    }
)
