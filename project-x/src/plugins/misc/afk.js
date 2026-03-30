import { plugin } from '../../utils/plugin.js'
import { setAfk, clearAfk } from '../../database/db.js'

plugin(
    {
        name: 'afk',
        aliases: ['away', 'brb'],
        category: 'misc',
        isGroup: true,
        description: {
            content:
                'Set yourself as AFK. The bot will auto-notify anyone who mentions you, and auto-clear when you send your next message.',
            usage: '<reason>',
            example: 'sleeping\nafk brb in 10 mins'
        }
    },
    async (_, M, { text }) => {
        // If user already going AFK, allow updating the reason
        const reason = text.trim() || 'Away from keyboard'

        const ok = await setAfk(M.sender.id, reason)
        if (!ok) {
            return M.reply('❌ Failed to set AFK status. Please try again.')
        }

        return M.reply(
            `💤 *You are now AFK*\n\n` +
                `📝 *Reason:* ${reason}\n\n` +
                `_I'll let people know if they mention you. Your status will clear automatically when you next send a message._`
        )
    }
)
