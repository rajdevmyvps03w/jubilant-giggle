import { plugin } from '../../utils/plugin.js'
import yts from 'yt-search'

plugin(
    {
        name: 'yts',
        aliases: ['ytsearch'],
        category: 'downloader',
        description: {
            content: 'Search YouTube videos.',
            usage: '<search text>',
            example: 'alan walker faded'
        }
    },
    async (_, M, { text }) => {
        try {
            if (!text) {
                return M.reply('❌ Provide a search query.')
            }

            const { videos } = await yts(text)
            if (!videos.length) {
                return M.reply('❌ No results found.')
            }
            let msg = ''
            videos.forEach((video, i) => {
                const { title, author, url, timestamp } = video
                msg += `*#${i + 1}*\n📗 *Title: ${title}*\n📕 *Channel: ${
                    author.name
                }*\n📙 *Duration: ${timestamp}s*\n🔗 *URL: ${url}*\n\n`
            })

            return M.reply(msg)
        } catch (err) {
            console.error('[YTS COMMAND]', err)
            return M.reply('❌ Unexpected error while searching.')
        }
    }
)
