import { plugin } from '../../utils/plugin.js'
import { resetCommandCooldown } from '../../database/db.js'

plugin(
    {
        name: 'resetcooldown',
        aliases: ['rcd', 'resetcd'],
        category: 'group',
        isGroup: true,
        isAdmin: true,
        description: {
            content: 'Reset a command cooldown to the global default.',
            usage: '<command>',
            example: 'slots'
        }
    },
    async (_, M, { args }) => {
        const cmdName = args[0]?.toLowerCase()
        if (!cmdName) {
            return M.reply('❌ Which command should I reset?')
        }

        const success = await resetCommandCooldown(M.from, cmdName)

        if (success) {
            return M.reply(
                `🔄 *COOLDOWN RESET*\n\n` +
                    `👤 *Command:* ${cmdName}\n` +
                    `🌐 *Status:* Reverted to global group default.`
            )
        } else {
            return M.reply(`ℹ️ *${cmdName}* does not have a custom cooldown set.`)
        }
    }
)
