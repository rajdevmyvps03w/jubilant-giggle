import { plugin } from '../../utils/plugin.js'
import { getContact } from '../../database/db.js'

plugin(
    {
        name: 'mods',
        aliases: ['staff', 'ownerlist'],
        category: 'misc',
        description: {
            content: 'Displays the list of global bot administrators and moderators.'
        }
    },
    async (_, M) => {
        try {
            // Fetching the list from your global config
            const staffJids = global.config.mods || []

            if (staffJids.length === 0) {
                return M.reply('ℹ️ No global staff members are currently configured.')
            }

            let text = `👑 *GLOBAL STAFF REGISTRY* 👑\n\n`
            text += `Total Staff: ${staffJids.length}\n\n`

            for (let i = 0; i < staffJids.length; i++) {
                const jid = staffJids[i]
                const name = await getContact(jid)
                const number = jid.split('@')[0]

                text += `${i + 1}. *${name || 'Staff Member'}*\n   └ 📱 wa.me/${number}\n`
            }

            text += `\n\n`
            text += `Note: These users have global access to bot maintenance commands.`

            return M.reply(text)
        } catch (err) {
            console.error('[STAFF COMMAND ERROR]', err)
            return M.reply('❌ Failed to retrieve the staff list.')
        }
    }
)
