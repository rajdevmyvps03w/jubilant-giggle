import { plugin } from '../../utils/plugin.js'
import { getBuffer, fetch } from '../../functions/helpler.js'

const options = ['bird', 'cat', 'dog', 'fox', 'koala', 'panda']

plugin(
    {
        name: 'animal',
        aliases: options,
        category: 'fun',
        description: {
            content: 'Get random animal facts and images.'
        }
    },
    async (_, M, { cmd }) => {
        try {
            if (cmd === 'animal') {
                const list =
                    `🐾 *Available Animal Facts:*\n\n` +
                    options.map((o) => `- ${o.charAt(0).toUpperCase() + o.slice(1)}`).join('\n') +
                    `\n\n🛠️ *Usage:* ${global.config.prefix}<animal>\n` +
                    `Example: ${global.config.prefix}cat`

                return M.reply(list)
            }

            if (!options.includes(cmd)) {
                return M.reply('❌ Not a valid animal option.')
            }

            const [fact, img] = await Promise.all([
                fetch(`https://some-random-api.com/facts/${cmd}`),
                fetch(`https://some-random-api.com/img/${cmd}`)
            ])

            if (!fact?.fact || !img?.link) {
                return M.reply('❌ Failed to fetch animal data.')
            }

            const buffer = await getBuffer(img.link, true)

            // ---------- SEND ----------
            return M.replyRaw({
                image: buffer,
                caption: `*_${fact.fact}_*`
            })
        } catch (err) {
            console.error('[ANIMAL cmd ERROR]', err)
            return M.reply('❌ Error while fetching animal fact.')
        }
    }
)
