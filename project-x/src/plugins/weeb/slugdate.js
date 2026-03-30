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
        name: 'slugdate',
        aliases: ['sdate', 'takeout'],
        category: 'weeb',
        description: {
            content: 'Take your waifu/husbando on a date. Requires Bond Level 3 (Close Friends).'
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

            const gate = checkLevel(slug, 'date')
            if (gate.blocked) return M.reply(gate.msg)

            const cd = checkCooldown(slug, 'date')
            if (cd) {
                return M.reply(
                    `📅 *${slug.data.name}* isn't ready for another date just yet!\n` +
                        `⏳ Come back in *${fmtMs(cd)}*.`
                )
            }

            const venues = [
                'a candlelit rooftop restaurant 🍷',
                'a cozy seaside café 🌊☕',
                'a late-night stargazing spot 🌌',
                'an amusement park 🎡',
                'a cherry blossom park 🌸',
                'a quiet bookshop followed by ramen 🍜',
                'an outdoor movie screening under the stars 🎬🌠',
                'a snowy mountain cabin with hot cocoa ☕❄️'
            ]

            const venue = getRandomItem(venues)

            const { newXp, newLevel, leveledUp } = await applyAction(uid(user), slug, 'date', editUser)

            return M.reply(
                `📅 *Date Night!*\n\n` +
                    `You took *${slug.data.name}* to ${venue}.\n` +
                    `They looked absolutely stunning. The whole night was magical. ✨\n\n` +
                    `💖 Love XP: *${newXp}* | 🎀 Bond: *${BOND_TITLES[newLevel]}*` +
                    levelUpSuffix(leveledUp, newLevel)
            )
        } catch (err) {
            console.error('[DATE ERROR]', err)
            return M.reply('❌ An error occurred while planning the date.')
        }
    }
)
