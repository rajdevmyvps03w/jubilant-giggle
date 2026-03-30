import { plugin } from '../../utils/plugin.js'
import { findGroup, addToWallet, removeGroupFunds } from '../../database/db.js'

plugin(
    {
        name: 'takegroupfund',
        aliases: ['gwithdraw'],
        isGroup: true,
        isAdmin: true, // Only admins can withdraw
        category: 'economy',
        description: {
            content: 'Withdraw money from group fund into your wallet.',
            usage: '<amount>',
            example: '1000'
        }
    },
    async (_, M, { text }) => {
        try {
            const amount = Math.floor(Number(text))
            if (isNaN(amount) || amount <= 0) {
                return M.reply('❌ Please enter a valid positive number.')
            }

            // 1. Await the group data
            const group = await findGroup(M.from)

            if (group.funds - amount < 0) {
                return M.reply(`❌ Insufficient group funds. Available: *₹${group.funds.toLocaleString()}*`)
            }

            // 3. Execute Transaction (Awaited)
            // Deduct from group first
            const removed = await removeGroupFunds(M.from, amount)
            if (!removed) {
                return M.reply('❌ Failed to deduct funds from the group.')
            }

            // Add to user's wallet
            const added = await addToWallet(M.sender.id, amount)
            if (!added) {
                // Critical: If adding to wallet fails, we should ideally refund the group.
                // For now, we log the error.
                console.error(`[CRITICAL] Funds taken from ${M.from} but not added to ${M.sender.id}`)
                return M.reply('❌ Error: Funds taken from group but failed to reach your wallet. Contact Dev.')
            }

            return M.reply(
                `✅ *Withdrawal Successful*\n\n` +
                    `💸 Amount: *₹${amount.toLocaleString()}*\n` +
                    `🏦 Remaining Funds: *₹${(group.funds - amount).toLocaleString()}*`
            )
        } catch (err) {
            console.error('[TAKE GROUP FUND ERROR]', err)
            return M.reply('❌ An error occurred during the withdrawal.')
        }
    }
)
