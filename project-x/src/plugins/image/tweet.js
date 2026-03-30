import { plugin } from '../../utils/plugin.js'
import { getBuffer, uploadToLitterbox } from '../../functions/helpler.js'
import { getContact } from '../../database/db.js'

plugin(
    {
        name: 'tweet',
        category: 'image',
        description: {
            content: 'Create a fake tweet image using your text or replied message.',
            usage: '<text or reply>',
            example: 'tweet Hello world'
        }
    },
    async (client, M, { text }) => {
        try {
            const message = M.quotedMessage?.text || text?.trim()

            if (!message) {
                return M.reply('❌ Reply to a text message or provide text.')
            }

            const user = M.sender.id
            let pfpUrl
            try {
                pfpUrl = await client.profilePictureUrl(user, 'image')
            } catch {
                pfpUrl = 'https://nekos.best/api/v2/husbando/ef43ba5a-52de-40dd-a38e-f683bf6cc254.png'
            }
            const avatarBuffer = await getBuffer(pfpUrl)
            if (!avatarBuffer) {
                return M.reply('❌ Failed to fetch profile picture.')
            }
            const uploaded = await uploadToLitterbox(avatarBuffer)

            if (!uploaded) {
                return M.reply('❌ Failed to upload avatar.')
            }
            const username = await getContact(user)
            const apiUrl =
                `https://some-random-api.com/canvas/misc/tweet` +
                `?avatar=${encodeURIComponent(uploaded)}` +
                `&username=${encodeURIComponent(username)}` +
                `&displayname=${encodeURIComponent(username)}` +
                `&comment=${encodeURIComponent(message)}`

            const resultBuffer = await getBuffer(apiUrl)
            if (!resultBuffer) {
                return M.reply('❌ Failed to generate tweet image.')
            }

            return M.reply(resultBuffer, 'image')
        } catch (err) {
            console.error('[TWEET]', err)
            return M.reply('❌ Failed to create tweet image.')
        }
    }
)
