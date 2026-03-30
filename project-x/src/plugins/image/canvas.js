import { plugin } from '../../utils/plugin.js'
import { getBuffer, capitalize } from '../../functions/helpler.js'
import { uploadToLitterbox } from '../../functions/helpler.js'

const OPTIONS = [
    'bisexual',
    'blur',
    'circle',
    'heart',
    'horny',
    'its-so-stupid',
    'lesbian',
    'lolice',
    'nonbinary',
    'pansexual',
    'simpcard',
    'pixelate',
    'tonikawa',
    'transgender'
]

plugin(
    {
        name: 'canvas',
        aliases: OPTIONS,
        category: 'image',
        description: {
            content: 'Apply fun canvas effects to a user profile picture.',
            usage: '<option> <mention user | quote user>',
            example: '@user'
        }
    },
    async (client, M, { cmd, text }) => {
        try {
            const isMainCommand = cmd === 'canvas'
            if (isMainCommand && !text) {
                const list =
                    `⛩ *Available Canvas Effects:*\n\n- ${OPTIONS.map(capitalize).join('\n- ')}\n\n` +
                    `🛠️ *Usage:*\n` +
                    `• ${global.config.prefix}canvas <option> @user\n` +
                    `• ${global.config.prefix}<option> @user\n\n` +
                    `Example:\n${global.config.prefix}horny`

                return M.reply(list)
            }

            const option = isMainCommand ? text.split(' ')[0]?.toLowerCase() : cmd

            if (!OPTIONS.includes(option)) {
                return M.reply(
                    `❌ Invalid canvas option.\nUse *${global.config.prefix}canvas* to see all available effects.`
                )
            }

            const target = M.mentioned?.[0] || M.quotedMessage?.participant || M.sender.id

            let pfpUrl
            try {
                pfpUrl = await client.profilePictureUrl(target, 'image')
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

            const resultBuffer = await getBuffer(
                `https://some-random-api.com/canvas/misc/${option}?avatar=${encodeURIComponent(uploaded)}`
            )

            if (!resultBuffer) {
                return M.reply('❌ Failed to generate canvas image.')
            }

            return M.reply(resultBuffer, 'image')
        } catch (err) {
            console.error('[CANVAS]', err)
            return M.reply('❌ Failed to apply canvas effect.')
        }
    }
)
