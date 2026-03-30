import { plugin } from '../../utils/plugin.js'
import { findUser, addToWallet } from '../../database/db.js'

plugin(
    {
        name: 'addmoney',
        aliases: ['givemoney', 'addwallet'],
        category: 'dev',
        isDev: true,
        description: {
            content: "Dev: Add money to a mentioned or quoted user's wallet.",
            usage: '<@user | reply> <amount>',
            example: '@917003213983 5000'
        }
    },
    async (_, M, { text }) => {
        try {
            // 1. Resolve target user
            let targetJid = M.mentioned?.[0] || (M.isQuoted ? M.quotedMessage?.participant : null)
            if (!targetJid) {
                return M.reply('❌ Please mention or reply to the user you want to add money to.')
            }

            // 2. Parse amount
            const cleanText = text.replace(/@\d+/g, '').trim()
            const amount = Number(cleanText)

            if (isNaN(amount) || amount === 0) {
                return M.reply(
                    `❌ Please provide a valid amount (can be negative to deduct).\nUsage: *${global.config.prefix}addmoney @user <amount>*`
                )
            }

            // 3. Check target is registered
            const targetUser = await findUser(targetJid, 'name wallet')
            if (!targetUser) {
                return M.reply('❌ That user is not registered in the bot.')
            }

            const oldWallet = targetUser.wallet || 0

            // 4. Add (or deduct if negative)
            await addToWallet(targetJid, amount)

            const newWallet = oldWallet + amount
            const action = amount >= 0 ? 'Added 💰' : 'Deducted 💸'
            const sign = amount >= 0 ? '+' : ''

            return M.reply(
                `✅ *WALLET UPDATED*\n\n` +
                    `👤 *User:* ${targetUser.name}\n` +
                    `💳 *Action:* ${action}\n` +
                    `📊 *Change:* ${sign}₹${Math.abs(amount).toLocaleString()}\n` +
                    `💰 *Old Balance:* ₹${oldWallet.toLocaleString()}\n` +
                    `💎 *New Balance:* ₹${newWallet.toLocaleString()}\n\n` +
                    `_Modified by dev: @${M.sender.id.split('@')[0]}_`
            )
        } catch (err) {
            console.error('[ADDMONEY ERROR]', err)
            return M.reply('❌ An error occurred while updating the wallet.')
        }
    }
)
