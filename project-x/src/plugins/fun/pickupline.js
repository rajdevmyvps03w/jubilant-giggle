import { plugin } from '../../utils/plugin.js'
import { fetch } from '../../functions/helpler.js'

plugin(
    {
        name: 'pickupline',
        aliases: ['pickup', 'pline'],
        category: 'fun',
        description: {
            content: 'Get a random romantic pickup line.'
        }
    },
    async (_, M) => {
        try {
            const data = await fetch('https://api.popcat.xyz/v2/pickuplines')

            if (data?.error || !data?.message?.pickupline) {
                return M.reply('❌ Failed to fetch a pickup line. Try again later.')
            }

            const line = data.message.pickupline
            const contributor = data.message.contributor || 'Unknown'

            const msg = `💘 *Pickup Line*\n\n` + `${line}\n\n` + `📝 Contributor: ${contributor}`

            return M.reply(msg)
        } catch (err) {
            console.error('[PICKUPLINE]', err)
            return M.reply('❌ Could not get a pickup line.')
        }
    }
)
