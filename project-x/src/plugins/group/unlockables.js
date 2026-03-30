import { plugin } from '../../utils/plugin.js'
// Updated to your new database path
import { findGroup } from '../../database/db.js'
import { GROUP_FEATURE_STORE, getGroupLevel } from '../../functions/stats.js'

plugin(
    {
        name: 'unlockables',
        isGroup: true,
        category: 'group',
        description: {
            content: 'View unlockable group features available for purchase.'
        }
    },
    async (_, M) => {
        try {
            // 1. Await Group Data from MongoDB
            const group = await findGroup(M.from)

            const { level } = getGroupLevel(group.exp)
            const owned = new Set(group.features.map((f) => f.key))

            /* ---------- FILTER + STABLE SORT ---------- */
            // We only show features the group meets the level requirement for
            // and doesn't already own.
            const available = GROUP_FEATURE_STORE.filter((f) => level >= f.minLevel && !owned.has(f.key)).sort(
                (a, b) => a.minLevel - b.minLevel || a.price - b.price
            )

            if (!available.length) {
                return M.reply('ℹ️ No unlockable features available at your current level.')
            }

            /* ---------- BUILD MESSAGE ---------- */
            let msg = `🏪 *Group Feature Store*\n`
            msg += `📊 Group Level: *${level}*\n`
            msg += `💰 Group Funds: *₹${(group.funds || 0).toLocaleString()}*\n\n`

            available.forEach((f, i) => {
                msg += `*${i + 1}.* 🔹 *${f.name}*\n`
                msg += `   🆔 Key: \`${f.key}\`\n`
                msg += `   💰 Price: *₹${f.price.toLocaleString()}*\n`
                msg += `   ⏳ Duration: *${f.duration ? `${f.duration} month(s)` : 'Permanent'}*\n`
                msg += `   📝 ${f.description}\n\n`
            })

            msg += `ℹ️ *To purchase:*\n`
            msg += `*${global.config.prefix}unlock <index>* or *<key>*\n`
            msg += `Example: \`${global.config.prefix}unlock 1\``

            return M.reply(msg.trim())
        } catch (err) {
            console.error('[UNLOCKABLES ERROR]', err)
            return M.reply('❌ Failed to load the feature store.')
        }
    }
)
