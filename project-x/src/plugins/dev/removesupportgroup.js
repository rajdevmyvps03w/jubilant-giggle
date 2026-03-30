import { plugin } from '../../utils/plugin.js'
import { removeSupportGroup } from '../../database/db.js'

plugin(
    {
        name: 'removesupportgroup',
        aliases: ['removesupport', 'removesg'],
        category: 'dev',
        isDev: true,
        isGroup: true,
        description: {
            content: 'Unregister the current group as a support group. Run this command inside the group.'
        }
    },
    async (_, M) => {
        try {
            const jid = M.from
            const prefix = global.config.prefix

            // Check if this group is even registered
            const exists = global.config.supportGroups?.find((g) => g.jid === jid)
            if (!exists) {
                return M.reply(
                    `❌ This group is not registered as a support group.\n\n` +
                        `Use *${prefix}listsupportgroups* to see all registered groups.`
                )
            }

            const success = await removeSupportGroup(jid)

            if (!success) {
                return M.reply('❌ Failed to remove the group. Please try again.')
            }

            return M.reply(
                `✅ *Support Group Removed*\n\n` +
                    `🏷️ *Label:* ${exists.label}\n` +
                    `🗂️ *Category:* ${exists.category}\n` +
                    `🆔 *JID:* ${jid}\n\n` +
                    `_This group will no longer be listed in ${prefix}support._`
            )
        } catch (err) {
            console.error('[REMOVESUPPORTGROUP ERROR]', err)
            return M.reply('❌ An error occurred while removing the support group.')
        }
    }
)
