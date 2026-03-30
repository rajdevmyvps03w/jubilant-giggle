import { plugin } from '../../utils/plugin.js'
import { Sticker, StickerTypes } from 'wa-sticker-formatter'
import { fetch, getBuffer } from '../../functions/helpler.js'

plugin(
    {
        name: 'emojimix',
        aliases: ['mixemoji', 'emix'],
        category: 'utils',
        description: {
            usage: '<emoji1> <emoji2>',
            content: 'Mix two emojis and get Emoji Kitchen stickers.',
            example: '😂 😭'
        }
    },
    async (_, M, { args }) => {
        if (args.length < 2) {
            return M.reply(`❌ Please provide two emojis.\n\n` + `Example:\n` + `${global.config.prefix}emojimix 😂 😭`)
        }

        const emoji1 = args[0]
        const emoji2 = args[1]

        const url =
            `https://tenor.googleapis.com/v2/featured` +
            `?key=${global.config.tenorApiKey}` +
            `&contentfilter=high` +
            `&media_filter=png_transparent` +
            `&component=proactive` +
            `&collection=emoji_kitchen_v5` +
            `&q=${encodeURIComponent(emoji1)}_${encodeURIComponent(emoji2)}`

        let data
        try {
            data = await fetch(url)
        } catch (err) {
            return M.reply('⚠️ Failed to contact Emoji Kitchen service.')
        }

        if (!data.results || data.results.length === 0) {
            return M.reply('❌ No sticker mix found for those emojis.')
        }

        for (const result of data.results) {
            try {
                const buffer = await getBuffer(result.url)
                const sticker = new Sticker(buffer, {
                    pack: '👾 Handcrafted for you by',
                    author: 'Project-X 👾',
                    type: StickerTypes.FULL,
                    categories: ['🤩', '🎉'],
                    quality: 70
                })
                await M.replyRaw({ sticker: await sticker.build() })
            } catch (err) {
                M.reply('⚠️ Failed to send one of the stickers.')
            }
        }
    }
)
