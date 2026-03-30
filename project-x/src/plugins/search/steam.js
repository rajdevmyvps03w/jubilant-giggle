import { plugin } from '../../utils/plugin.js'
import { fetch, getBuffer } from '../../functions/helpler.js'

plugin(
    {
        name: 'steam',
        aliases: ['game'],
        category: 'search',
        description: {
            content: 'Search a game or software from Steam and get details.',
            usage: '<game_name>',
            example: 'minecraft'
        }
    },
    async (_, M, { text }) => {
        if (!text) {
            return M.reply('❌ Please provide a game name.\n\nExample: steam gta v')
        }

        try {
            const data = await fetch(`https://api.popcat.xyz/v2/steam?q=${encodeURIComponent(text)}`)

            if (data?.error || !data?.message) {
                return M.reply(`❌ No Steam results found for *${text}*.`)
            }

            const g = data.message

            const message = [
                `🎮 *${g.name}*`,
                '',
                `🧩 *Type:* ${g.type || 'Unknown'}\n\n`,
                `🎮 *Controller Support:* ${g.controller_support || 'N/A'}\n\n`,
                `💰 *Price:* ${g.price || 'Free / N/A'}\n\n`,
                `🏢 *Developers:* ${g.developers?.join(', ') || 'Unknown'}\n\n`,
                `📦 *Publishers:* ${g.publishers?.join(', ') || 'Unknown'}\n\n`,
                `🌐 *Website:* ${g.website || 'N/A'}`,
                '',
                `📝 *Description:*`,
                g.description?.length > 700 ? g.description.slice(0, 700) + '…' : g.description
            ].join('\n')

            /* ---------- Try sending banner/thumbnail ---------- */
            try {
                const imgUrl = g.banner || g.thumbnail
                if (imgUrl) {
                    const buffer = await getBuffer(imgUrl)
                    return M.reply(buffer, 'image', undefined, message)
                }
            } catch {}

            return M.reply(message)
        } catch (err) {
            console.error('[STEAM]', err)
            return M.reply('❌ Failed to fetch Steam data. Try again later.')
        }
    }
)
