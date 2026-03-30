import { plugin } from '../../utils/plugin.js'
// Updated to your new MongoDB database path
import { findUser, getLeaderboardPosition } from '../../database/db.js'
import { getRank, getNextRank } from '../../functions/stats.js'

plugin(
    {
        name: 'rank',
        aliases: ['level', 'xp', 'lvl'],
        category: 'misc',
        isGroup: true,
        description: {
            content: 'Check your current rank, XP, and leaderboard position.',
            example: 'rank'
        }
    },
    async (_, M) => {
        try {
            /* ---------- REGISTRATION CHECK ---------- */
            const { exp, name } = await findUser(M.sender.id)
            const { name: rankName } = getRank(exp)
            const next = getNextRank(exp)

            /* ---------- LEADERBOARD POSITION (ASYNC) ---------- */
            // We use a specific DB helper to find the rank position efficiently
            const position = await getLeaderboardPosition(M.sender.id)

            /* ---------- BUILD MESSAGE ---------- */
            let message =
                `🏅 *RANK OVERVIEW*\n\n` +
                `👤 *Name:* ${name}\n\n` +
                `⭐ *Current Rank:* ${rankName}\n\n` +
                `✨ *Total XP:* ${exp.toLocaleString()}\n\n` +
                `📊 *Global Rank:* #${position}\n\n`

            if (next) {
                message +=
                    `\n⬆️ *Next Rank:* ${next.nextRank}\n\n` + `🔺 *XP Needed:* ${next.xpToNext.toLocaleString()}\n`
            } else {
                message += `\n🔥 You have reached the *Ultimate Rank!*`
            }

            return M.reply(message.trim())
        } catch (err) {
            console.error('[RANK COMMAND ERROR]', err)
            return M.reply('❌ An error occurred while fetching your rank data.')
        }
    }
)
