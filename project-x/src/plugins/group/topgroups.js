import { plugin } from '../../utils/plugin.js'
import { Group, User } from '../../database/models/index.js'

plugin(
    {
        name: 'topgroups',
        aliases: ['tg', 'richgroups', 'grouplb'],
        category: 'group',
        description: {
            content: 'Displays the top 10 wealthiest groups (Group Funds + Members Home Bank Value).'
        }
    },
    async (client, M) => {
        try {
            const [homeBankTotals, allGroups] = await Promise.all([
                User.aggregate([
                    { $match: { 'bank.id': { $ne: null }, 'bank.value': { $gt: 0 } } },
                    {
                        $group: {
                            _id: '$bank.id',
                            homeBank: { $sum: '$bank.value' }
                        }
                    }
                ]),
                Group.find({ funds: { $gt: 0 } }, 'id funds').lean()
            ])

            if (!allGroups || allGroups.length === 0) {
                return M.reply('🏢 No groups found in the database.')
            }

            const homeBankMap = new Map(homeBankTotals.map((r) => [r._id, r.homeBank]))

            const top10 = allGroups
                .map((group) => {
                    const funds = group.funds || 0
                    const homeBank = homeBankMap.get(group.id) || 0
                    return {
                        id: group.id,
                        funds,
                        homeBank,
                        wealth: funds + homeBank
                    }
                })
                .filter((g) => g.wealth > 0)
                .sort((a, b) => b.wealth - a.wealth)
                .slice(0, 10)

            if (top10.length === 0) {
                return M.reply('💰 No groups have any recorded wealth yet.')
            }

            const withNames = await Promise.all(
                top10.map(async (group) => {
                    let name = `Group (${group.id.split('@')[0]})`
                    try {
                        const metadata = await client.cachedGroupMetadata(group.id)
                        if (metadata?.subject) {
                            name = metadata.subject
                        }
                    } catch {}
                    return { ...group, name }
                })
            )

            let message = `🏢 *WEALTHIEST GROUPS LEADERBOARD* 🏆\n\n`

            withNames.forEach((group, i) => {
                const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '🔹'
                const isCurrent = group.id === M.from ? ' *(Current)*' : ''

                message += `${medal} *#${i + 1}: ${group.name}*${isCurrent}\n`
                message += `💰 Total Wealth: *₹${group.wealth.toLocaleString()}*\n`
                message += `🏦 Group Funds: ₹${group.funds.toLocaleString()}\n`
                message += `🏠 Home Bank: ₹${group.homeBank.toLocaleString()}\n\n`
            })

            message += `💡 Wealth: Group Funds + Total Bank Value of users with this group as "Home".`

            return M.reply(message)
        } catch (err) {
            console.error('[TOPGROUPS ERROR]', err)
            return M.reply('❌ Failed to calculate the group leaderboard.')
        }
    }
)
