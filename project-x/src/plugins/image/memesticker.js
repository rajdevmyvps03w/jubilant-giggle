import { plugin } from '../../utils/plugin.js'
import { uploadToLitterbox } from '../../functions/helpler.js'
import { Sticker, StickerTypes } from 'wa-sticker-formatter'

plugin(
    {
        name: 'memesticker',
        aliases: ['ms'],
        category: 'image',
        description: {
            content: 'Create a meme sticker from an image using top and bottom text.',
            usage: '<text1> | <text2>',
            example: 'Hello | World'
        }
    },
    async (_, M, { text }) => {
        try {
            const isImage = (M.isQuoted && M.quotedMessage?.type === 'image') || (!M.isQuoted && M.type === 'image')

            if (!isImage) {
                return M.reply(`❌ Reply to an *image* with text.\n\nExample:\n${global.config.prefix}ms Hello | World`)
            }

            const [title1, title2] = text.split('|').map((t) => t?.trim())

            if (!title1) return M.reply('❌ Please provide *top text*.')
            if (!title2) return M.reply('❌ Please provide *bottom text*.')

            const buffer = M.isQuoted ? await M.quotedMessage.download() : await M.download()

            if (!buffer) {
                return M.reply('❌ Failed to download the image.')
            }

            const imageUrl = await uploadToLitterbox(buffer)

            if (!imageUrl) {
                return M.reply('❌ Failed to upload image.')
            }

            const memeBuffer = await getBuffer(
                `https://api.memegen.link/images/custom/${encodeURIComponent(title1)}/${encodeURIComponent(title2)}.png?background=${imageUrl}`
            )

            if (!memeBuffer) {
                return M.reply('❌ Failed to generate meme.')
            }

            /* ---------- BUILD STICKER ---------- */
            const sticker = new Sticker(memeBuffer, {
                pack: `${global.config.name} Bot`,
                author: 'Sticker',
                type: StickerTypes.FULL,
                quality: 70
            })

            const built = await sticker.build()

            return M.reply(built, 'sticker')
        } catch (err) {
            console.error('[MEMESTICKER]', err)
            return M.reply('❌ Failed to create meme sticker.')
        }
    }
)
