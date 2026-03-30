import { plugin } from '../../utils/plugin.js'
import { getBuffer, fetch, getUrls } from '../../functions/helpler.js'
import { Sticker } from 'wa-sticker-formatter'

plugin(
    {
        name: 'telesticker',
        aliases: ['tgs', 'tgsticker'],
        category: 'sticker',
        description: {
            content: 'Download a Telegram sticker pack and send all stickers.',
            usage: '<telegram_sticker_pack_url>',
            example: 'https://t.me/addstickers/Doge'
        }
    },
    async (_, M, { text }) => {
        const [url] = getUrls(text)

        if (!url) {
            return M.reply('❌ Please provide a Telegram sticker pack URL.')
        }

        if (!url.includes('https://t.me/addstickers/')) {
            return M.reply('⚠️ Invalid URL. Only Telegram sticker pack links are supported.')
        }

        try {
            const res = await fetch(`https://weeb-api.vercel.app/telesticker?url=${encodeURIComponent(url)}`)

            const stickers = res?.stickers

            if (!Array.isArray(stickers) || stickers.length === 0) {
                return M.reply('❌ No stickers found in this pack.')
            }

            for (const stickerUrl of stickers) {
                try {
                    const buffer = await getBuffer(stickerUrl)

                    const sticker = new Sticker(buffer, {
                        pack: `${global.config.name || 'Bot'} Stickers`,
                        author: 'Telegram Import',
                        categories: ['🤩', '🎉'],
                        quality: 70
                    })

                    await M.replyRaw({ sticker: await sticker.build() })
                } catch {
                    continue
                }
            }
        } catch (err) {
            console.error('[TELESTICKER]', err)
            return M.reply('❌ Failed to fetch Telegram stickers. The pack may be private or invalid.')
        }
    }
)
