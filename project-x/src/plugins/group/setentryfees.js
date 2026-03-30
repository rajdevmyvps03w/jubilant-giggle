import { plugin } from '../../utils/plugin.js'
// Updated to your new database path
import { findGroup, editGroup, isGroupFeatureActive } from '../../database/db.js'

plugin(
    {
        name: 'sethomefees',
        aliases: ['sethomefee', 'homefee'],
        isGroup: true,
        isAdmin: true,
        category: 'group',
        description: {
            content: 'Set the fee users must pay to set this group as home.',
            usage: '<amount>',
            example: '5000'
        }
    },
    async (_, M, { text }) => {
        try {
            const amount = Math.floor(Number(text.trim()))

            if (isNaN(amount) || amount < 0) {
                return M.reply(`❌ Provide a valid positive number.\nExample: ${global.config.prefix}sethomefees 5000`)
            }

            // 1. Await group data
            const group = await findGroup(M.from)

            // 2. Check MMO status
            if (!group.mmo) {
                return M.reply(`❌ MMO mode is disabled in this group.\nUse *${global.config.prefix}mmo on* to enable.`)
            }

            // 3. Await Feature status (This also triggers the cleanupExpiredFeatures logic)
            const isPaidSetHomeActive = await isGroupFeatureActive(M.from, 'paid_sethome')

            if (!isPaidSetHomeActive) {
                return M.reply('❌ *Paid SetHome* feature is not active.\nUnlock or resume it via the features store.')
            }

            // 4. Update MongoDB
            const success = await editGroup(M.from, { sethomeFee: amount })

            if (success) {
                return M.reply(
                    amount === 0
                        ? '✅ SetHome is now *free* for this group.'
                        : `💰 SetHome fee set to *₹${amount.toLocaleString()}* credits.`
                )
            } else {
                return M.reply('❌ Failed to update the fee in the database.')
            }
        } catch (err) {
            console.error('[SET HOME FEES ERROR]', err)
            return M.reply('❌ An error occurred while setting the fees.')
        }
    }
)
