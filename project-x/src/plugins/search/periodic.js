import { plugin } from '../../utils/plugin.js'
import { fetch, getBuffer } from '../../functions/helpler.js'

plugin(
    {
        name: 'periodic',
        aliases: ['element', 'ptable'],
        category: 'search',
        description: {
            content: 'Search information about a chemical element from the periodic table.',
            usage: '<element_name>',
            example: 'bohrium'
        }
    },
    async (_, M, { text }) => {
        if (!text) {
            return M.reply(`❌ Please provide an element name.\n\nExample: ${global.config.prefix}periodic hydrogen`)
        }

        try {
            const data = await fetch(`https://api.popcat.xyz/v2/periodic-table?element=${encodeURIComponent(text)}`)

            if (data?.error || !data?.message) {
                return M.reply(`❌ No element found for *${text}*.`)
            }

            const el = data.message

            const message = [
                `🧪 *${el.name} (${el.symbol})*`,
                '',
                `🔢 *Atomic Number:* ${el.atomic_number}`,
                `⚖️ *Atomic Mass:* ${el.atomic_mass}`,
                `📍 *Period:* ${el.period}`,
                `🧊 *Phase:* ${el.phase}`,
                `🔬 *Discovered By:* ${el.discovered_by || 'Unknown'}`,
                '',
                `📖 *Summary:*`,
                el.summary || 'No description available.'
            ].join('\n')

            /* ---------- Try sending image ---------- */
            try {
                if (el.image) {
                    const buffer = await getBuffer(el.image)
                    return M.reply(buffer, 'image', undefined, message)
                }
            } catch {}

            return M.reply(message)
        } catch (err) {
            console.error('[PERIODIC]', err)
            return M.reply('❌ Failed to fetch element data. Try again later.')
        }
    }
)
