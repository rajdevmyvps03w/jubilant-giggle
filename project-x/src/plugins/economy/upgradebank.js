import { plugin } from '../../utils/plugin.js'
// Updated to your new MongoDB database path
import {
    findUser,
    removeFromWallet,
    increaseBankCapacity,
    calculateGroupTax,
    addGroupFunds
} from '../../database/db.js'

plugin(
    {
        name: 'upgradebank',
        aliases: ['bankupgrade', 'ubank'],
        category: 'economy',
        isGroup: true,
        description: {
            usage: '<capacity>',
            content: 'Increase your bank capacity. Every 100k capacity costs ₹10k.',
            example: '100000'
        }
    },
    async (_, M, { args }) => {
        try {
            /* ---------- REGISTRATION CHECK ---------- */
            const user = await findUser(M.sender.id)
            if (!args[0]) {
                return M.reply(
                    `❌ Please enter how much capacity you want to increase.\n\n` +
                        `Example: *${global.config.prefix}upgradebank 100000*`
                )
            }

            /* ---------- INPUT VALIDATION ---------- */
            const increase = parseInt(args[0].replace(/[^0-9]/g, ''), 10)
            if (isNaN(increase) || increase <= 0) {
                return M.reply('❌ Please enter a valid numeric capacity amount.')
            }

            if (increase % 100000 !== 0) {
                return M.reply('⚠️ Bank capacity can only be increased in multiples of *100,000*.')
            }

            const baseCost = (increase / 100000) * 10000

            /* ---------- GROUP TAX (ASYNC) ---------- */
            let taxAmount = 0
            let totalCost = baseCost

            if (M.chat === 'group') {
                // Now awaiting the tax calculation from MongoDB
                const taxResult = await calculateGroupTax(M.sender.id, M.from, baseCost)
                taxAmount = taxResult.tax
                totalCost = baseCost + taxAmount
            }

            /* ---------- WALLET CHECK ---------- */
            if (user.wallet < totalCost) {
                return M.reply(
                    `❌ You do not have enough balance.\n\n` +
                        `💰 *Cost Breakdown:*\n` +
                        `• Base cost: ₹${baseCost.toLocaleString()}\n` +
                        (taxAmount > 0 ? `• Group Tax: ₹${taxAmount.toLocaleString()}\n` : '') +
                        `• *Total Required:* ₹${totalCost.toLocaleString()}\n\n` +
                        `👛 Your Wallet: ₹${user.wallet.toLocaleString()}`
                )
            }

            /* ---------- APPLY CHANGES (ATOMIC ASYNC) ---------- */
            // Subtracting wallet first to prevent exploits
            await removeFromWallet(M.sender.id, totalCost)
            await increaseBankCapacity(M.sender.id, increase)

            if (taxAmount > 0 && M.chat === 'group') {
                await addGroupFunds(M.from, taxAmount)
            }

            /* ---------- RESPONSE ---------- */
            let reply =
                `🏦 *Bank Capacity Upgraded!*\n\n` +
                `📈 Increase: *+₹${increase.toLocaleString()}*\n` +
                `💸 Base Cost: *₹${baseCost.toLocaleString()}*\n`

            if (taxAmount > 0) {
                reply += `🏛️ Group Tax: *₹${taxAmount.toLocaleString()}*\n`
            }

            reply +=
                `💰 Total Paid: *₹${totalCost.toLocaleString()}*\n\n` +
                `✅ Your bank can now hold more credits.\n` +
                `Use *${global.config.prefix}bank* to check your new limit.`

            return M.reply(reply)
        } catch (err) {
            console.error('[UPGRADE BANK ERROR]', err)
            return M.reply('❌ An error occurred while upgrading your bank capacity.')
        }
    }
)
