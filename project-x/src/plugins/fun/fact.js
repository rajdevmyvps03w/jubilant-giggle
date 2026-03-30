import { plugin } from '../../utils/plugin.js'
import { fetch } from '../../functions/helpler.js'

plugin(
    {
        name: 'fact',
        aliases: ['randomfact'],
        category: 'fun',
        description: {
            content: 'Get a random interesting fact.'
        }
    },
    async (_, M) => {
        try {
            const data = await fetch('https://api.popcat.xyz/v2/fact')

            if (data?.error || !data?.message?.fact) {
                return M.reply('❌ Failed to fetch a fact. Try again later.')
            }

            const msg = `📚 *Random Fact*\n\n` + `${data.message.fact}`

            return M.reply(msg)
        } catch (err) {
            console.error('[FACT]', err)
            return M.reply('❌ Could not get a fact.')
        }
    }
)
