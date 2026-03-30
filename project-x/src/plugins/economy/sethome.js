import { plugin } from '../../utils/plugin.js'
// Updated to your MongoDB database path
import {
    findUser,
    findGroup,
    setHome,
    addGroupFunds,
    removeFromWallet,
    isGroupFeatureActive
} from '../../database/db.js'

plugin(
    {
        name: 'sethome',
        aliases: ['sethouse', 'sh'],
        category: 'economy',
        isGroup: true,
        description: {
            content: 'Set the current group as your primary home group to avoid foreign taxes.'
        }
    },
    async (_, M) => {
        try {
            /* ---------- REGISTRATION CHECK ---------- */
            const user = await findUser(M.sender.id)
            const group = await findGroup(M.from)

            /* ---------- 🔒 MMO CHECK ---------- */
            if (!group.mmo) {
                return M.reply(
                    '🚫 *MMO Mode Disabled*\n' + 'The admin must enable MMO features to allow setting a Home Group.'
                )
            }

            /* ---------- ALREADY HOME CHECK ---------- */
            // Checking user's home attribute in MongoDB
            if (user.home === M.from) {
                return M.reply('🏠 This group is already your home.')
            }

            /* ---------- PAID FEATURE LOGIC ---------- */
            const paidFeature = await isGroupFeatureActive(group, 'paid_sethome')
            let feeNote = ''

            if (paidFeature) {
                const price = group.sethomeFee || 5000

                if (user.wallet < price) {
                    return M.reply(
                        `💸 *Paid SetHome Active*\n\n` +
                            `❌ You need *₹${price.toLocaleString()}* to set this group as your home.\n` +
                            `👛 Your Wallet: ₹${user.wallet.toLocaleString()}`
                    )
                }

                // Atomic wallet and group fund updates
                await removeFromWallet(M.sender.id, price)
                await addGroupFunds(M.from, price)
                feeNote = `\n💰 *Fee Paid:* ₹${price.toLocaleString()}`
            }

            /* ---------- APPLY SET HOME (ASYNC) ---------- */

            await setHome(M.sender.id, M.from)

            /* ---------- RESPONSE ---------- */
            return M.reply(
                `🏠 *HOME GROUP SET SUCCESSFULLY!*\n\n` +
                    `✅ *Status:* Active${feeNote}\n` +
                    `📉 *Tax Benefit:* Standard Tax applies here.\n` +
                    `🚩 *Warning:* "Foreign Tax" will now apply to you in other groups.`
            )
        } catch (err) {
            console.error('[SETHOME ERROR]', err)
            return M.reply('❌ An error occurred while processing your request.')
        }
    }
)
