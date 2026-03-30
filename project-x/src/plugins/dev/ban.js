import { plugin } from '../../utils/plugin.js'
import { findUser, editUser } from '../../database/db.js'

plugin(
    {
        name: 'ban',
        aliases: ['botban', 'globalban'],
        category: 'dev',
        isDev: true,
        description: {
            content: 'Dev: Globally ban a user from using the bot. Provide a reason.',
            usage: '<@user | reply> <reason>',
            example: '@917003213983 Exploiting bot economy'
        }
    },
    async (_, M, { text }) => {
        try {
            // 1. Resolve target user
            let targetJid = M.mentioned?.[0] || (M.isQuoted ? M.quotedMessage?.participant : null)
            if (!targetJid) {
                return M.reply('❌ Please mention or reply to the user you want to ban.')
            }

            // 2. Prevent banning another dev/mod
            if (global.config.mods.includes(targetJid)) {
                return M.reply('🔒 You cannot ban another bot developer/mod.')
            }

            // 3. Parse reason
            const reason = text.replace(/@\d+/g, '').trim() || 'No reason provided.'

            // 4. Check target is registered
            const targetUser = await findUser(targetJid, 'name ban')
            if (!targetUser) {
                return M.reply('❌ That user is not registered in the bot.')
            }

            if (targetUser.ban?.status === true) {
                const bannedAt = targetUser.ban.dateOfLogin
                    ? new Date(targetUser.ban.dateOfLogin).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
                    : 'Unknown'
                return M.reply(
                    `⚠️ *Already Banned*\n\n` +
                        `👤 *User:* ${targetUser.name}\n` +
                        `📝 *Reason:* ${targetUser.ban.reason}\n` +
                        `🕐 *Banned At:* ${bannedAt}\n\n` +
                        `Use *${global.config.prefix}unban* to lift the ban.`
                )
            }

            // 5. Apply ban
            const bannedAt = Date.now()
            await editUser(targetJid, {
                'ban.status': true,
                'ban.reason': reason,
                'ban.dateOfLogin': bannedAt
            })

            const bannedAtStr = new Date(bannedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })

            return M.reply(
                `🚫 *USER BANNED*\n\n` +
                    `👤 *User:* ${targetUser.name}\n` +
                    `🆔 *JID:* ${targetJid.split('@')[0]}\n` +
                    `📝 *Reason:* ${reason}\n` +
                    `🕐 *Banned At:* ${bannedAtStr} (IST)\n\n` +
                    `This user will be blocked from all bot commands.\n` +
                    `_Banned by: @${M.sender.id.split('@')[0]}_`
            )
        } catch (err) {
            console.error('[BAN ERROR]', err)
            return M.reply('❌ An error occurred while banning the user.')
        }
    }
)
