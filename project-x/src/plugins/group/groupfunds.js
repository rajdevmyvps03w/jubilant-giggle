import { plugin } from '../../utils/plugin.js'
import { User } from '../../database/models/index.js'
import { findGroup, getGroupWealth } from '../../database/db.js'

plugin(
    {
        name: 'groupfund',
        aliases: ['gfund', 'fund'],
        isGroup: true,
        category: 'group',
        description: {
            content: 'View group funds and wealth breakdown.'
        }
    },
    async (_, M) => {
        try {
            // 1. Await the group data
            const group = await findGroup(M.from)
            const homeUsers = await User.find({ 'bank.id': M.from })

            let homeCount = homeUsers.length
            let homeBankTotal = homeUsers.reduce((sum, user) => sum + (user.bank?.value || 0), 0)

            // 3. Await the total wealth calculation (as it now needs to talk to the DB)
            const totalWealth = await getGroupWealth(M.from)

            return M.reply(
                `🏦 *GROUP FUND STATUS*\n\n` +
                    `💰 Group Funds: *₹${(group.funds || 0).toLocaleString()}*\n` +
                    `👥 Home Members: *${homeCount}*\n` +
                    `🏦 Home Bank Total: *₹${homeBankTotal.toLocaleString()}*\n\n` +
                    `🌟 *Total Group Worth:* ₹${totalWealth.toLocaleString()}`
            )
        } catch (err) {
            console.error('[GROUP FUND ERROR]', err)
            return M.reply('❌ Failed to calculate group wealth.')
        }
    }
)
