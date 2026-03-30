import { plugin } from '../../utils/plugin.js'
import { fetch } from '../../functions/helpler.js'

plugin(
    {
        name: 'joke',
        aliases: ['randomjoke'],
        category: 'fun',
        description: {
            content: 'Get a random joke.'
        }
    },
    async (_, M) => {
        try {
            const data = await fetch('https://api.popcat.xyz/v2/joke')

            if (data?.error || !data?.message?.joke) {
                return M.reply('❌ Failed to fetch a joke. Try again later.')
            }

            const msg = `😂 *Random Joke*\n\n` + `${data.message.joke}`

            return M.reply(msg)
        } catch (err) {
            console.error('[JOKE]', err)
            return M.reply('❌ Could not get a joke.')
        }
    }
)
