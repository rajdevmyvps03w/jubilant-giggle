import { plugin } from '../../utils/plugin.js'
import { findUser, addMod } from '../../database/db.js'

plugin(
    {
        name: 'addmod',
        aliases: ['addmoderator', 'modadd'],
        category: 'dev',
        isDev: true,
        description: {
            content: 'Dev: Add a new global bot moderator. Only hardcoded owners can use this.',
            usage: '<@user | reply>',
            example: '@919876543210'
        }
    },
    async (_, M) => {
        try {
            // Only hardcoded owners can add mods — use M.sender.id (jid) via findUser
            const sender = await findUser(M.sender.id, 'jid')
            if (!['917003213983@s.whatsapp.net'].includes(sender.jid)) {
                return M.reply('🔒 Only the original bot owners can add new moderators.')
            }

            // Resolve target
            const targetJid = M.mentioned?.[0] || (M.isQuoted ? M.quotedMessage?.participant : null)
            if (!targetJid) {
                return M.reply('❌ Please mention or reply to the user you want to make a moderator.')
            }

            if (targetJid === M.sender.id || targetJid === M.sender.jid) {
                return M.reply('❌ You are already a moderator.')
            }

            // Target must be a registered user — use their stored jid from DB
            const targetUser = await findUser(targetJid, 'name jid')
            if (!targetUser) {
                return M.reply('❌ That user is not registered in the bot.')
            }

            const resolvedJid = targetUser.jid || targetJid

            // Check not already a mod
            if (global.config.mods.includes(resolvedJid)) {
                return M.reply(`⚠️ ${targetUser.name} is already a bot moderator.`)
            }

            // Save to DB + sync into global.config.mods live
            const result = await addMod(resolvedJid, M.sender.id)

            if (!result.ok) {
                if (result.error === 'ALREADY_MOD') {
                    return M.reply(`⚠️ ${targetUser.name} is already a moderator.`)
                }
                return M.reply('❌ An error occurred while adding the moderator. Try again.')
            }

            const addedAtStr = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })

            return M.reply(
                `✅ *MODERATOR ADDED*\n\n` +
                    `👤 *Name:* ${targetUser.name}\n` +
                    `🆔 *JID:* ${resolvedJid.split('@')[0]}\n` +
                    `🕐 *Added At:* ${addedAtStr} (IST)\n` +
                    `👑 *Added By:* ${M.sender.name}\n\n` +
                    `This user now has access to all dev/mod commands.\n\n` +
                    `_Use *${global.config.prefix}removemod @user* to revoke._`
            )
        } catch (err) {
            console.error('[ADDMOD ERROR]', err)
            return M.reply('❌ An error occurred while adding the moderator.')
        }
    }
)
