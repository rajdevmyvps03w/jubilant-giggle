import { plugin } from '../../utils/plugin.js'
import {
    findUser,
    removeFromWallet,
    editUser,
    loadMarket,
    getAsset,
    getTradePrices,
    registerBuyVolume,
    saveMarket
} from '../../database/db.js'

plugin(
    {
        name: 'buystock',
        aliases: ['bs'],
        category: 'stocks',
        description: {
            content: 'Buy shares from the global stock market.',
            usage: '<symbol> <amount>',
            example: 'BTC 5'
        }
    },
    async (_, M, { args }) => {
        try {
            if (args.length < 2) {
                return M.reply(
                    `❌ *Invalid Usage*\n\nProper usage: *${global.config.prefix}buystock <symbol> <amount>*`
                )
            }

            const symbol = args[0].toUpperCase()
            const amount = parseInt(args[1])

            if (isNaN(amount) || amount <= 0) {
                return M.reply('❌ Please provide a valid positive number for the amount.')
            }

            const user = await findUser(M.sender.id)

            const market = await loadMarket()
            const asset = getAsset(market, symbol)

            if (!asset) {
                return M.reply(
                    `❌ *Stock Not Found:* ${symbol}\nUse *${global.config.prefix}market* to see live prices.`
                )
            }

            const { buyPrice } = getTradePrices(asset)
            const totalCost = Math.ceil(buyPrice * amount)

            if (user.wallet - totalCost < 0) {
                return M.reply(
                    `❌ *Insufficient Funds*\n\n` +
                        `💸 *Total Cost:* ₹${totalCost.toLocaleString()}\n` +
                        `🏦 *Your Wallet:* ₹${user.wallet.toLocaleString()}`
                )
            }

            const ok = await removeFromWallet(M.sender.id, totalCost)
            if (!ok) {
                return M.reply('❌ Transaction failed. Please check your balance and try again.')
            }

            const holdings = user.stocks ?? {}
            holdings[asset.id] = (holdings[asset.id] || 0) + amount
            await editUser(M.sender.id, { stocks: holdings })

            registerBuyVolume(asset, totalCost)
            await saveMarket(market)

            const message =
                `✅ *Purchase Successful*\n\n` +
                `📈 *Asset:* ${asset.name} (${asset.id})\n` +
                `📦 *Amount:* ${amount.toLocaleString()} shares\n` +
                `💵 *Price per Share:* ₹${buyPrice.toLocaleString()}\n` +
                `💰 *Total Paid:* ₹${totalCost.toLocaleString()}\n\n` +
                `*Tip:* Prices update every 30 minutes. Hold or sell for profit!`

            return M.reply(message)
        } catch (err) {
            console.error('[BUYSTOCK ERROR]', err)
            return M.reply('❌ An internal error occurred while processing your purchase.')
        }
    }
)
