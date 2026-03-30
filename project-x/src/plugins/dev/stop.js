import { plugin } from '../../utils/plugin.js'
import { setActiveBotState } from '../../database/db.js'

plugin(
    {
        name: 'stop',
        aliases: ['botoff', 'silencebot'],
        category: 'misc',
        isGroup: true,
        isAdmin: true,
        description: {
            content: 'Stop all bots from responding in this group until -alive is used again.'
        }
    },
    async (_, M) => {
        try {
            await setActiveBotState(M.from, 'none')

            return M.reply(
                `🔇 *All bots have been stopped in this group.*\n\n` +
                    `No bot will respond to any command until you use:\n` +
                    `*${global.config.prefix}alive <bot name>*`
            )
        } catch (err) {
            console.error('[STOP ERROR]', err)
            return M.reply('❌ An error occurred.')
        }
    }
)
