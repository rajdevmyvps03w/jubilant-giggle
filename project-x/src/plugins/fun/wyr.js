import { plugin } from '../../utils/plugin.js'
import { fetch } from '../../functions/helpler.js'

plugin(
    {
        name: 'wyr',
        aliases: ['wouldyourather'],
        category: 'fun',
        description: {
            content: 'Get a random "Would You Rather" question.'
        }
    },
    async (_, M) => {
        try {
            const data = await fetch('https://api.popcat.xyz/v2/wyr')

            if (data?.error || !data?.message?.ops1 || !data?.message?.ops2) {
                return M.reply('❌ Failed to fetch a question. Try again later.')
            }

            const { ops1, ops2 } = data.message

            const msg = `🤔 *Would You Rather*\n\n` + `1️⃣ ${ops1}\n\n` + `2️⃣ ${ops2}`

            return M.reply(msg)
        } catch (err) {
            console.error('[WYR]', err)
            return M.reply('❌ Could not get a question.')
        }
    }
)
