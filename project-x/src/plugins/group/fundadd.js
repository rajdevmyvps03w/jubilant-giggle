import { plugin } from '../../utils/plugin.js'
// Updated to your new database path
import { findGroup, findUser, addGroupFunds, removeFromWallet } from '../../database/db.js'

plugin(
    {
        name: 'addgroupfund',
        aliases: ['gdeposit', 'fundadd'],
        isGroup: true,
        category: 'economy',
        description: {
            content: 'Add money to group fund from your wallet.',
            usage: '<amount>',
            example: '500'
        }
    },
    async (_, M, { text }) => {
        try {
            const amount = Math.floor(Number(text))
            if (isNaN(amount) || amount <= 0) {
                return M.reply('❌ Please enter a valid positive number for the amount.')
            }

            // 1. Await data from MongoDB
            const group = await findGroup(M.from)
            const user = await findUser(M.sender.id)

            if (!group.mmo) {
                return M.reply('❌ MMO mode is currently *disabled* in this group.')
            }

            // 2. Check balance
            if (user.wallet - amount < 0) {
                return M.reply(`❌ Insufficient wallet balance. You only have *₹${user.wallet.toLocaleString()}*.`)
            }
            const removed = await removeFromWallet(M.sender.id, amount)
            if (!removed) return M.reply('❌ Transaction failed: Could not deduct from wallet.')

            const added = await addGroupFunds(M.from, amount)
            if (!added) {
                return M.reply('❌ Critical Error: Funds deducted but failed to reach group bank.')
            }

            return M.reply(
                `✅ *Deposit Successful*\n\n` +
                    `💸 Contributed: *₹${amount.toLocaleString()}*\n` +
                    `🏦 New Group Fund: *₹${(group.funds + amount).toLocaleString()}*`
            )
        } catch (err) {
            console.error('[ADD GROUP FUND ERROR]', err)
            return M.reply('❌ An unexpected error occurred during the transaction.')
        }
    }
)
