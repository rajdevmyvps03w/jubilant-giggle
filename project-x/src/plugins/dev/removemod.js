import { plugin } from '../../utils/plugin.js'
import { findUser, removeMod, getDynamicMods } from '../../database/db.js'

plugin(
    {
        name: 'removemod',
        aliases: ['removemoderator', 'modremove', 'demod'],
        category: 'dev',
        isDev: true,
        description: {
            content:
                'Dev: Remove a global bot moderator. Only hardcoded owners can use this. Use --list to see current mods.',
            usage: '<@user | reply> [--list]',
            example: '@919876543210'
        }
    },
    async (_, M, { flags }) => {
        try {
            // Only hardcoded owners can remove mods — resolve sender jid from DB
            const sender = await findUser(M.sender.id, 'jid')
            if (!['917003213983@s.whatsapp.net'].includes(sender.jid)) {
                return M.reply('🔒 Only the original bot owners can remove moderators.')
            }

            // --list: show all dynamic mods
            if ('list' in flags) {
                const dynamicMods = await getDynamicMods()

                if (dynamicMods.length === 0) {
                    return M.reply(
                        `ℹ️ *No dynamic moderators.*\n\n` +
                            `The only active moderators are the hardcoded owners in config.js.\n` +
                            `These cannot be removed via commands.`
                    )
                }

                let msg = `🛡️ *DYNAMIC MODERATORS (${dynamicMods.length})*\n\n`
                for (const [i, mod] of dynamicMods.entries()) {
                    const at = new Date(mod.addedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
                    const by = mod.addedBy?.split('@')[0] || 'unknown'
                    msg += `${i + 1}. 🆔 ${mod.jid.split('@')[0]}\n`
                    msg += `   👑 Added by: ${by}\n`
                    msg += `   🕐 At: ${at} (IST)\n\n`
                }
                msg += `_Use *${global.config.prefix}removemod @user* to remove any of these._`
                return M.reply(msg)
            }

            // Resolve target
            const targetJid = M.mentioned?.[0] || (M.isQuoted ? M.quotedMessage?.participant : null)
            if (!targetJid) {
                return M.reply(
                    `❌ Please mention or reply to the moderator you want to remove.\n\n` +
                        `View current mods: *${global.config.prefix}removemod --list*`
                )
            }

            // Target must be registered — use their stored jid from DB
            const targetUser = await findUser(targetJid, 'name jid')
            if (!targetUser) {
                return M.reply('❌ That user is not registered in the bot.')
            }

            const resolvedJid = targetUser.jid || targetJid

            // Block removing a hardcoded owner
            if (global.config.hardcodedMods?.includes(resolvedJid)) {
                return M.reply(
                    `🔒 *${targetUser.name}* is a hardcoded owner and cannot be removed via this command.\n` +
                        `Edit *config.js* directly to change the owner list.`
                )
            }

            // Check they are actually a mod
            if (!global.config.mods.includes(resolvedJid)) {
                return M.reply(`⚠️ *${targetUser.name}* is not a bot moderator.`)
            }

            // Remove from DB + sync global.config.mods live
            const result = await removeMod(resolvedJid, ['917003213983@s.whatsapp.net'])

            if (!result.ok) {
                if (result.error === 'IS_OWNER') {
                    return M.reply(`🔒 *${targetUser.name}* is a hardcoded owner and cannot be removed.`)
                }
                if (result.error === 'NOT_FOUND') {
                    return M.reply(`⚠️ *${targetUser.name}* was not found in the dynamic moderators list.`)
                }
                return M.reply('❌ An error occurred while removing the moderator. Try again.')
            }

            const removedAtStr = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })

            return M.reply(
                `✅ *MODERATOR REMOVED*\n\n` +
                    `👤 *Name:* ${targetUser.name}\n` +
                    `🆔 *JID:* ${resolvedJid.split('@')[0]}\n` +
                    `🕐 *Removed At:* ${removedAtStr} (IST)\n` +
                    `👑 *Removed By:* ${M.sender.name}\n\n` +
                    `This user no longer has moderator access.`
            )
        } catch (err) {
            console.error('[REMOVEMOD ERROR]', err)
            return M.reply('❌ An error occurred while removing the moderator.')
        }
    }
)
