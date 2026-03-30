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
    BOND_TITLES,
    ACTIONS
} from '../../functions/slug.js'
import { getRandomItem } from '../../functions/helpler.js'

plugin(
    {
        name: 'slugrival',
        aliases: ['rival', 'fightforslug'],
        category: 'weeb',
        description: {
            content: 'Challenge a rival who is after your partner. Requires Bond Level 2 (Friends).'
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

            const gate = checkLevel(slug, 'rival')
            if (gate.blocked) return M.reply(gate.msg)

            const cd = checkCooldown(slug, 'rival')
            if (cd) {
                return M.reply(`⚔️ You are still recovering from the last fight!\n` + `⏳ Come back in *${fmtMs(cd)}*.`)
            }

            const rivals = [
                'a mysterious stranger',
                'a childhood friend of theirs',
                'a rich noble',
                'a powerful warrior',
                'a charming idol',
                'a jealous ex',
                'a rival student from another school'
            ]

            const rival = getRandomItem(rivals)
            const won = Math.random() > 0.35 // 65% win chance

            if (won) {
                const { newXp, newLevel, leveledUp } = await applyAction(uid(user), slug, 'rival', editUser)

                return M.reply(
                    `⚔️ *Rival Defeated!*\n\n` +
                        `*${rival}* tried to steal *${slug.data.name}* from you.\n` +
                        `You stood your ground and won the fight! ` +
                        `*${slug.data.name}* looked at you with shining eyes. 💪✨\n\n` +
                        `💖 Love XP: *${newXp}* | 🎀 Bond: *${BOND_TITLES[newLevel]}*` +
                        levelUpSuffix(leveledUp, newLevel)
                )
            } else {
                // Save cooldown even on loss
                const updatedData = { ...slug.data, last_rival: Date.now() }
                await editUser(uid(user), { slug: { isMarried: true, data: updatedData } })

                return M.reply(
                    `⚔️ *Rival Won...*\n\n` +
                        `*${rival}* got the better of you this time.\n` +
                        `*${slug.data.name}* was taken temporarily, but they left a note saying they still love you. 💔\n\n` +
                        `_Train harder and come back stronger. You have *${fmtMs(ACTIONS.rival.cooldown)}* to recover._`
                )
            }
        } catch (err) {
            console.error('[RIVAL ERROR]', err)
            return M.reply('❌ An error occurred during the rival challenge.')
        }
    }
)
