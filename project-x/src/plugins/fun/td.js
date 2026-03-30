import { plugin } from '../../utils/plugin.js'
import { get_truth, get_dare } from 'better-tord'
import { getRandomInt } from '../../functions/helpler.js'

const options = ['truth', 'dare']

plugin(
    {
        name: 'td',
        aliases: [...options],
        category: 'fun',
        description: {
            usage: '<truth | dare>',
            content: 'Get a random truth or dare challenge.'
        }
    },
    async (_, M, { cmd, text }) => {
        try {
            let mode = null

            /* ---------- DIRECT COMMAND ---------- */
            if (options.includes(cmd)) {
                mode = cmd
            } else if (options.includes(text?.toLowerCase())) {
                /* ---------- ARGUMENT MODE ---------- */
                mode = text.toLowerCase()
            } else {
                /* ---------- RANDOM MODE ---------- */
                mode = options[getRandomInt(0, options.length - 1)]
            }

            /* ---------- FETCH ---------- */
            let caption
            try {
                caption = mode === 'truth' ? get_truth() : get_dare()
            } catch {
                return M.reply('❌ Failed to get truth or dare.')
            }

            if (!caption) {
                return M.reply('❌ No truth or dare available.')
            }

            /* ---------- SEND ---------- */
            return M.reply(`🎭 *${mode.toUpperCase()}*\n\n${caption}`)
        } catch (err) {
            console.error('[TD COMMAND ERROR]', err)
            return M.reply('❌ Unexpected error while getting truth or dare.')
        }
    }
)
