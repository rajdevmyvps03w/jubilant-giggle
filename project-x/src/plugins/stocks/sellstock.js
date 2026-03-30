import { plugin } from '../../utils/plugin.js'
import {
    findUser,
    addToWallet,
    editUser,
    calculateGroupTax,
    addGroupFunds,
    loadMarket,
    getAsset,
    getTradePrices,
    registerSellVolume,
    saveMarket
} from '../../database/db.js'

plugin(
    {
        name: 'sellstock',
        aliases: ['ss'],
        category: 'stocks',
        description: {
            content: 'Sell shares from your portfolio and receive coins after group tax.',
            usage: '<symbol> <amount>',
            example: 'BTC 2'
        }
    },
    async (_, M, { args }) => {
        try {
            if (args.length < 2) {
                return M.reply(
                    `❌ You have not provided any valid input. Usage *${global.config.prefix}sellstock <symbol> <amount>*`
                )
            }

            const symbol = args[0].toUpperCase()
            const amount = parseInt(args[1])

            if (isNaN(amount) || amount <= 0) {
                return M.reply('❌ Please provide a valid positive number of shares to sell.')
            }

            /* ---------- DATA FETCHING ---------- */
            const user = await findUser(M.sender.id)

            const market = await loadMarket()
            const asset = getAsset(market, symbol)

            if (!asset) {
                return M.reply(
                    `❌ *Stock Not Found:* ${symbol}\nUse *${global.config.prefix}market* to see available assets.`
                )
            }

            const holdings = user.stocks ?? {}
            const owned = holdings[asset.id] || 0

            if (owned - amount < 0) {
                return M.reply(`❌ *Insufficient Shares*\n\nYou only own *${owned}* shares of ${asset.id}.`)
            }

            const { sellPrice } = getTradePrices(asset)
            const grossGain = Math.floor(sellPrice * amount)

            let tax = 0
            let finalGain = grossGain

            if (M.chat === 'group') {
                const taxData = await calculateGroupTax(M.sender.id, M.from, grossGain)
                tax = taxData.tax
                finalGain = grossGain - tax

                if (tax > 0) {
                    await addGroupFunds(M.from, tax)
                }
            }

            await addToWallet(M.sender.id, finalGain)

            holdings[asset.id] = owned - amount
            if (holdings[asset.id] <= 0) {
                delete holdings[asset.id]
            }
            await editUser(M.sender.id, { stocks: holdings })

            registerSellVolume(asset, grossGain)
            await saveMarket(market)

            const message =
                `✅ *Stock Sale Successful*\n\n` +
                `📈 *Asset:* ${asset.name} (${asset.id})\n` +
                `📦 *Sold:* ${amount.toLocaleString()} shares\n` +
                `💵 *Price per Share:* ₹${sellPrice.toLocaleString()}\n` +
                `💰 *Gross Total:* ₹${grossGain.toLocaleString()}\n` +
                (tax > 0 ? `🏛️ *Group Tax:* -₹${tax.toLocaleString()}\n` : '') +
                `🏦 *Net Received:* ₹${finalGain.toLocaleString()}`

            return M.reply(message)
        } catch (err) {
            console.error('[SELLSTOCK ERROR]', err)
            return M.reply('❌ An internal error occurred while processing the sale.')
        }
    }
)
