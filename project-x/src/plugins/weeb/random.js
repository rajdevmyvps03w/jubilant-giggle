import { plugin } from '../../utils/plugin.js'
import { deleteState, saveState } from '../../database/db.js'
import { getBuffer, fetch } from '../../functions/helpler.js'

const TEN_MIN = 10 * 60 * 1000

plugin(
    {
        name: 'random',
        aliases: ['rw', 'roll'],
        category: 'weeb',
        description: {
            usage: '<waifu | husbu>',
            content: 'Roll a random waifu or husbando. Result disappears in 10 minutes.',
            example: 'waifu'
        }
    },
    async (_, M, { args }) => {
        try {
            const type = (args[0] || '').toLowerCase()

            if (!['waifu', 'husbu', 'husbando'].includes(type)) {
                return M.reply(
                    `❌ Choose a type.\n\n` +
                        `Usage:\n` +
                        `• ${global.config.prefix}random waifu\n` +
                        `• ${global.config.prefix}random husbu`
                )
            }
            const rand = type.startsWith('hus')
                ? await fetch('https://api-fawn-seven-28.vercel.app/api/getRandomHusbandos')
                : await fetch('https://api-fawn-seven-28.vercel.app/api/getRandomWaifu')

            if (!rand?.url) {
                return M.reply('❌ Failed to fetch character. Please try gain later!')
            }

            // ---------- FULL DATA ----------
            const char = await fetch(`https://api-fawn-seven-28.vercel.app/api/fetchCharacter?url=${rand.url}`)
            if (!char) {
                return M.reply('❌ Failed to load character data. Please try gain later!')
            }

            // ---------- IMAGE ----------
            let img = null
            try {
                if (char.display_picture) {
                    img = await getBuffer(char.display_picture)
                }
            } catch {}

            await deleteState(`roll_${M.from}`)
            await saveState(`roll_${M.from}`, char, TEN_MIN)

            // ---------- MESSAGE ----------
            const desc = char.description
                ? char.description.replace(/\s+/g, ' ').slice(0, 300) + '...'
                : 'No description available.'

            const msg =
                `${type.startsWith('hus') ? '💙' : '💖'} *Random ${type.startsWith('hus') ? 'Husbando' : 'Waifu'}*\n\n` +
                `👤 Name: *${char.name || 'Unknown'}*\n` +
                `🌍 Origin: ${char.origin || 'Unknown'}\n` +
                `🎂 Age: ${char.age || 'Unknown'}\n\n` +
                `📝 ${desc}\n\n` +
                `🔗 ${char.url || ''}`

            if (img) return M.reply(img, 'image', undefined, msg)
            return M.reply(msg)
        } catch (err) {
            console.error('[RANDOM COMMAND ERROR]', err)
            return M.reply('❌ Unexpected error while fetching character.')
        }
    }
)
