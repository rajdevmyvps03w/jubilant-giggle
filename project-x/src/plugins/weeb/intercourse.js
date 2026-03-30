import { plugin } from '../../utils/plugin.js'
import { findUser, editUser } from '../../database/db.js'
import {
    getSlug,
    uid,
    checkLevel,
    checkCooldown,
    applyAction,
    levelUpSuffix,
    fmtMs,
    BOND_TITLES
} from '../../functions/slug.js'
import { getRandomItem } from '../../functions/helpler.js'

plugin(
    {
        name: 'intercourse',
        aliases: ['intimate', 'slugintimate'],
        category: 'weeb',
        description: {
            content: 'An intimate moment with your partner. Requires Bond Level 7 (Devoted).'
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

            const gate = checkLevel(slug, 'intercourse')
            if (gate.blocked) return M.reply(gate.msg)

            const cd = checkCooldown(slug, 'intercourse')
            if (cd) {
                return M.reply(`💕 *${slug.data.name}* needs time to recover.\n` + `⏳ Come back in *${fmtMs(cd)}*.`)
            }

            const lines = [
                `What happened next between you and *${slug.data.name}* was deeply private and incredibly meaningful. 🌸`,
                `*${slug.data.name}* took your hand and led you somewhere quiet. The rest is just between you two. 🕯️`,
                `A night neither of you will ever forget. You grew closer than you ever thought possible. 💞`,
                `*${slug.data.name}* looked into your eyes and said nothing. Words weren't needed. 🌌`,
                `Time stood still. Just you and *${slug.data.name}*, completely lost in each other. 💫`
            ]

            const { newXp, newLevel, leveledUp } = await applyAction(uid(user), slug, 'intercourse', editUser)
            const line = getRandomItem(lines)

            return M.reply(
                `💞 *Intimate Moment*\n\n` +
                    `${line}\n\n` +
                    `💖 Love XP: *${newXp}* | 🎀 Bond: *${BOND_TITLES[newLevel]}*` +
                    levelUpSuffix(leveledUp, newLevel)
            )
        } catch (err) {
            console.error('[INTERCOURSE ERROR]', err)
            return M.reply('❌ An error occurred.')
        }
    }
)
