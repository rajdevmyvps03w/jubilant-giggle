import { plugin } from '../../utils/plugin.js'
import { findUser, addToWallet, removeFromBank } from '../../database/db.js'

plugin(
    {
        name: 'withdraw',
        aliases: ['with', 'wd'],
        category: 'economy',
        isGroup: true,
        description: {
            usage: '<amount | all>',
            content: 'Withdraw money from your bank to your wallet.',
            example: '500'
        }
    },
    async (_, M, { args }) => {
        try {
            /* ---------- REGISTRATION CHECK ---------- */
            const { bank, wallet } = await findUser(M.sender.id)

            if (!args[0]) {
                return M.reply(
                    `❌ No input has been registered.\n Usage: *${global.config.prefix}withdraw <amount | all>*`
                )
            }

            let amount
            if (args[0].toLowerCase() === 'all') {
                amount = bank?.value
                if (amount <= 0) {
                    return M.reply('⚠️ Your bank account is currently empty.')
                }
            } else {
                // Remove non-numeric characters for flexible input
                amount = parseInt(args[0].replace(/[^0-9]/g, ''), 10)

                if (isNaN(amount) || amount <= 0) {
                    return M.reply('❌ Please enter a valid numeric amount to withdraw.')
                }
                if (bank?.value - amount < 0) {
                    return M.reply(
                        `❌ Insufficient funds. You only have ₹${bank?.value.toLocaleString()} in your bank.`
                    )
                }
            }

            /* ---------- ATOMIC TRANSACTIONS (ASYNC) ---------- */
            // Awaiting updates to prevent race conditions (withdrawing more than available)
            await removeFromBank(M.sender.id, amount)
            await addToWallet(M.sender.id, amount)

            /* ---------- RESPONSE ---------- */
            return M.reply(
                `✅ *Withdrawal Successful!*\n\n` +
                    `🏦 *Withdrawn:* ₹${amount.toLocaleString()}\n` +
                    `📉 *Bank Balance:* ₹${(bank?.value - amount).toLocaleString()}\n` +
                    `💰 *Wallet Balance:* ₹${(wallet + amount).toLocaleString()}`
            )
        } catch (err) {
            console.error('[WITHDRAW ERROR]', err)
            return M.reply('❌ An error occurred while processing your withdrawal.')
        }
    }
)
