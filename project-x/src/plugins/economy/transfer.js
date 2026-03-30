import { plugin } from '../../utils/plugin.js'
// Updated to your new database path
import { findUser, removeFromWallet, addToWallet, hasWarnType } from '../../database/db.js'
import { extractNumbers } from '../../functions/helpler.js'

plugin(
    {
        name: 'transfer',
        aliases: ['pay', 'send'],
        category: 'economy',
        isGroup: true,
        description: {
            usage: '<@user> <amount>',
            content: 'Transfer money to a user (mention only). Order of args does not matter.',
            example: '@user 500 or transfer 500 @user'
        }
    },
    async (_, M, { text }) => {
        try {
            /* ---------- SENDER REGISTRATION CHECK ---------- */
            const sender = await findUser(M.sender.id)

            if (!text.length) {
                return M.reply(`❌ You have not provided any input follow: *${global.config.prefix}transfer @user 500*`)
            }

            /* ---------- TARGET IDENTIFICATION ---------- */
            const opponent = M.mentioned?.[0] || (M.isQuoted ? M.quotedMessage?.participant : null)

            if (!opponent) {
                return M.reply('❌ You must *mention or reply* to a user to transfer money.')
            }

            if (opponent === M.sender.id || opponent === M.sender.jid) {
                return M.reply('❌ You cannot transfer money to yourself.')
            }

            /* ---------- RECEIVER REGISTRATION CHECK ---------- */
            const receiver = await findUser(opponent)
            if (!receiver) {
                return M.reply(
                    `❌ The recipient (@${opponent.split('@')[0]}) is not registered.\n` +
                        `They must register before they can receive credits.`,
                    'text',
                    null,
                    null,
                    [opponent]
                )
            }

            // Check if the sender has the restriction
            const senderRestricted = await hasWarnType(M.sender.id, M.from, 5)
            if (senderRestricted) {
                return M.reply('🚫 *RESTRICTED:* You cannot initiate trades because you have an active Warning Type 6.')
            }

            // Check if the target has the restriction
            const targetRestricted = await hasWarnType(opponent, M.from, 5)
            if (targetRestricted) {
                return M.reply(
                    `🚫 *RESTRICTED:* You cannot trade with this user as they currently have an active Warning Type 6.`
                )
            }

            /* ---------- AMOUNT PARSING ---------- */
            const numbers = extractNumbers(text)
            const amount = numbers ? numbers[0] : null

            if (!amount || isNaN(amount) || amount <= 0) {
                return M.reply(`❌ Enter a valid amount.\nExample: *${global.config.prefix}transfer @user 500*`)
            }

            /* ---------- WALLET CHECK ---------- */
            if (sender.wallet < amount) {
                return M.reply(`❌ You don't have ₹${amount.toLocaleString()} in your wallet.`)
            }

            /* ---------- ATOMIC TRANSFER (ASYNC) ---------- */
            // We await these to ensure the database reflects changes before the reply
            await removeFromWallet(M.sender.id, amount)
            await addToWallet(opponent, amount)

            /* ---------- SUCCESS MESSAGE ---------- */
            return M.reply(
                `✅ *Transfer Successful!*\n\n` +
                    `👤 *From:* @${M.sender.id.split('@')[0]}\n` +
                    `➡️ *To:* @${opponent.split('@')[0]}\n` +
                    `💸 *Amount:* ₹${amount.toLocaleString()}\n\n` +
                    `💰 *Your New Wallet:* ₹${(sender.wallet - amount).toLocaleString()}`,
                'text',
                null,
                null,
                [M.sender.id, opponent]
            )
        } catch (err) {
            console.error('[TRANSFER ERROR]', err)
            return M.reply('❌ An error occurred during the transaction.')
        }
    }
)
