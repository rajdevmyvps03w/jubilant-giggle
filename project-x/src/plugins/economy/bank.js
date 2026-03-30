import { plugin } from '../../utils/plugin.js'
import { findUser } from '../../database/db.js'

plugin(
    {
        name: 'bank',
        aliases: ['vault', 'safe'],
        category: 'economy',
        description: {
            content: 'Check your bank balance and capacity.'
        }
    },
    async (_, M) => {
        try {
            const { bank } = await findUser(M.sender.id, 'bank wallet')
            return M.reply(
                `🏦 *BANK ACCOUNT INFO*\n\n` +
                    `💰 *Balance:* ₹${(bank.value || 0).toLocaleString()}\n` +
                    `📦 *Capacity:* ₹${(bank.capacity || 0).toLocaleString()}\n\n` +
                    `ℹ️ Use *${global.config.prefix}deposit* to save your wallet coins.`
            )
        } catch (err) {
            console.error('[BANK COMMAND ERROR]', err)
            return M.reply('❌ An error occurred while accessing your bank vault.')
        }
    }
)
