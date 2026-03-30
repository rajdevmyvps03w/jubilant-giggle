import { plugin } from '../../utils/plugin.js'
import { User } from '../../database/models/index.js'
import { getRank } from '../../functions/stats.js'

plugin(
    {
        name: 'topxp',
        aliases: ['txp', 'xplb', 'mastery'],
        category: 'misc',
        description: {
            content: 'Top 10 users with the highest XP. Use --global or --g for global rankings.',
            usage: '[--global | --g]',
            example: '--global'
        }
    },
    async (_, M, { flags }) => {
        try {
            const isGlobal = 'global' in flags || 'g' in flags || M.chat !== 'group'

            const modJids = global.config.mods.map((m) => m.split('@')[0])

            // ── Build query: exclude mods + scope filter ──────────────────────
            const query = {
                exp: { $gt: 0 },
                jid: { $not: { $regex: modJids.join('|') } },
                lid: { $not: { $regex: modJids.join('|') } }
            }

            if (!isGlobal) {
                const groupMembers = M.groupMetadata.participants.map((p) => p.id)
                query.$or = [{ jid: { $in: groupMembers } }, { lid: { $in: groupMembers } }]
            }

            // ── Sort + limit in DB, only fetch fields we need ─────────────────
            const top10 = await User.find(query, 'name exp').sort({ exp: -1 }).limit(10).lean()

            if (!top10 || top10.length === 0) {
                return M.reply(`✨ No users found for the ${isGlobal ? 'global' : 'local'} XP leaderboard.`)
            }

            // ── Build message ─────────────────────────────────────────────────
            let message = `🏆 *${isGlobal ? 'GLOBAL' : 'GROUP'} MASTERY LEADERBOARD* 🏆\n`
            message += `📊 *Scope:* ${isGlobal ? 'System Wide' : 'This Group'}\n\n`

            top10.forEach((user, i) => {
                const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '🔹'
                const { name: rankName } = getRank(user.exp || 0)

                message += `${medal} *#${i + 1}: ${user.name}*\n`
                message += `✨ XP: *${(user.exp || 0).toLocaleString()}* | 🎖️ *${rankName}*\n\n`
            })

            message += `💡 _Keep active to climb the ranks!_`

            return M.reply(message)
        } catch (err) {
            console.error('[TOPXP ERROR]', err)
            return M.reply('❌ Failed to calculate the Mastery leaderboard.')
        }
    }
)
