import { plugin } from '../../utils/plugin.js'
import { clearWarns, getContact } from '../../database/db.js'

plugin(
    {
        name: 'unwarn',
        aliases: ['delwarn', 'rmwarn'],
        category: 'group',
        isGroup: true,
        isAdmin: true,
        description: {
            content: 'Remove warnings from a user. Defaults to clearing temporary warns only.',
            usage: '<@user> <type_index>',
            example: '@user 2'
        }
    },
    async (_, M, { args }) => {
        try {
            const target =
                (M.mentioned?.[0] ?? (M.isQuoted ? M.quotedMessage?.participant : null)) &&
                !(
                    M.isQuoted &&
                    M.sender.id !== M.quotedMessage.participant &&
                    M.sender.jid !== M.quotedMessage.participant
                )
                    ? (M.mentioned?.[0] ?? M.quotedMessage?.participant)
                    : null
            if (!target) {
                return M.reply('❌ Please mention or reply to a user to remove their warnings.')
            }

            const typeId = parseInt(args.find((a) => !isNaN(a) && a.length === 1)) || null
            const name = await getContact(target)

            // Standard execution using your clearWarns function
            const success = await clearWarns(target, M.from, typeId)

            if (!success) {
                return M.reply(
                    `❌ Failed to remove warnings for *${name}*. They might not have any active warns in this group.`
                )
            }

            if (typeId) {
                return M.reply(`✅ *UNWARNED:* Specific Warning Type *${typeId}* has been removed from *${name}*.`)
            } else {
                return M.reply(
                    `✅ *CLEANUP:* All temporary warnings for *${name}* have been cleared. Permanent warnings remain.`
                )
            }
        } catch (err) {
            console.error('[UNWARN COMMAND ERROR]', err)
            return M.reply('❌ Internal error while executing the unwarn command.')
        }
    }
)
