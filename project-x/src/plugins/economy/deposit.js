import { plugin } from '../../utils/plugin.js'
// Updated to your new database path
import { findUser, removeFromWallet, addToBank } from '../../database/db.js'

plugin(
    {
        name: 'deposit',
        aliases: ['dep'],
        category: 'economy',
        isGroup: true,
        description: {
            usage: '<amount | all>',
            content: 'Deposit money from your wallet to your bank.',
            example: '500'
        }
    },
    async (_, M, { args }) => {
        try {
            /* ---------- REGISTRATION CHECK ---------- */
            const { bank, wallet } = await findUser(M.sender.id)

            if (!args[0]) {
                return M.reply(
                    `❌ No input has been registered.\n Usage: *${global.config.prefix}deposit <amount | all>*`
                )
            }

            /* ---------- CAPACITY CALCULATION ---------- */
            const currentBankValue = bank.value || 0
            const bankCapacity = bank.capacity || 0
            const freeSpace = bankCapacity - currentBankValue

            if (freeSpace <= 0) {
                return M.reply('🏦 Your bank is full. Upgrade capacity to deposit more.')
            }

            let amount
            if (args[0].toLowerCase() === 'all') {
                amount = Math.min(wallet, freeSpace)
                if (amount <= 0) {
                    return M.reply('⚠️ You have nothing to deposit or your bank is already full.')
                }
            } else {
                // Remove non-numeric characters (like commas or currency symbols)
                amount = parseInt(args[0].replace(/[^0-9]/g, ''), 10)

                if (isNaN(amount) || amount <= 0) {
                    return M.reply('❌ Enter a valid numeric amount to deposit.')
                }
                if (wallet - amount < 0) {
                    return M.reply(`❌ You don't have ₹${amount.toLocaleString()} in your wallet.`)
                }
                if (freeSpace - amount < 0) {
                    return M.reply(
                        `❌ You can only deposit up to ₹${freeSpace.toLocaleString()} due to your current bank capacity.`
                    )
                }
            }

            await removeFromWallet(M.sender.id, amount)
            await addToBank(M.sender.id, amount)

            return M.reply(
                `✅ *Deposit Successful!*\n\n` +
                    `💰 *Amount:* ₹${amount.toLocaleString()}\n` +
                    `👛 *New Wallet:* ₹${(wallet - amount).toLocaleString()}\n` +
                    `🏦 *New Bank:* ₹${(currentBankValue + amount).toLocaleString()} / ₹${bankCapacity.toLocaleString()}`
            )
        } catch (err) {
            console.error('[DEPOSIT ERROR]', err)
            return M.reply('❌ An unexpected error occurred while processing your deposit.')
        }
    }
)
