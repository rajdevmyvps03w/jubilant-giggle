import { plugin } from '../../utils/plugin.js'
import { fetch } from '../../functions/helpler.js'

plugin(
    {
        name: 'showerthoughts',
        aliases: ['thought', 'shower'],
        category: 'fun',
        description: {
            content: 'Get a random shower thought.'
        }
    },
    async (_, M) => {
        try {
            const data = await fetch('https://api.popcat.xyz/v2/showerthoughts')

            if (data?.error || !data?.message?.result) {
                return M.reply('❌ Failed to fetch a shower thought. Try again later.')
            }

            const msg =
                `🚿 *Shower Thought*\n\n` +
                `${data.message.result}\n\n` +
                `👤 Author: ${data.message.author || 'Unknown'}\n` +
                `👍 Upvotes: ${data.message.upvotes ?? 0}`

            return M.reply(msg)
        } catch (err) {
            console.error('[SHOWERTHOUGHTS]', err)
            return M.reply('❌ Could not get a shower thought.')
        }
    }
)
