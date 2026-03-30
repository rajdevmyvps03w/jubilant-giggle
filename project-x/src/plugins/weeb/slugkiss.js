import { plugin } from '../../utils/plugin.js'
import { findUser, editUser } from '../../database/db.js'
import { getSlug, uid, checkCooldown, applyAction, levelUpSuffix, fmtMs, BOND_TITLES } from '../../functions/slug.js'
import { getRandomItem } from '../../functions/helpler.js'

plugin(
    {
        name: 'slugkiss',
        aliases: ['skiss'],
        category: 'weeb',
        description: {
            content: 'Kiss your waifu/husbando.'
        }
    },
    async (_, M) => {
        try {
            const user = await findUser(M.sender.id)
            const slug = getSlug(user)

            if (!slug) {
                return M.reply(
                    `❌ You are not married to anyone.\n\n` +
                        `Use *${global.config.prefix}random* then *${global.config.prefix}marry* to find your partner.`
                )
            }

            const cd = checkCooldown(slug, 'kiss')
            if (cd) {
                return M.reply(
                    `💋 *${slug.data.name}* is still blushing from last time!\n` + `⏳ Come back in *${fmtMs(cd)}*.`
                )
            }

            const lines = [
                `You leaned in and kissed *${slug.data.name}* softly on the cheek. They smiled and looked away shyly. 💕`,
                `A gentle kiss on the forehead. *${slug.data.name}* closed their eyes and sighed happily. 🌸`,
                `*${slug.data.name}* didn't expect that kiss — their cheeks turned bright red. 😳💋`,
                `You kissed *${slug.data.name}* under the moonlight. They whispered your name softly. 🌙`,
                `A quick surprise kiss! *${slug.data.name}* froze for a second, then burst into a huge smile. ✨`
            ]

            const { newXp, newLevel, leveledUp } = await applyAction(uid(user), slug, 'kiss', editUser)
            const line = getRandomItem(lines)

            return M.reply(
                `💋 *Kiss!*\n\n` +
                    `${line}\n\n` +
                    `💖 Love XP: *${newXp}* | 🎀 Bond: *${BOND_TITLES[newLevel]}*` +
                    levelUpSuffix(leveledUp, newLevel)
            )
        } catch (err) {
            console.error('[KISS ERROR]', err)
            return M.reply('❌ An error occurred while trying to kiss your partner.')
        }
    }
)
