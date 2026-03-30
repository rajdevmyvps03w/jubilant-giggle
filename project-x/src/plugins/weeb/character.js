import { plugin } from '../../utils/plugin.js'
import { fetch, getBuffer } from '../../functions/helpler.js'

plugin(
    {
        name: 'character',
        aliases: ['chara'],
        category: 'weeb',
        description: {
            content: 'Search and display information about an anime character.',
            usage: '<character_name>',
            example: 'Gojo'
        }
    },
    async (_, M, { text }) => {
        if (!text || !text.trim()) {
            return M.reply('❌ Please provide a character name to search.')
        }

        try {
            const data = await fetch(`https://weeb-api.vercel.app/character?search=${encodeURIComponent(text.trim())}`)

            if (!Array.isArray(data) || data.length === 0) {
                return M.reply(`❌ No character found for *"${text}"*.`)
            }

            const chara = data[0]
            const fullName = chara?.name?.full || 'Unknown'
            const nativeName = chara?.name?.native || 'Unknown'
            const age = chara?.age ?? 'Unknown'
            const gender = chara?.gender || 'Unknown'
            const blood = chara?.bloodType || 'Unknown'

            const descriptionRaw = chara?.description || 'No description available.'
            const description = descriptionRaw.replace(/\([^)]*\)/g, '').trim()

            const message =
                `🎀 *Full Name:* ${fullName}\n\n` +
                `💮 *Japanese:* ${nativeName}\n\n` +
                `💫 *Age:* ${age}\n\n` +
                `🚻 *Gender:* ${gender}\n\n` +
                `🩸 *Blood Type:* ${blood}\n\n` +
                `📃 *Description:*\n${description}`

            /* ---------- IMAGE ---------- */
            let imageBuffer = null
            try {
                if (chara?.imageUrl) {
                    imageBuffer = await getBuffer(chara.imageUrl)
                }
            } catch {}

            /* ---------- SEND ---------- */
            if (imageBuffer) {
                return M.reply(imageBuffer, 'image', null, message)
            }

            return M.reply(message)
        } catch (err) {
            console.error('[CHARACTER]', err)
            return M.reply(`❌ Failed to fetch character results for *"${text}"*.`)
        }
    }
)
