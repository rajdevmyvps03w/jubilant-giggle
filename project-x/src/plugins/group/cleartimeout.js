import { plugin } from '../../utils/plugin.js'
import { clearTimeoutUser, getContact, saveState, isUserTimedOut } from '../../database/db.js'

plugin(
    {
        name: 'cleartimeout',
        aliases: ['untimeout', 'untm'],
        category: 'group',
        isGroup: true,
        isAdmin: true,
        description: {
            content: 'Lift a timeout from a user immediately.',
            usage: '<@user | reply>',
            example: '@user'
        }
    },
    async (_, M) => {
        const target =
            (M.mentioned?.[0] ?? (M.isQuoted ? M.quotedMessage?.participant : null)) &&
            !(M.isQuoted && M.sender.id !== M.quotedMessage.participant && M.sender.jid !== M.quotedMessage.participant)
                ? (M.mentioned?.[0] ?? M.quotedMessage?.participant)
                : null
        if (!target) {
            return M.reply('❌ Please mention or reply to the user you want to pardon.')
        }

        const timeoutData = await isUserTimedOut(target, M.from)
        const name = await getContact(target)

        if (!timeoutData) {
            return M.reply(`ℹ️ There is no active timeout on *${name}*.`)
        }

        const success = await clearTimeoutUser(target, M.from)

        if (success) {
            // 💡 CRITICAL: Clear the notification lock so they can use commands right away
            await saveState(`timeout_notified:${target}`, null)

            return M.reply(
                `✅ *TIMEOUT LIFTED*\n\n` +
                    `👤 *User:* ${name}\n` +
                    `🛡️ *Status:* Access restored. The user can now use commands again.`
            )
        } else {
            return M.reply(`❌ *${name}* is not currently in timeout or an error occurred.`)
        }
    }
)
