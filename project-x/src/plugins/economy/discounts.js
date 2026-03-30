import { plugin } from '../../utils/plugin.js'
// Updated to your new database path
import { findUser, getRedeemCodeInfo } from '../../database/db.js'

plugin(
    {
        name: 'discounts',
        aliases: ['codes', 'mydiscounts', 'disc'],
        category: 'economy',
        isGroup: true,
        description: {
            content: 'Shows all your active discount codes and their details.'
        }
    },
    async (_, M) => {
        try {
            /* ---------- REGISTRATION CHECK ---------- */
            const user = await findUser(M.sender.id)

            const inventoryCodes = (user.inventory || []).filter(
                (item) => item.type === 'REDEEMCODE' && item.usage === 'ONETIME'
            )

            if (!inventoryCodes.length) {
                return M.reply('🎟️ *No Active Codes*\nYou don’t have any redeem or discount codes.')
            }

            const codeInfoResults = await Promise.all(inventoryCodes.map((item) => getRedeemCodeInfo(item.name)))

            const discountCodes = codeInfoResults.filter((info) => info && info.type?.toUpperCase() === 'DISCOUNT')

            if (!discountCodes.length) {
                return M.reply('💡 You have redeem codes, but no active discount codes.')
            }

            /* ---------- MESSAGE BUILDING ---------- */
            let msg = `🎟️ *Your Discount Codes*\n\n`

            for (const [i, codeInfo] of discountCodes.entries()) {
                const { code, discountPercent, minPurchase, createdAt } = codeInfo

                msg += `*${i + 1}.* Code: *${code}*\n`
                msg += `💸 Discount: ${discountPercent}%\n`
                msg += `🛒 Min Purchase: ₹${(minPurchase || 0).toLocaleString()}\n`
                msg += `📅 Created: ${new Date(createdAt).toDateString()}\n\n`
            }

            msg += `💡 Use these with *${global.config.prefix}buy* command:\n${global.config.prefix}buy <id> <days> --discount=CODE`

            return M.reply(msg.trim())
        } catch (err) {
            console.error('[DISCOUNT COMMAND ERROR]', err)
            return M.reply('❌ An error occurred while retrieving your discount list.')
        }
    }
)
