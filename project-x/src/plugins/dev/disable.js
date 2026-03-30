import { plugin, plugins } from '../../utils/plugin.js'
import { disableCommand, getDisabledCommand, getAllDisabledCommands, findUser } from '../../database/db.js'

plugin(
    {
        name: 'disable',
        aliases: ['disablecmd', 'cmdoff'],
        category: 'dev',
        isDev: true,
        description: {
            content: 'Dev: Globally disable a command. Use --list to see all disabled commands.',
            usage: '<command_name> <reason> [--list]',
            example: 'gamble Under maintenance'
        }
    },
    async (_, M, { args, text, flags }) => {
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
                msg += `Use *${global.config.prefix}enable <cmd>* to re-enable.`
                return M.reply(msg)
            }

            // Normal disable mode
            const cmdName = args[0]?.toLowerCase()
            if (!cmdName) {
                return M.reply(
                    `❌ Please provide a command name.\n` +
                        `Usage: *${global.config.prefix}disable <command> <reason>*\n` +
                        `List all disabled: *${global.config.prefix}disable --list*`
                )
            }

            // Verify the command actually exists in loaded plugins
            const cmd = plugins.find((p) => p.name === cmdName || p.aliases?.includes(cmdName))
            if (!cmd) {
                return M.reply(`❌ Command *${cmdName}* not found. Check the name and try again.`)
            }

            const reason = text.replace(cmdName, '').trim() || 'Disabled by developer.'

            // Check if already disabled
            const existing = await getDisabledCommand(cmd.name)
            if (existing) {
                const at = new Date(existing.disabledAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
                return M.reply(
                    `⚠️ *${cmd.name}* is already disabled.\n\n` +
                        `📝 *Reason:* ${existing.reason}\n` +
                        `🕐 *Since:* ${at} (IST)\n\n` +
                        `Use *${global.config.prefix}enable ${cmd.name}* to re-enable it first.`
                )
            }

            // Save to DisabledCommand collection
            await disableCommand(cmd.name, reason, M.sender.id)

            const disabledAtStr = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })

            return M.reply(
                `🔴 *COMMAND DISABLED*\n\n` +
                    `🛠️ *Command:* ${global.config.prefix}${cmd.name}\n` +
                    `🔗 *Aliases:* ${cmd.aliases?.length ? cmd.aliases.map((a) => `${global.config.prefix}${a}`).join(', ') : 'None'}\n` +
                    `📝 *Reason:* ${reason}\n` +
                    `🕐 *Disabled At:* ${disabledAtStr} (IST)\n\n` +
                    `Users will see the reason when they try to use this command.\n` +
                    `_Disabled by: @${M.sender.id.split('@')[0]}_`
            )
        } catch (err) {
            console.error('[DISABLE ERROR]', err)
            return M.reply('❌ An error occurred while disabling the command.')
        }
    }
)
