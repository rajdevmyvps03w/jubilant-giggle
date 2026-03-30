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
        name: 'slugcuddle',
        aliases: ['scuddle', 'shug'],
        category: 'weeb',
        description: {
            content: 'Cuddle your waifu/husbando. Requires Bond Level 1 (Acquaintances).'
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

            const gate = checkLevel(slug, 'cuddle')
            if (gate.blocked) return M.reply(gate.msg)

            const cd = checkCooldown(slug, 'cuddle')
            if (cd) {
                return M.reply(
                    `🤗 *${slug.data.name}* needs a little space right now!\n` + `⏳ Come back in *${fmtMs(cd)}*.`
                )
            }

            const lines = [
                `You pulled *${slug.data.name}* close and held them tight. They rested their head on your chest and sighed. 🤗`,
                `*${slug.data.name}* curled up next to you and you wrapped your arms around them. Perfect silence. 💤`,
                `A long, warm cuddle session with *${slug.data.name}*. They whispered "don't let go". 🌙`,
                `You both lay on the couch watching the rain outside. *${slug.data.name}* snuggled deeper into your arms. 🌧️`,
                `*${slug.data.name}* grabbed your arm and pulled you into a surprise hug. Your heart skipped a beat. 💓`
            ]

            const { newXp, newLevel, leveledUp } = await applyAction(uid(user), slug, 'cuddle', editUser)
            const line = getRandomItem(lines)

            return M.reply(
                `🤗 *Cuddle!*\n\n` +
                    `${line}\n\n` +
                    `💖 Love XP: *${newXp}* | 🎀 Bond: *${BOND_TITLES[newLevel]}*` +
                    levelUpSuffix(leveledUp, newLevel)
            )
        } catch (err) {
            console.error('[CUDDLE ERROR]', err)
            return M.reply('❌ An error occurred while trying to cuddle your partner.')
        }
    }
)
