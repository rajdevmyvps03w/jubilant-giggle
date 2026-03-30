import { plugin } from '../../utils/plugin.js'
import { findUser, editUser } from '../../database/db.js'

plugin(
    {
        name: 'unban',
        aliases: ['botunban', 'unglobalban'],
        category: 'dev',
        isDev: true,
        description: {
            content: 'Dev: Lift the global bot ban from a user.',
            usage: '<@user | reply>',
            example: '@917003213983'
        }
    },
    async (_, M) => {
        try {
            // 1. Resolve target user
            let targetJid = M.mentioned?.[0] || (M.isQuoted ? M.quotedMessage?.participant : null)
            if (!targetJid) {
                return M.reply('❌ Please mention or reply to the user you want to unban.')
            }

            // 2. Check target is registered
            const targetUser = await findUser(targetJid, 'name ban')
            if (!targetUser) {
                return M.reply('❌ That user is not registered in the bot.')
            }

            if (targetUser.ban?.status !== true) {
                return M.reply(`⚠️ *${targetUser.name}* is not currently banned.`)
            }

            const oldReason = targetUser.ban.reason
            const oldBannedAt = targetUser.ban.dateOfLogin
                ? new Date(targetUser.ban.dateOfLogin).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
                : 'Unknown'

            // 3. Lift ban
            await editUser(targetJid, {
                'ban.status': false,
                'ban.reason': '',
                'ban.dateOfLogin': 0
            })

            return M.reply(
                `✅ *BAN LIFTED*\n\n` +
                    `👤 *User:* ${targetUser.name}\n` +
                    `🆔 *JID:* ${targetJid.split('@')[0]}\n` +
                    `📝 *Was banned for:* ${oldReason}\n` +
                    `🕐 *Was banned at:* ${oldBannedAt} (IST)\n\n` +
                    `This user can now use the bot again.\n` +
                    `_Unbanned by: @${M.sender.id.split('@')[0]}_`
            )
        } catch (err) {
            console.error('[UNBAN ERROR]', err)
            return M.reply('❌ An error occurred while unbanning the user.')
        }
    }
)
