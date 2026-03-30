import { plugin } from '../../utils/plugin.js'
import { storeItems } from '../../functions/store.js'
import { findUser, getDynamicPrice } from '../../database/db.js'

plugin(
    {
        name: 'store',
        aliases: ['shop'],
        category: 'economy',
        isGroup: true,
        description: {
            content: 'Displays the store with all available items for purchase.'
        }
    },
    async (_, M) => {
        try {
            const user = await findUser(M.sender.id)

            const isDev = global.config.mods.includes(M.sender.id) || global.config.mods.includes(user.jid)

            // Lootbox is hidden from regular users — devs can still see it
            const visibleItems = storeItems.filter((item) => item.type !== 'LOOTBOX' || isDev)

            const itemPromises = visibleItems.map(async (item) => {
                const pricedItem = M.chat === 'group' ? await getDynamicPrice(item, M.from) : item

                const priceText =
                    pricedItem.type === 'POTION'
                        ? `💰 ₹${pricedItem.pricePerDay.toLocaleString()} / day`
                        : `💰 ₹${pricedItem.price.toLocaleString()} (one-time)`

                const dynamicNote =
                    pricedItem._dynamicMultiplier && pricedItem._dynamicMultiplier !== 1
                        ? `📈 Dynamic Price: x${pricedItem._dynamicMultiplier.toFixed(2)}`
                        : ''

                return (
                    `*${pricedItem.id}. ${pricedItem.label}*\n` +
                    `${priceText}\n` +
                    `🧾 ${pricedItem.desc}\n` +
                    (dynamicNote ? `_${dynamicNote}_\n` : '')
                )
            })

            const formattedItems = await Promise.all(itemPromises)
            const formattedList = formattedItems.join('\n')

            return M.reply(
                `🏪 *Welcome to the Store!*\n\n` +
                    `${formattedList}\n` +
                    `🛍️ *How to Buy:*\n` +
                    `• Potion → *${global.config.prefix}buy 1 7*\n` +
                    `• With Discount → *${global.config.prefix}buy 2 7 --discount=CODE*\n` +
                    `💡 Prices may fluctuate based on the group's economy.`
            )
        } catch (err) {
            console.error('[STORE COMMAND ERROR]', err)
            return M.reply('❌ An error occurred while fetching the store items.')
        }
    }
)
