import { plugin } from '../../utils/plugin.js'
import { User } from '../../database/models/index.js'

plugin(
    {
        name: 'genderstats',
        aliases: ['genderratio', 'usergender', 'gratio'],
        category: 'dev',
        isDev: true,
        description: {
            content: 'Dev: Show the gender ratio of all registered users.'
        }
    },
    async (_, M) => {
        try {
            // Single aggregation — one round trip to get all counts grouped by gender
            const results = await User.aggregate([
                {
                    $group: {
                        _id: '$gender',
                        count: { $sum: 1 }
                    }
                }
            ])

            // Map results into a lookup object { male: N, female: N, unknown: N, ... }
            const counts = {}
            let total = 0
            for (const r of results) {
                const key = (r._id || 'unknown').toLowerCase()
                counts[key] = r.count
                total += r.count
            }

            if (total === 0) {
                return M.reply('❌ No registered users found in the database.')
            }

            const male = counts['male'] || 0
            const female = counts['female'] || 0
            const unknown = total - male - female // anything that isn't male/female

            const pct = (n) => (total > 0 ? ((n / total) * 100).toFixed(1) : '0.0')

            // Build a simple ASCII bar (20 chars wide)
            const BAR_WIDTH = 20
            const maleBar = Math.round((male / total) * BAR_WIDTH)
            const femaleBar = Math.round((female / total) * BAR_WIDTH)
            const unknownBar = BAR_WIDTH - maleBar - femaleBar

            const bar = '🟦'.repeat(maleBar) + '🟥'.repeat(femaleBar) + '⬜'.repeat(Math.max(0, unknownBar))

            let msg =
                `📊 *USER GENDER RATIO*\n\n` +
                `👥 *Total Registered:* ${total.toLocaleString()}\n\n` +
                `${bar}\n\n` +
                `👦 *Male:*    ${male.toLocaleString()} users (${pct(male)}%)\n` +
                `👧 *Female:*  ${female.toLocaleString()} users (${pct(female)}%)\n`

            if (unknown > 0) {
                msg += `❓ *Unknown:* ${unknown.toLocaleString()} users (${pct(unknown)}%)\n`
            }

            msg += `\n💡 _Based on self-reported gender at registration._`

            return M.reply(msg)
        } catch (err) {
            console.error('[GENDERSTATS ERROR]', err)
            return M.reply('❌ An error occurred while fetching gender statistics.')
        }
    }
)
