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
        name: 'mating',
        aliases: ['matingdrive', 'urge'],
        category: 'weeb',
        description: {
            content: 'A powerful mating drive moment with your partner. Requires Bond Level 5 (Dating).'
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

            const gate = checkLevel(slug, 'mating')
            if (gate.blocked) return M.reply(gate.msg)

            const cd = checkCooldown(slug, 'mating')
            if (cd) {
                return M.reply(
                    `🔥 The energy between you and *${slug.data.name}* hasn't recharged yet.\n` +
                        `⏳ Come back in *${fmtMs(cd)}*.`
                )
            }

            const lines = [
                `The air between you and *${slug.data.name}* crackled with electricity. Neither of you could hold back. 🔥`,
                `*${slug.data.name}* looked at you with that look — you both knew what was about to happen. 💘`,
                `An instinct took over. *${slug.data.name}* pulled you close, heart racing. The world disappeared. 🌙`,
                `Something primal stirred inside you both. *${slug.data.name}* reached for your hand and pulled you away from the crowd. 💞`,
                `The tension had been building all day. Finally, *${slug.data.name}* broke the silence and leaned in. 🌹`
            ]

            const { newXp, newLevel, leveledUp } = await applyAction(uid(user), slug, 'mating', editUser)
            const line = getRandomItem(lines)

            return M.reply(
                `🔥 *Mating Drive!*\n\n` +
                    `${line}\n\n` +
                    `💖 Love XP: *${newXp}* | 🎀 Bond: *${BOND_TITLES[newLevel]}*` +
                    levelUpSuffix(leveledUp, newLevel)
            )
        } catch (err) {
            console.error('[MATING ERROR]', err)
            return M.reply('❌ An error occurred.')
        }
    }
)
