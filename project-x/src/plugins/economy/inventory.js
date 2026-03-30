import { plugin } from '../../utils/plugin.js'
// Updated to your new database path
import { findUser, getRedeemCodeInfo } from '../../database/db.js'

plugin(
    {
        name: 'inventory',
        aliases: ['inv', 'bag'],
        category: 'economy',
        isGroup: true,
        description: {
            content: 'Shows all your current active items, potions, and codes.'
        }
    },
    async (_, M) => {
        try {
            /* ---------- REGISTRATION CHECK ---------- */
            const user = await findUser(M.sender.id)

            // Using user.inventory directly from the fetched user object
            const items = user.inventory || []

            if (!items.length) {
                return M.reply('🎒 *Inventory is empty*\nYou have no active items or potions.')
            }

            let msg = `🎒 *Your Inventory*\n\n`

            const itemNames = {
                luckpotion: '🍀 Luck Potion',
                robprotection: '🛡️ Rob Protection',
                moneypotion: '💸 Money Potion',
                exppotion: '⚡ Exp Potion',
                lootbox: '🎁 Lootbox',
                discountcode: '🎟️ Discount Code'
            }

            const now = new Date()

            for (const [i, item] of items.entries()) {
                const displayName = itemNames[item.name?.toLowerCase()] || item.name
                msg += `*${i + 1}. ${displayName}*\n`

                // --- POTIONS (TIME PERIOD)
                if (item.type === 'POTION' && item.usage === 'TIMEPERIOD') {
                    // Assuming duration is stored as an ISO date or timestamp of expiry
                    const expiry = new Date(item.duration)
                    const remainingMs = expiry - now
                    const remainingDays = Math.ceil(remainingMs / (1000 * 60 * 60 * 24))

                    msg += `⏳ Remaining: ${remainingDays > 0 ? remainingDays : 0} day(s)\n`
                    msg += `📅 Expires: ${expiry.toDateString()}\n\n`
                }

                // --- REDEEM CODES
                else if (item.type === 'REDEEMCODE') {
                    // Awaiting database call for code metadata
                    const codeInfo = await getRedeemCodeInfo(item.name)
                    const codeType = codeInfo ? codeInfo.type : 'UNKNOWN'

                    msg += `🎟️ Code: *${item.name}*\n`
                    msg += `📌 Type: ${codeType}\n`
                    msg += `📅 Purchased: ${new Date(item.purchasedAt).toDateString()}\n\n`
                }

                // --- LOOTBOX
                else if (item.type === 'LOOTBOX') {
                    msg += `🎁 A lootbox waiting to be opened!\n`
                    msg += `📅 Purchased: ${new Date(item.purchasedAt).toDateString()}\n\n`
                }

                // --- OTHER ITEMS
                else {
                    msg += `📦 Purchased: ${new Date(item.purchasedAt).toDateString()}\n\n`
                }
            }

            return M.reply(msg.trim())
        } catch (err) {
            console.error('[INVENTORY ERROR]', err)
            return M.reply('❌ An error occurred while accessing your backpack.')
        }
    }
)
