import { plugin } from '../../utils/plugin.js'
import { findUser } from '../../database/db.js'
import { getSlug, fmtMs, BOND_TITLES, ACTIONS, LOVE_XP_PER_LEVEL, MAX_BOND_LEVEL } from '../../functions/slug.js'

plugin(
    {
        name: 'sluglove',
        aliases: ['lovestatus', 'bondstatus', 'slugstats'],
        category: 'weeb',
        description: {
            content: 'View your love XP, bond level, and all action cooldowns with your waifu/husbando.'
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
            const xpInLevel = loveXp % LOVE_XP_PER_LEVEL
            const xpToNext = bondLevel >= MAX_BOND_LEVEL ? 'MAX LEVEL' : `${xpInLevel}/${LOVE_XP_PER_LEVEL} XP`

            const marriedMs = slug.data.marriedAt ? Date.now() - slug.data.marriedAt : 0
            const days = Math.floor(marriedMs / 86400000)

            const now = Date.now()

            const cdLine = (action, emoji, label) => {
                const cfg = ACTIONS[action]
                const last = slug.data[`last_${action}`] || 0
                const left = cfg.cooldown - (now - last)
                const locked = bondLevel < cfg.minLevel

                if (locked) {
                    return `${emoji} ${label}: 🔒 Locked _(need Level ${cfg.minLevel})_`
                }
                return left > 0 ? `${emoji} ${label}: ⏳ *${fmtMs(left)}*` : `${emoji} ${label}: ✅ *Ready*`
            }

            return M.reply(
                `💕 *Love Status*\n` +
                    `👤 Partner: *${slug.data.name}*\n\n` +
                    `🎀 Bond: *${BOND_TITLES[bondLevel]}* (Level ${bondLevel}/${MAX_BOND_LEVEL})\n` +
                    `💖 Love XP: *${loveXp}* — ${xpToNext} to next level\n` +
                    `📅 Together for: *${days} day${days !== 1 ? 's' : ''}*\n\n` +
                    `*⏰ Action Cooldowns:*\n` +
                    `${cdLine('kiss', '💋', 'Kiss       ')}\n` +
                    `${cdLine('cuddle', '🤗', 'Cuddle     ')}\n` +
                    `${cdLine('rival', '⚔️', 'Rival      ')}\n` +
                    `${cdLine('date', '📅', 'Date       ')}\n` +
                    `${cdLine('mating', '🔥', 'Mating     ')}\n` +
                    `${cdLine('intercourse', '💞', 'Intimate   ')}\n\n` +
                    `_Use *${global.config.prefix}sluglevelup* to level up your bond._`
            )
        } catch (err) {
            console.error('[SLUGLOVE ERROR]', err)
            return M.reply('❌ An error occurred while fetching your love status.')
        }
    }
)
