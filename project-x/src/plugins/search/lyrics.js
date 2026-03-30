import { plugin } from '../../utils/plugin.js'
import { fetch, getBuffer } from '../../functions/helpler.js'

plugin(
    {
        name: 'lyrics',
        category: 'search',
        description: {
            content: 'Fetch and send lyrics of a song.',
            usage: '<song name>',
            example: 'perfect ed sheeran'
        }
    },
    async (_, M, { text }) => {
        if (!text) {
            return M.reply('❌ Provide a song name to search lyrics.')
        }

        let data

        try {
            data = await fetch(`https://api.popcat.xyz/v2/lyrics?song=${encodeURIComponent(text)}`)
        } catch {
            return M.reply('❌ Failed to fetch lyrics. Try again later.')
        }
        if (data.error) {
            return M.reply("❌ Couldn't find any lyrics for that search.")
        }
        let thumb = null
        try {
            thumb = await getBuffer(data.message?.image)
        } catch {}

        return M.replyRaw({
            text:
                `🎵 *Title:* ${data.message.title}\n` +
                `🖋️ *Artist:* ${data.message.artist}\n\n` +
                `${data.message.lyrics}`,
            contextInfo: thumb
                ? {
                      externalAdReply: {
                          title: data.title,
                          body: data.artist,
                          thumbnail: thumb,
                          mediaType: 1,
                          mediaUrl: '',
                          sourceUrl: '',
                          showAdAttribution: true
                      }
                  }
                : {}
        })
    }
)
