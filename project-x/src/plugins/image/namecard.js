import { plugin } from '../../utils/plugin.js'
import { getBuffer, uploadToLitterbox } from '../../functions/helpler.js'
import { getContact } from '../../database/db.js'

plugin(
    {
        name: 'namecard',
        category: 'image',
        description: {
            content: 'Generate a Genshin-style name card using a user profile.',
            usage: '<mention user | quote user>',
            example: '@user'
        }
    },
    async (client, M) => {
        try {
            const target = M.mentioned?.[0] || M.quotedMessage?.participant || M.sender.id

            let pfpUrl
            try {
                pfpUrl = await client.profilePictureUrl(target, 'image')
            } catch {
                pfpUrl = 'https://nekos.best/api/v2/husbando/ef43ba5a-52de-40dd-a38e-f683bf6cc254.png'
            }
            let bio = '—'
            try {
                const statusData = await client.fetchStatus(M.sender.id)
                if (Array.isArray(statusData) && statusData[0]?.status?.status) {
                    bio = statusData[0].status.status
                }
            } catch {
                bio = 'Unable to fetch bio.'
            }

            const username = await getContact(target)

            const avatarBuffer = await getBuffer(pfpUrl)
            if (!avatarBuffer) {
                return M.reply('❌ Failed to fetch profile picture.')
            }

            const uploaded = await uploadToLitterbox(avatarBuffer)

            if (!uploaded) {
                return M.reply('❌ Failed to upload avatar.')
            }

            const url =
                `https://some-random-api.com/canvas/misc/namecard` +
                `?avatar=${encodeURIComponent(uploaded)}` +
                `&birthday=6/2/23` +
                `&username=${encodeURIComponent(username)}` +
                `&description=${encodeURIComponent(bio.trim())}`

            const resultBuffer = await getBuffer(url)
            if (!resultBuffer) {
                return M.reply('❌ Failed to generate name card.')
            }

            return M.reply(resultBuffer, 'image')
        } catch (err) {
            console.error('[NAMECARD]', err)
            return M.reply('❌ Failed to create name card.')
        }
    }
)
