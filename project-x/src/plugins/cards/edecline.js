import { plugin } from '../../utils/plugin.js'
// Updated to your new MongoDB database path
import { getState, deleteState } from '../../database/db.js'

plugin(
    {
        name: 'edecline',
        aliases: ['dec', 'tradecancel', 'tcancel'],
        category: 'cards',
        isGroup: true,
        description: {
            content: 'Decline or cancel a pending card exchange request and unlock your inventory.',
            usage: '<exchangeID>',
            example: 'ABC123'
        }
    },
    async (_, M, { args }) => {
        try {
            const exchangeId = args?.[0]?.toUpperCase()
            if (!exchangeId) {
                return M.reply('❌ Please provide the Exchange ID you wish to decline.')
            }

            /* ---------- FETCH STATE FROM MONGODB ---------- */
            const data = await getState(`exchange_info:${exchangeId}`)

            if (!data) {
                return M.reply('❌ This exchange request has already expired or does not exist.')
            }

            /* ---------- SECURITY CHECK ---------- */
            // Both the sender (data.from) and the recipient (data.to) should be allowed to end the trade
            const isSender = data.from === M.sender.id
            const isRecipient = data.to === M.sender.id

            if (!isSender && !isRecipient) {
                return M.reply('❌ You are not a participant in this trade request.')
            }

            /* ---------- ATOMIC CLEANUP ---------- */
            // We clear all 3 keys: the info key and the lock keys for both users
            await Promise.all([
                deleteState(`exchange:${data.from}`),
                deleteState(`exchange:${data.to}`),
                deleteState(`exchange_info:${exchangeId}`)
            ])

            const statusLabel = isSender ? 'Cancelled' : 'Declined'

            return M.reply(
                `✅ *TRADE ${statusLabel.toUpperCase()}*\n\n` +
                    `ID: \`${exchangeId}\`\n` +
                    `🔓 Both users' inventories have been unlocked.`
            )
        } catch (err) {
            console.error('[EDECLINE ERROR]', err)
            return M.reply('❌ An error occurred while declining the exchange.')
        }
    }
)
