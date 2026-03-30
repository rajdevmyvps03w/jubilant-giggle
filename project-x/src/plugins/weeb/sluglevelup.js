import { plugin } from '../../utils/plugin.js'
import { findUser, editUser } from '../../database/db.js'
import { getSlug, uid, BOND_TITLES, LOVE_XP_PER_LEVEL, MAX_BOND_LEVEL } from '../../functions/slug.js'

plugin(
    {
        name: 'sluglevelup',
        aliases: ['bondlevelup', 'levelupslug'],
        category: 'weeb',
        description: {
            content: 'Level up your bond with your waifu/husbando using accumulated Love XP.'
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

            const loveXp = slug.data.loveXp || 0
            const bondLevel = slug.data.bondLevel || 0

            if (bondLevel >= MAX_BOND_LEVEL) {
                return M.reply(
                    `💎 *Maximum Bond Reached!*\n\n` +
                        `You and *${slug.data.name}* are already *${BOND_TITLES[MAX_BOND_LEVEL]}*.\n` +
                        `Your love cannot grow any stronger. 🌟`
                )
            }

            const neededXp = (bondLevel + 1) * LOVE_XP_PER_LEVEL

            if (loveXp < neededXp) {
                return M.reply(
                    `❌ *Not enough Love XP to level up.*\n\n` +
                        `🎀 Current bond: *${BOND_TITLES[bondLevel]}* (Level ${bondLevel})\n` +
                        `💖 Your XP: *${loveXp}* / *${neededXp}* needed\n` +
                        `⚡ Still need: *${neededXp - loveXp} XP*\n\n` +
                        `Keep spending time with *${slug.data.name}* to gain more Love XP!\n` +
                        `Try *-kiss*, *-cuddle*, *-date* and more.`
                )
            }

            const newLevel = bondLevel + 1
            const updatedData = { ...slug.data, bondLevel: newLevel }
            await editUser(uid(user), { slug: { isMarried: true, data: updatedData } })

            const unlocks =
                newLevel === 1
                    ? `\n🔓 *Unlocked:* Cuddle (-cuddle)`
                    : newLevel === 2
                      ? `\n🔓 *Unlocked:* Rival Challenge (-slugrival)`
                      : newLevel === 3
                        ? `\n🔓 *Unlocked:* Date (-date)`
                        : newLevel === 5
                          ? `\n🔓 *Unlocked:* Mating Drive (-mating)`
                          : newLevel === 7
                            ? `\n🔓 *Unlocked:* Intimate Moments (-intercourse)`
                            : ''

            return M.reply(
                `🎉 *Bond Level Up!*\n\n` +
                    `You and *${slug.data.name}* have grown so much closer!\n\n` +
                    `🎀 New Bond: *${BOND_TITLES[newLevel]}* (Level ${newLevel})` +
                    `${unlocks}\n\n` +
                    (newLevel < MAX_BOND_LEVEL
                        ? `_Next level requires *${(newLevel + 1) * LOVE_XP_PER_LEVEL} total Love XP*._`
                        : `_You have reached the peak of love. There is nothing beyond this. 💎_`)
            )
        } catch (err) {
            console.error('[SLUGLEVELUP ERROR]', err)
            return M.reply('❌ An error occurred while leveling up your bond.')
        }
    }
)
