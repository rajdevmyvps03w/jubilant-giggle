import { plugin } from '../../utils/plugin.js'
// Updated to your new database path
import { findGroup, editGroup } from '../../database/db.js'

plugin(
    {
        name: 'notagme',
        aliases: ['anitag'],
        category: 'group',
        isGroup: true,
        isBotAdmin: true,
        description: {
            content: 'Toggle anti-tag protection so nobody can mention you in the group.'
        }
    },
    async (_, M) => {
        try {
            const group = await findGroup(M.from)
            if (group.anitag.includes(M.sender.id)) {
                const updatedList = group.anitag.filter((id) => id !== M.sender.id)

                await editGroup(M.from, { anitag: updatedList })

                return M.reply('🔓 Anti-tag disabled.\nMembers can mention you again.')
            }

            const updatedList = [...group.anitag, M.sender.id]
            await editGroup(M.from, { anitag: updatedList })

            return M.reply('🛡️ Anti-tag enabled.\nNobody can mention you now.')
        } catch (err) {
            console.error('[ANITAG ERROR]', err)
            return M.reply('❌ Failed to toggle anti-tag protection.')
        }
    }
)
