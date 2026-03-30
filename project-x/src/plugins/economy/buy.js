import { plugin } from '../../utils/plugin.js'
import { getStoreItem } from '../../functions/store.js'
import {
    findUser,
    removeFromWallet,
    addItemToInventory,
    generateSecureCode,
    getRedeemCodeInfo,
    removeCodeFromInventory,
    hasCodeInInventory,
    removeCode,
    calculateGroupTax,
    addGroupFunds,
    getDynamicPrice
} from '../../database/db.js'

plugin(
    {
        name: 'buy',
        aliases: ['purchase'],
        category: 'economy',
        isGroup: true,
        description: {
            usage: '<item_index> <quantity/days> [--discount=CODE]',
            content: 'Buy items. For lootboxes, max quantity is 6.',
            example: '2 5 (Buys 5 lootboxes)'
        }
    },
    async (_, M, { args, flags }) => {
        try {
            const user = await findUser(M.sender.id, 'wallet jid')

            if (!args[0]) {
                return M.reply(`⚙️ Please specify an item ID.\nUse *${global.config.prefix}store* to view items.`)
            }

            const rawItem = getStoreItem(args[0])
            if (!rawItem) {
                return M.reply(`❌ Invalid ID. Use *${global.config.prefix}store* to check valid items.`)
            }

            const item = M.chat === 'group' ? await getDynamicPrice(rawItem, M.from) : rawItem
            const isPotion = item.type === 'POTION'
            const isLootbox = item.type === 'LOOTBOX'

            if (isLootbox && !global.config.mods.includes(user.jid)) {
                return M.reply('🔒 Only the original bot owners can add new moderators.')
            }

            /* ---------- QUANTITY / DURATION LOGIC ---------- */
            let quantity = 1
            if (isPotion || isLootbox) {
                if (!args[1]) {
                    return M.reply(
                        `❌ Please specify ${isPotion ? 'days' : 'quantity'}.\nExample: *${global.config.prefix}buy ${args[0]} 5*`
                    )
                }
                quantity = parseInt(args[1])

                // Safety check for numbers
                if (isNaN(quantity) || quantity <= 0) {
                    return M.reply('❌ Please enter a valid positive number.')
                }

                // Hard Limit for Lootboxes (Safety first)
                if (isLootbox && quantity > 1000) {
                    return M.reply('⚠️ *Bulk Limit:* You can only buy a maximum of *1000* lootboxes at a time.')
                }
            }

            /* ---------- COST CALCULATION ---------- */
            let baseCost = isPotion ? quantity * item.pricePerDay : item.price * quantity
            let usedDiscountCode = null

            /* ---------- DISCOUNT CHECK ---------- */
            if (flags?.discount) {
                const code = flags.discount.trim()
                const codeInfo = await getRedeemCodeInfo(code)
                const ownsCode = await hasCodeInInventory(M.sender.id, code, 'REDEEMCODE')

                if (codeInfo && ownsCode && codeInfo.type === 'DISCOUNT') {
                    if (baseCost >= (codeInfo.minPurchase || 0)) {
                        const discountAmount = Math.floor((baseCost * codeInfo.discountPercent) / 100)
                        baseCost -= discountAmount
                        usedDiscountCode = code
                        await M.reply(`🎟️ Discount Applied: -₹${discountAmount.toLocaleString()}`)
                    } else {
                        return M.reply(`❌ Min purchase for this code is ₹${codeInfo.minPurchase.toLocaleString()}`)
                    }
                }
            }

            /* ---------- TAX & FINAL VALIDATION ---------- */
            let taxAmount = 0
            if (M.chat === 'group') {
                const taxData = await calculateGroupTax(M.sender.id, M.from, baseCost)
                taxAmount = taxData.tax
            }
            const finalCost = baseCost + taxAmount

            if (user.wallet - finalCost < 0) {
                return M.reply(
                    `❌ Insufficient funds. Need ₹${finalCost.toLocaleString()}, ${taxAmount > 0 ? `(taxs: ₹${taxAmount.toLocaleString()})` : ''}`
                )
            }

            /* ---------- DATABASE UPDATES (ATOMIC-LIKE) ---------- */
            await removeFromWallet(M.sender.id, finalCost)
            if (taxAmount > 0) {
                await addGroupFunds(M.from, taxAmount)
            }

            if (usedDiscountCode) {
                await removeCode(usedDiscountCode)
                await removeCodeFromInventory(M.sender.id, usedDiscountCode)
            }

            const now = new Date()
            let message = `✅ *Purchase Successful!*\n🛍️ Item: *${item.label}* x${quantity}\n💰 Paid: ₹${finalCost.toLocaleString()}\n`

            if (taxAmount > 0) {
                message += `🏛️ Tax: ₹${taxAmount.toLocaleString()}\n`
            }

            /* ---------- ITEM DELIVERY ---------- */
            if (isPotion) {
                await addItemToInventory(M.sender.id, {
                    usage: 'TIMEPERIOD',
                    type: 'POTION',
                    name: item.name,
                    duration: quantity, // quantity = days here
                    purchasedAt: now
                })
                message += `🧪 Added to inventory (${quantity} days).`
            } else if (isLootbox) {
                // Loop to add multiple lootboxes safely
                for (let i = 0; i < quantity; i++) {
                    await addItemToInventory(M.sender.id, {
                        type: 'LOOTBOX',
                        usage: 'ONETIME',
                        name: item.name || 'Standard Lootbox',
                        purchasedAt: new Date(now.getTime() + i) // Unique timestamp for each
                    })
                }
                message += `🎁 Added *${quantity}* lootboxes to your inventory.`
            } else if (item.type === 'DISCOUNT') {
                // Discount items usually stay at quantity 1 for logic safety
                const percent = Math.floor(Math.random() * 50) + 10
                const code = await generateSecureCode({ type: 'DISCOUNT', discountPercent: percent, createdAt: now })
                await addItemToInventory(M.sender.id, { type: 'REDEEMCODE', name: code, purchasedAt: now })
                message += `🎟️ New Code: *${code}* (${percent}%)`
            }

            return M.reply(message)
        } catch (err) {
            console.error('[BUY_ERROR]', err)
            return M.reply('❌ Transaction failed.')
        }
    }
)
