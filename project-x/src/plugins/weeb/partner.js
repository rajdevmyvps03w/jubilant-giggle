import { plugin } from '../../utils/plugin.js'
import { findUser } from '../../database/db.js'
import { getBuffer } from '../../functions/helpler.js'

plugin(
    {
        name: 'partner',
        aliases: ['mymarry', 'married', 'companion'],
        category: 'weeb',
        isGroup: true,
        description: {
            content: 'View the waifu or husbando you are currently married to.'
        }
    },
    async (_, M) => {
        try {
            /* ---------- FETCH USER FROM MONGODB ---------- */
            const user = await findUser(M.sender.id)

            // Checking the 'slug' object structure for marriage data
            if (!user?.slug?.isMarried || !user?.slug?.data?.name) {
                return M.reply('🪹 You are currently single. Use the marry command to find your soulmate!')
            }

            const slug = user.slug.data

            /* ---------- DURATION CALCULATION ---------- */
            let durationText = 'Just now'
            if (slug.marriedAt) {
                const diff = Date.now() - new Date(slug.marriedAt).getTime()
                const days = Math.floor(diff / (1000 * 60 * 60 * 24))
                const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

                if (days > 0) {
                    durationText = `${days} day${days > 1 ? 's' : ''}${hours > 0 ? ` and ${hours} hour${hours > 1 ? 's' : ''}` : ''}`
                } else if (hours > 0) {
                    durationText = `${hours} hour${hours > 1 ? 's' : ''}`
                } else {
                    durationText = 'Less than an hour'
                }
            }

            /* ---------- MEDIA HANDLING ---------- */
            let img = null
            try {
                if (slug.image) {
                    img = await getBuffer(slug.image)
                }
            } catch (e) {
                console.warn(`[PARTNER IMAGE LOAD FAIL]: ${slug.name}`)
            }

            /* ---------- MESSAGE CONSTRUCTION ---------- */
            const msg = [
                `💍 *MARRIAGE PROFILE*`,
                '',
                `👤 *Name:* ${slug.name}`,
                `💖 *Type:* ${slug.type === 'husbando' ? 'Husbando' : 'Waifu'}`,
                `🎨 *Origin:* ${slug.origin || 'Anime/Manga'}`,
                `⏳ *Together For:* ${durationText}`,
                slug.url ? `🔗 [View Profile](${slug.url})` : ''
            ]
                .filter(Boolean)
                .join('\n')

            if (img) {
                return M.reply(img, 'image', undefined, msg)
            }

            return M.reply(msg)
        } catch (err) {
            console.error('[PARTNER COMMAND ERROR]', err)
            return M.reply('❌ An error occurred while fetching your marriage status.')
        }
    }
)
