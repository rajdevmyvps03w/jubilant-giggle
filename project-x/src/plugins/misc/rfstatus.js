import { plugin } from '../../utils/plugin.js'
import { randomString } from '../../functions/helpler.js'
// Updated to your new MongoDB database path
import { findUser, editUser } from '../../database/db.js'

plugin(
    {
        name: 'rf',
        aliases: ['relationflag', 'setrf'],
        category: 'misc',
        isGroup: true,
        description: {
            usage: '<on | off>',
            content: 'Enable or disable the RF (Relationship) flag for your account.',
            example: 'on'
        }
    },
    async (_, M, { args }) => {
        try {
            /* ---------- REGISTRATION CHECK ---------- */
            const user = await findUser(M.sender.id)

            if (!args[0]) {
                return M.reply(
                    `⚙️ Current Status: *${user.rf ? 'ENABLED' : 'DISABLED'}*\nUse: *${global.config.prefix}rf on* or *off*`
                )
            }

            /* ---------- RELATIONSHIP CHECK ---------- */
            if (user.relationship?.status) {
                return M.reply(
                    '💔 You are already in a relationship! You cannot enable the RF flag until you are single.'
                )
            }

            const option = args[0].toLowerCase()
            if (option !== 'on' && option !== 'off') {
                return M.reply('❌ Invalid option. Use *on* to enable or *off* to disable.')
            }

            const newStatus = option === 'on'
            if (user.rf === newStatus) {
                return M.reply(`⚠️ Your RF flag is already *${newStatus ? 'enabled' : 'disabled'}*.`)
            }

            /* ---------- UPDATE LOGIC ---------- */
            const updates = { rf: newStatus }

            // Only generate/refresh a code if they are turning it ON
            if (newStatus) {
                updates.rfcode = randomString(12)
            }

            const success = await editUser(M.sender.id, updates)
            if (!success) {
                return M.reply('❌ Failed to update your status. Please try again later.')
            }

            let response = `✅ The RF flag has been *${newStatus ? 'enabled' : 'disabled'}* successfully.`
            if (newStatus) {
                response += `\n🔑 Your RF Code: *${updates.rfcode}*\n_Others can use this code to send you requests!_`
            }

            return M.reply(response)
        } catch (err) {
            console.error('[RF TOGGLE ERROR]', err)
            return M.reply('❌ An error occurred while updating your RF status.')
        }
    }
)
