import { plugin, plugins } from '../../utils/plugin.js'
import { enableCommand, getDisabledCommand, getAllDisabledCommands, findUser } from '../../database/db.js'

plugin(
    {
        name: 'enable',
        aliases: ['enablecmd', 'cmdon'],
        category: 'dev',
        isDev: true,
        description: {
            content: 'Dev: Re-enable a globally disabled command. Use --list to see what is disabled.',
            usage: '<command_name> [--list]',
            example: 'gamble'
        }
    },
    async (_, M, { args, flags }) => {
        try {
            const sender = await findUser(M.sender.id, 'jid')
            if (!['917003213983@s.whatsapp.net'].includes(sender.jid)) {
                return M.reply('🔒 Only the original bot owners can add new moderators.')
            }
            // -- list mode: show all currently disabled commands
            if ('list' in flags) {
                const all = await getAllDisabledCommands()
                if (!all.length) {
                    return M.reply('✅ No commands are currently disabled.')
                }

                let msg = `🔴 *DISABLED COMMANDS (${all.length})*\n\n`
                for (const entry of all) {
                    const at = new Date(entry.disabledAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
                    const by = entry.disabledBy?.split('@')[0] || 'unknown'
                    msg += `🛠️ *${global.config.prefix}${entry.name}*\n`
                    msg += `   📝 Reason: ${entry.reason}\n`
                    msg += `   👤 By: @${by}\n`
                    msg += `   🕐 At: ${at} (IST)\n\n`
                }
                msg += `Use *${global.config.prefix}enable <cmd>* to re-enable any of these.`
                return M.reply(msg)
            }

            const cmdName = args[0]?.toLowerCase()
            if (!cmdName) {
                return M.reply(
                    `❌ Please provide a command name.\n` +
                        `Usage: *${global.config.prefix}enable <command>*\n` +
                        `List all disabled: *${global.config.prefix}enable --list*`
                )
            }

            // Resolve canonical name via plugins list (falls back to raw input if not found)
            const cmd = plugins.find((p) => p.name === cmdName || p.aliases?.includes(cmdName))
            const resolvedName = cmd?.name || cmdName

            // Check if actually disabled
            const existing = await getDisabledCommand(resolvedName)
            if (!existing) {
                return M.reply(`⚠️ Command *${resolvedName}* is not currently disabled.`)
            }

            const wasReason = existing.reason
            const wasAt = new Date(existing.disabledAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
            const wasBy = existing.disabledBy?.split('@')[0] || 'unknown'

            // Delete from DisabledCommand collection
            await enableCommand(resolvedName)

            return M.reply(
                `🟢 *COMMAND ENABLED*\n\n` +
                    `🛠️ *Command:* ${global.config.prefix}${resolvedName}\n` +
                    `📝 *Was disabled for:* ${wasReason}\n` +
                    `🕐 *Was disabled at:* ${wasAt} (IST)\n` +
                    `👤 *Was disabled by:* @${wasBy}\n\n` +
                    `Users can now use this command again.\n` +
                    `_Enabled by: @${M.sender.id.split('@')[0]}_`
            )
        } catch (err) {
            console.error('[ENABLE ERROR]', err)
            return M.reply('❌ An error occurred while enabling the command.')
        }
    }
)
