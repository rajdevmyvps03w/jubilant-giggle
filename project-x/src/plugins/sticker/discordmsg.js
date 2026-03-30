import { plugin } from '../../utils/plugin.js'
import { Sticker, StickerTypes } from 'wa-sticker-formatter'
import { getBuffer, uploadToLitterbox, randomString } from '../../functions/helpler.js'
import { getContact } from '../../database/db.js'

plugin(
    {
        name: 'discordmsg',
        aliases: ['dmsg', 'discordmessage'],
        category: 'sticker',
        description: {
            content: 'Generate a fake Discord message image from a quoted user message.',
            usage: '<reply_to_a_message>'
        }
    },
    async (client, M) => {
        /* ---------------- REQUIRE QUOTED MESSAGE ---------------- */
        if (!M.quotedMessage) {
            return M.reply(
                `❌ Reply to a user message to generate a Discord message image.\n\nExample:\nReply with *${global.config.prefix}discordmsg*`
            )
        }

        if (!global.config.imgbbApiKey) {
            return M.reply('❌ Image upload API key is missing.')
        }

        try {
            const text = M.quotedMessage.text || `[${M.quotedMessage.type}]`
            const quotedSender = M.quotedMessage.participant
            const senderName = await getContact(quotedSender)
            let pfpUrl
            try {
                pfpUrl = await client.profilePictureUrl(quotedSender, 'image')
            } catch {
                pfpUrl = 'https://i.ibb.co/Sn9RZ9K/avatar.png'
            }

            const avatarBuffer = await getBuffer(pfpUrl)
            if (!avatarBuffer) {
                return M.reply('❌ Failed to fetch profile picture.')
            }

            const uploaded = await uploadToLitterbox(avatarBuffer)

            if (!uploaded) {
                return M.reply('❌ Failed to upload avatar.')
            }

            const apiUrl =
                `https://api.popcat.xyz/v2/discord-message` +
                `?username=${encodeURIComponent(senderName)}` +
                `&content=${encodeURIComponent(text)}` +
                `&avatar=${encodeURIComponent(uploaded)}` +
                `&color=%23ffcc99` +
                `&timestamp=${encodeURIComponent(new Date().toISOString())}`

            const resultBuffer = await getBuffer(apiUrl)

            if (!resultBuffer) {
                return M.reply('❌ Failed to generate Discord message image.')
            }
            const sticker = new Sticker(resultBuffer, {
                pack: '👾 Handcrafted for you by',
                author: 'Project-X 👾',
                type: StickerTypes.FULL,
                categories: ['🤩', '🎉'],
                quality: 70
            })

            await M.replyRaw({ sticker: await sticker.build() })
        } catch (err) {
            console.error('[DISCORDMSG]', err)
            return M.reply('❌ Failed to create Discord message.')
        }
    }
)
