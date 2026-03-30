import { plugin } from '../../utils/plugin.js'
import {
    findUser,
    removeCardFromDeck,
    addCardToDeck,
    saveState,
    getState,
    getGroupsByFeatureState,
    isSupportGroup
} from '../../database/db.js'
import { randomString, getRandomInt } from '../../functions/helpler.js'
import { endAuction, broadcast, scheduleAuctionEnd } from '../../functions/auction.js'

const MIN_DURATION_MS = 5 * 60 * 1000 // 5 minutes minimum
const MAX_DURATION_MS = 24 * 60 * 60 * 1000 // 24 hours maximum

const fmtTime = (ms) => {
    if (ms <= 0) {
        return '0s'
    }
    const h = Math.floor(ms / 3600000)
    const m = Math.floor((ms % 3600000) / 60000)
    const s = Math.floor((ms % 60000) / 1000)
    if (h > 0) {
        return `${h}h ${m}m`
    }
    if (m > 0) {
        return `${m}m ${s}s`
    }
    return `${s}s`
}

const auctionKeyFor = (type, groupJid) => (type === 'global' ? 'auc:global' : `auc:local:${groupJid}`)

plugin(
    {
        name: 'auction',
        category: 'cards',
        isGroup: true,
        description: {
            content: 'Start, end or view a card auction.',
            usage: '<index> [--type=global|local] [--time=Xs] [--bit=AMOUNT] | --end | --info',
            example: '1 --type=global --time=300s --bit=10000'
        }
    },
    async (client, M, { args, flags }) => {
        try {
            const type = flags.type === 'global' ? 'global' : 'local'
            const auctionKey = auctionKeyFor(type, M.from)

            if (isSupportGroup(M.from) && !global.config.mods.includes(M.sender.jid)) {
                return M.reply('🔒 Only the moderators can use this command here.')
            }

            if (type == 'global' && !global.config.mods.includes(M.sender.jid)) {
                return M.reply('🔒 Only the original bot owners can add new moderators.')
            }
            // ── --info flag ───────────────────────────────────────────────
            if ('info' in flags) {
                // Try local first, then global
                const local = await getState(`auc:local:${M.from}`)
                const global_ = await getState('auc:global')
                const auction = local || global_

                if (!auction) {
                    return M.reply('❌ No active auction found in this group or globally.')
                }

                const remaining = Math.max(0, auction.endTime - Date.now())
                const bids = auction.bidHistory || []

                let msg =
                    `🏷️ *AUCTION INFO* (${auction.type.toUpperCase()})\n\n` +
                    `🃏 *Card:* ${auction.card.title} [${auction.card.tier}]\n` +
                    `👤 *Seller:* ${auction.sellerName}\n` +
                    `💰 *Start Price:* ₹${auction.startPrice.toLocaleString()}\n` +
                    `📈 *Current Bid:* ₹${auction.highestBid.toLocaleString()}\n`

                if (auction.highestBidder) {
                    msg += `👑 *Highest Bidder:* @${auction.highestBidder.split('@')[0]}\n`
                } else {
                    msg += `👑 *Highest Bidder:* None\n`
                }

                msg += `⏳ *Time Left:* ${fmtTime(remaining)}\n`
                msg += `📊 *Total Bids:* ${bids.length}\n`

                if (bids.length > 0) {
                    msg += `\n📋 *Bid History (last 5):*\n`
                    const last5 = bids.slice(-5).reverse()
                    last5.forEach((b, i) => {
                        const isTop = b.jid === auction.highestBidder
                        const time = new Date(b.at).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })
                        msg += `${i + 1}. ${isTop ? '👑 ' : ''}${b.name} — ₹${b.amount.toLocaleString()} (${time})\n`
                    })
                }

                return M.reply(msg.trim())
            }

            // ── --end flag ────────────────────────────────────────────────
            if ('end' in flags) {
                const auction = await getState(auctionKey)
                if (!auction) {
                    return M.reply('❌ No active auction found for this scope.')
                }
                if (auction.seller !== M.sender.id && !global.config.mods.includes(M.sender.id)) {
                    return M.reply('❌ Only the seller or a dev can manually end the auction.')
                }
                return await endAuction(client, auction, auctionKey)
            }

            // ── Start auction ─────────────────────────────────────────────
            const num = parseInt(args[0])
            if (isNaN(num) || num < 1 || num > 12) {
                return M.reply('❌ Invalid card index. Auctions are Deck-Only. Provide a number between 1 and 12.')
            }

            const durationSec = 'time' in flags ? Math.max(300, parseInt(flags.time.replace(/\D/g, '')) || 300) : 300
            const durationMs = Math.min(durationSec * 1000, MAX_DURATION_MS)

            if (durationMs < MIN_DURATION_MS) {
                return M.reply('❌ Minimum auction duration is 5 minutes (300s).')
            }

            // Check no existing auction for this scope
            const existing = await getState(auctionKey)
            if (existing) {
                return M.reply(
                    `❌ A ${type} auction is already running. Use *${global.config.prefix}auction --info* to check it.`
                )
            }

            // Pull card from deck AFTER all validations
            const card = await removeCardFromDeck(M.sender.id, num - 1)
            if (!card) {
                return M.reply(`❌ No card found at deck position ${num}.`)
            }

            const startPrice = Number(flags.bit) || getRandomInt(1000, 5000)

            if (startPrice < (card.price || 0)) {
                await addCardToDeck(M.sender.id, card)
                return M.reply(
                    `❌ Starting bid (₹${startPrice.toLocaleString()}) cannot be lower than the card's piece value (₹${(card.price || 0).toLocaleString()}).`
                )
            }

            // Groups to broadcast to
            let groups = [M.from]
            if (type === 'global') {
                const activeGroups = await getGroupsByFeatureState('card_spawn', true)
                groups = [...new Set([...activeGroups.map((g) => g.id), M.from])]
            }

            const seller = await findUser(M.sender.id, 'name')

            const auctionData = {
                id: randomString(8),
                seller: M.sender.id,
                sellerName: seller.name,
                card,
                startPrice,
                highestBid: startPrice,
                highestBidder: null,
                highestBidderName: null,
                type,
                orgGroup: M.from,
                groups,
                endTime: Date.now() + durationMs,
                bidHistory: [] // full audit trail
            }

            await saveState(auctionKey, auctionData)
            scheduleAuctionEnd(client, auctionData, auctionKey)

            await broadcast(
                client,
                groups,
                `🏷️ *AUCTION STARTED* (${type.toUpperCase()})\n\n` +
                    `🃏 *Card:* ${card.title} [${card.tier}]\n` +
                    `👤 *Seller:* ${seller.name}\n` +
                    `💰 *Starting Bid:* ₹${startPrice.toLocaleString()}\n` +
                    `⏳ *Duration:* ${fmtTime(durationMs)}\n\n` +
                    `Use *${global.config.prefix}bid <amount>* to place a bid!\n` +
                    `Use *${global.config.prefix}auction --info* to see current status.`
            )
        } catch (err) {
            console.error('[AUCTION ERROR]', err)
            return M.reply('❌ An error occurred.')
        }
    }
)
