import { plugin } from '../../utils/plugin.js'
import { randomString } from '../../functions/helpler.js'
// Using your state management and registration checks
import { isRegUser, saveState } from '../../database/db.js'

plugin(
    {
        name: 'getreg',
        aliases: ['regcode'],
        isGroup: true,
        category: 'misc',
        description: {
            content: 'Get a registration code to begin the registration process.'
        }
    },
    async (_, M) => {
        try {
            /* ---------- ALREADY REGISTERED CHECK ---------- */
            const registered = await isRegUser(M.sender.id)
            if (registered) {
                return M.reply(
                    `❌ You are already registered. Use *${global.config.prefix}editreg* to update your profile.`
                )
            }

            const code = randomString(12)

            const registrationState = {
                jid: M.sender.jid,
                name: M.sender.name,
                id: M.sender.id,
                createdAt: Date.now()
            }

            await saveState(`reg:${code}`, registrationState, 300000)

            return M.reply(
                `✅ *Registration Code Generated*\n\n` +
                    `👤 User: ${M.sender.name}\n` +
                    `🔑 Code: *${code}*\n\n` +
                    `*Use the following command to finish:* \n` +
                    `> ${global.config.prefix}register ${code} <name> <age> <gender>\n\n` +
                    `*Example:*\n` +
                    `${global.config.prefix}register ${code} Debanjan 19 male\n\n` +
                    `⚠️ _This code will expire in 5 minutes._`
            )
        } catch (err) {
            console.error('[GETREG ERROR]', err)
            return M.reply('❌ Failed to generate a registration code. Please try again.')
        }
    }
)
