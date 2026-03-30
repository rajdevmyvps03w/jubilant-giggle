import { plugin } from '../../utils/plugin.js'
import { getBuffer, uploadToLitterbox } from '../../functions/helpler.js'
import { getContact } from '../../database/db.js'

plugin(
    {
        name: 'ytcomment',
        aliases: ['yt-comment'],
        category: 'image',
        description: {
            content: 'Create a fake YouTube comment image using your text or replied message.',
            usage: '<text or reply>',
            example: 'ytcomment Nice video bro'
        }
    },
    async (client, M, { text }) => {
        if (!global.config.imgbbApiKey) {
            return M.reply('❌ Image upload API key is missing.')
        }
        try {
            /* ---------- GET MESSAGE TEXT ---------- */
            const message = M.quotedMessage?.text || text?.trim()

            if (!message) {
                return M.reply('❌ Reply to a text message or provide text.')
            }

            /* ---------- TARGET USER ---------- */
            const user = M.sender.id

            /* ---------- PROFILE PICTURE ---------- */
            let pfpUrl
            try {
                pfpUrl = await client.profilePictureUrl(user, 'image')
            } catch {
                pfpUrl = 'https://nekos.best/api/v2/husbando/ef43ba5a-52de-40dd-a38e-f683bf6cc254.png'
            }

            /* ---------- DOWNLOAD AVATAR ---------- */
            const avatarBuffer = await getBuffer(pfpUrl)
            if (!avatarBuffer) {
                return M.reply('❌ Failed to fetch profile picture.')
            }

            const uploaded = await uploadToLitterbox(avatarBuffer)

            if (!uploaded) {
                return M.reply('❌ Failed to upload avatar.')
            }

            /* ---------- USERNAME ---------- */
            const username = await getContact(user)

            /* ---------- GENERATE COMMENT IMAGE ---------- */
            const apiUrl =
                `https://some-random-api.com/canvas/misc/youtube-comment` +
                `?avatar=${encodeURIComponent(uploaded)}` +
                `&username=${encodeURIComponent(username)}` +
                `&comment=${encodeURIComponent(message)}`

            const resultBuffer = await getBuffer(apiUrl)
            if (!resultBuffer) {
                return M.reply('❌ Failed to generate YouTube comment image.')
            }

            return M.reply(resultBuffer, 'image')
        } catch (err) {
            console.error('[YT-COMMENT]', err)
            return M.reply('❌ Failed to create YouTube comment image.')
        }
    }
)
