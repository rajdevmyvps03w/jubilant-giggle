import { plugin } from '../../utils/plugin.js'
import { getBuffer, capitalize, uploadToLitterbox } from '../../functions/helpler.js'
import { getContact } from '../../database/db.js'

const OPTIONS = ['jail', 'comrade', 'gay', 'glass', 'passed', 'wasted']

plugin(
    {
        name: 'overlay',
        aliases: OPTIONS,
        category: 'image',
        description: {
            content:
                'Apply visual overlay effects on a user profile picture.\n' +
                'Available effects: ' +
                OPTIONS.join(', '),
            usage: '<effect> <mention user | quote user>',
            example: '@user'
        }
    },
    async (client, M, { cmd, text }) => {
        try {
            /* ---------- SHOW OPTION LIST ---------- */
            if (cmd === 'overlay' && !text) {
                return M.reply(
                    `🖼️ *Overlay Effects*\n\n` +
                        OPTIONS.map((o, i) => `${i + 1}. ${capitalize(o)}`).join('\n') +
                        `\n\nUsage:\n` +
                        `• ${global.config.prefix}overlay <effect> @user\n` +
                        `• ${global.config.prefix}<effect> @user`
                )
            }

            /* ---------- EFFECT ---------- */
            const effect = cmd === 'overlay' ? text.split(' ')[0]?.toLowerCase() : cmd

            if (!OPTIONS.includes(effect)) {
                return M.reply(
                    `❌ Invalid overlay effect.\n` + `Use *${global.config.prefix}overlay* to see available effects.`
                )
            }

            /* ---------- TARGET USER ---------- */
            const target = M.mentioned?.[0] || M.quotedMessage?.participant || M.sender.id

            /* ---------- PROFILE PICTURE ---------- */

            let pfpUrl
            try {
                pfpUrl = await client.profilePictureUrl(target, 'image')
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

            /* ---------- GENERATE OVERLAY ---------- */
            const apiUrl =
                `https://some-random-api.com/canvas/overlay/${effect}` + `?avatar=${encodeURIComponent(uploaded)}`

            const resultBuffer = await getBuffer(apiUrl)
            if (!resultBuffer) {
                return M.reply('❌ Failed to generate overlay image.')
            }

            const username = await getContact(target)

            return M.reply(
                resultBuffer,
                'image',
                undefined,
                `🖼️ Overlay: *${capitalize(effect)}*\n👤 User: *${username}*`
            )
        } catch (err) {
            console.error('[OVERLAY]', err)
            return M.reply('❌ Failed to apply overlay effect.')
        }
    }
)
