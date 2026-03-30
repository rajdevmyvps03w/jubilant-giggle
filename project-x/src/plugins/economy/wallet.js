import { plugin } from '../../utils/plugin.js'
// Updated to your new MongoDB database path
import { findUser } from '../../database/db.js'

plugin(
    {
        name: 'wallet',
        aliases: ['bal', 'money', 'balance'],
        category: 'economy',
        description: {
            content: 'Check your current wallet balance.'
        }
    },
    async (_, M) => {
        try {
            /* ---------- REGISTRATION CHECK ---------- */
            const { wallet } = await findUser(M.sender.id, 'wallet')

            return M.reply(
                `👛 *Wallet Balance*\n\n` +
                    `👤 User: @${M.sender.id.split('@')[0]}\n` +
                    `💰 Amount: *₹${wallet.toLocaleString()}*`,
                'text',
                null,
                null,
                [M.sender.id]
            )
        } catch (err) {
            console.error('[WALLET COMMAND ERROR]', err)
            return M.reply('❌ An error occurred while fetching your balance.')
        }
    }
)
