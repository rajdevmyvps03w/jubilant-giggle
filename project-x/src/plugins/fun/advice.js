import { plugin } from '../../utils/plugin.js'
import { fetch } from '../../functions/helpler.js'

plugin(
    {
        name: 'advice',
        aliases: ['adv'],
        category: 'fun',
        description: {
            content: 'Get a random piece of advice.'
        }
    },
    async (_, M) => {
        try {
            const data = await fetch('https://api.adviceslip.com/advice')

            const advice = data?.slip?.advice
            if (!advice) {
                return M.reply('❌ Failed to fetch advice. Try again later.')
            }

            return M.reply(`💡 *Advice for you:*\n_${advice}_`)
        } catch (err) {
            console.error('[ADVICE COMMAND ERROR]', err)
            return M.reply('❌ Error while fetching advice.')
        }
    }
)
