import { plugin } from '../../utils/plugin.js'
import { Sticker, StickerTypes } from 'wa-sticker-formatter'
import { getBuffer, fetch } from '../../functions/helpler.js'

const EMOJI_JSON =
    'https://gist.githubusercontent.com/Debanjan-San/46abb213325e4274aa103e3441424b34/raw/d1c7737a883e2d3c08ae9719d5359ec8e715111e/emojis.json'

const getNameFromUrl = (url) => {
    try {
        return url.split('/').pop().replace('.webp', '')
    } catch {
        return 'emoji'
    }
}

plugin(
    {
        name: 'emoji',
        aliases: ['emojis'],
        category: 'fun',
        description: {
            content: 'Browse emoji packs using numbers.\n' + 'Shows categories → emojis → sends sticker.',
            usage: '<category_number> <emoji_number>',
            example: 'emoji 1 1'
        }
    },
    async (_, M, { args }) => {
        try {
            const data = await fetch(EMOJI_JSON)

            if (!data || typeof data !== 'object') {
                return M.reply('❌ Failed to load emoji database.')
            }

            const categories = Object.keys(data)

            if (!args[0]) {
                let msg = '🎭 *Emoji Categories*\n\n'

                categories.forEach((cat, i) => {
                    msg += `${i + 1}. ${cat}\n`
                })

                msg += `\nUse *${global.config.prefix}emoji <category_number>* to view emojis.`

                return M.reply(msg.trim())
            }

            const catIndex = Number(args[0])

            if (isNaN(catIndex) || catIndex < 1 || catIndex > categories.length) {
                return M.reply(`❌ Invalid category number.\nChoose 1–${categories.length}.`)
            }

            const category = categories[catIndex - 1]
            const emojis = data[category]

            if (!args[1]) {
                let msg = `🎴 *${category.toUpperCase()} Emojis*\n\n`

                emojis.forEach((url, i) => {
                    msg += `${i + 1}. ${getNameFromUrl(url)}\n`
                })

                msg += `\nUse *${global.config.prefix}emoji ${catIndex} <emoji_number>* to send sticker.`

                return M.reply(msg.trim())
            }
            const emojiIndex = Number(args[1])

            if (isNaN(emojiIndex) || emojiIndex < 1 || emojiIndex > emojis.length) {
                return M.reply(`❌ Invalid emoji number.\nChoose 1–${emojis.length}.`)
            }

            const url = emojis[emojiIndex - 1]

            const buffer = await getBuffer(url)

            if (!buffer) {
                return M.reply('❌ Failed to download emoji.')
            }
            const sticker = new Sticker(buffer, {
                pack: '👾 Handcrafted for you by',
                author: 'Project-X 👾',
                type: StickerTypes.FULL,
                categories: ['🤩', '🎉'],
                quality: 70
            })
            await M.replyRaw({ sticker: await sticker.build() })
        } catch (err) {
            console.error('[EMOJI CMD]', err)
            return M.reply('❌ Failed to process emoji command.')
        }
    }
)
