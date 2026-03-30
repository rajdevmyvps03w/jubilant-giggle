import { plugin } from '../../utils/plugin.js'
import { isChatbotEnabled, setChatbotEnabled } from '../../database/db.js'

plugin(
    {
        name: 'chatbot',
        aliases: ['togglechat', 'toggleai'],
        category: 'dev',
        isDev: true,
        description: {
            content: 'Toggle the character.ai chatbot on or off.',
            usage: '<on | off>',
            example: 'off'
        }
    },
    async (_, M, { args }) => {
        try {
            const input = args[0]?.toLowerCase()

            // No arg → show current status
            if (!input) {
                const enabled = await isChatbotEnabled()
                return M.reply(
                    `🤖 *Chatbot Status*\n\n` +
                        `Current state: ${enabled ? '🟢 *ON*' : '🔴 *OFF*'}\n\n` +
                        `Use *${global.config.prefix}chatbot on* or *${global.config.prefix}chatbot off* to toggle.`
                )
            }

            if (input !== 'on' && input !== 'off') {
                return M.reply(
                    `❌ Invalid option. Use *${global.config.prefix}chatbot on* or *${global.config.prefix}chatbot off*.`
                )
            }

            const enable = input === 'on'
            const current = await isChatbotEnabled()

            if (current === enable) {
                return M.reply(`⚠️ Chatbot is already *${enable ? 'ON' : 'OFF'}*.`)
            }

            await setChatbotEnabled(enable)

            return M.reply(
                enable
                    ? `✅ *Chatbot Enabled*\n\nThe AI will now respond to @mentions.`
                    : `🔴 *Chatbot Disabled*\n\nThe AI will not respond until turned back on.`
            )
        } catch (err) {
            console.error('[CHATBOT TOGGLE ERROR]', err)
            return M.reply('❌ An error occurred while toggling the chatbot.')
        }
    }
)
