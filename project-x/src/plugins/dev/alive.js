import { plugin } from '../../utils/plugin.js'
import { setActiveBotState } from '../../database/db.js'

plugin(
    {
        name: 'alive',
        aliases: ['activate', 'botswitch'],
        category: 'misc',
        isGroup: true,
        isAdmin: true,
        description: {
            content: 'Activate a specific bot in this group. All other bots will go silent.',
            usage: '<bot label or id>',
            example: 'bot1'
        }
    },
    async (client, M, { args }) => {
        try {
            const sessions = global.config.sessions
            if (!sessions?.length) return M.reply('❌ No sessions configured.')

            let targetSession = null

            if (!args[0]) {
                targetSession = sessions.find((s) => s.id === client._sessionId)
            } else {
                const input = args[0].toLowerCase()
                targetSession = sessions.find((s) => s.id.toLowerCase() === input || s.label.toLowerCase() === input)
            }

            if (!targetSession) {
                const list = sessions.map((s) => `• *${s.label}* (\`${s.id}\`)`).join('\n')
                return M.reply(
                    `❌ *Bot not found.*\n\nAvailable bots:\n${list}\n\n` +
                        `Usage: *${global.config.prefix}alive <bot id or label>*`
                )
            }

            await setActiveBotState(M.from, targetSession.id)

            return M.reply(
                `✅ *${targetSession.label}* is now the active bot in this group!\n\n` +
                    `All other bots will stay silent until you switch.\n\n` +
                    `🔇 To stop all bots: *${global.config.prefix}stop*\n` +
                    `🔄 To switch bots: *${global.config.prefix}alive <bot name>*`
            )
        } catch (err) {
            console.error('[ALIVE ERROR]', err)
            return M.reply('❌ An error occurred.')
        }
    }
)
