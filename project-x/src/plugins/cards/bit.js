// src/plugins/cards/bit.js
// ─────────────────────────────────────────────────────────────────────────────
// Bidding command — race-condition safe via in-memory lock.
//
// Commands:
//   -bid <amount>         place a bid
//   -bid --list           show all bidders for active auction
// ─────────────────────────────────────────────────────────────────────────────

import { plugin } from '../../utils/plugin.js'
import {
    findUser,
    removeFromWallet,
    addToWallet,
    addGroupFunds,
    getState,
    saveState,
    calculateGroupTax
} from '../../database/db.js'
import { broadcast } from '../../functions/auction.js'

const _bidLocks = new Set() // auctionKey → locked while processing
const _userCooldown = new Map() // `${auctionKey}:${userId}` → last bid timestamp

const BID_COOLDOWN_MS = 5000 // 5s between bids from the same user
const MIN_BID_INCREMENT = 100 // must beat current bid by at least ₹100

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

plugin(
    {
        name: 'bit',
        aliases: ['bid'],
        category: 'cards',
        isGroup: true,
        description: {
            content: 'Place a bid on an active auction, or list all bids.',
            usage: '<amount> | --list',
            example: '15000'
        }
    },
    async (client, M, { args, flags }) => {
        try {
            // ── --list flag ───────────────────────────────────────────────
            if ('list' in flags) {
                const local = await getState(`auc:local:${M.from}`)
                const global_ = await getState('auc:global')
                const auction = local || global_

                if (!auction) {
                    return M.reply('❌ No active auction found in this group or globally.')
                }

                const bids = auction.bidHistory || []

                if (bids.length === 0) {
                    return M.reply(
                        `📋 *BID LIST — ${auction.card.title}*\n\n` +
                            `🪶 No bids have been placed yet.\n` +
                            `💰 Starting Price: ₹${auction.startPrice.toLocaleString()}\n` +
                            `⏳ Time Left: ${fmtTime(Math.max(0, auction.endTime - Date.now()))}`
                    )
                }

                let msg = `📋 *BID LIST ${auction.card.title}*\n\n`

                // Show all unique bidders with their highest bid
                const uniqueBidders = new Map()
                for (const b of bids) {
                    // Keep only the highest bid per user
                    if (!uniqueBidders.has(b.jid) || uniqueBidders.get(b.jid).amount < b.amount) {
                        uniqueBidders.set(b.jid, b)
                    }
                }

                // Sort by amount descending
                const sorted = [...uniqueBidders.values()].sort((a, b) => b.amount - a.amount)

                sorted.forEach((b, i) => {
                    const isTop = b.jid === auction.highestBidder
                    const time = new Date(b.at).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })
                    const medal = i === 0 ? '👑' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`
                    msg += `${medal} *${b.name}* — ₹${b.amount.toLocaleString()}\n`
                    msg += `   🕐 ${time}${isTop ? '  ← *current highest*' : ''}\n\n`
                })

                msg += `⏳ *Time Left:* ${fmtTime(Math.max(0, auction.endTime - Date.now()))}`
                return M.reply(msg.trim())
            }

            // ── Place a bid ───────────────────────────────────────────────
            const amount = Number(args[0])
            if (!args[0] || isNaN(amount) || amount <= 0 || !Number.isInteger(amount)) {
                return M.reply(`❌ Provide a valid whole number amount.\nUsage: *${global.config.prefix}bid <amount>*`)
            }

            // Locate the active auction — local takes priority over global
            const localKey = `auc:local:${M.from}`
            const globalKey = `auc:global`

            let auction = await getState(localKey)
            let auctionKey = localKey

            if (!auction) {
                auction = await getState(globalKey)
                auctionKey = globalKey
            }

            if (!auction) {
                return M.reply('❌ No active auction found in this group or globally.')
            }

            // ── Check auction hasn't expired ──────────────────────────────
            if (Date.now() >= auction.endTime) {
                return M.reply('❌ This auction has already ended.')
            }

            // ── Seller cannot bid ─────────────────────────────────────────
            if (M.sender.id === auction.seller) {
                return M.reply('❌ You cannot bid on your own auction.')
            }

            // ── Minimum increment check ───────────────────────────────────
            if (amount < auction.highestBid + MIN_BID_INCREMENT) {
                return M.reply(
                    `❌ *Invalid Bid!*\n\n` +
                        `⚠️ Your bid must be at least ₹${MIN_BID_INCREMENT.toLocaleString()} higher than the current bid.\n` +
                        `💰 Current Bid: ₹${auction.highestBid.toLocaleString()}\n` +
                        `📈 Minimum Required: ₹${(auction.highestBid + MIN_BID_INCREMENT).toLocaleString()}`
                )
            }

            // ── Per-user cooldown — prevents spam bidding ─────────────────
            const cooldownKey = `${auctionKey}:${M.sender.id}`
            const lastBid = _userCooldown.get(cooldownKey) || 0
            const cooldownLeft = BID_COOLDOWN_MS - (Date.now() - lastBid)

            if (cooldownLeft > 0) {
                return M.reply(`⏳ Please wait *${(cooldownLeft / 1000).toFixed(1)}s* before bidding again.`)
            }

            // ── Race condition lock — only one bid processes at a time ─────
            // If another bid is mid-flight for this auction, reject immediately.
            if (_bidLocks.has(auctionKey)) {
                return M.reply('⏳ Another bid is being processed. Please try again in a moment.')
            }

            _bidLocks.add(auctionKey)
            _userCooldown.set(cooldownKey, Date.now())

            try {
                // ── Re-fetch auction from DB inside the lock ──────────────
                // The cached `auction` object may be stale if another bid
                // landed between our getState and the lock acquisition.
                const freshAuction = await getState(auctionKey)

                if (!freshAuction || freshAuction.id !== auction.id) {
                    return M.reply('❌ The auction ended just as you placed your bid. Your wallet was not charged.')
                }

                // Re-validate bid amount against fresh state
                if (amount < freshAuction.highestBid + MIN_BID_INCREMENT) {
                    return M.reply(
                        `❌ Someone else just bid. Current bid is now *₹${freshAuction.highestBid.toLocaleString()}*.\n` +
                            `Minimum to beat it: *₹${(freshAuction.highestBid + MIN_BID_INCREMENT).toLocaleString()}*`
                    )
                }

                // ── Wallet check ──────────────────────────────────────────
                const user = await findUser(M.sender.id, 'name wallet')

                // Tax is applied on the bid amount
                const { tax } = await calculateGroupTax(M.sender.id, freshAuction.orgGroup, amount)
                const totalCost = amount + tax // total deducted from bidder's wallet

                if (user.wallet - totalCost < 0) {
                    return M.reply(
                        `❌ *Insufficient Funds!*\n\n` +
                            `💸 Bid Amount: ₹${amount.toLocaleString()}\n` +
                            `🧾 Tax: ₹${tax.toLocaleString()}\n` +
                            `💵 Total Cost: ₹${totalCost.toLocaleString()}\n` +
                            `🏦 Wallet Balance: ₹${user.wallet.toLocaleString()}`
                    )
                }

                // ── Process transactions ──────────────────────────────────
                // 1. Refund previous highest bidder first (their money was already
                //    deducted when they bid — we return exactly what they put in)
                if (freshAuction.highestBidder) {
                    await addToWallet(freshAuction.highestBidder, freshAuction.highestBid)
                }

                // 2. Deduct from new bidder (bid + tax)
                await removeFromWallet(M.sender.id, totalCost)

                // 3. Tax goes to the auction's origin group funds
                if (tax > 0) {
                    await addGroupFunds(freshAuction.orgGroup, tax)
                }

                // ── Update auction state ──────────────────────────────────
                const updatedAuction = {
                    ...freshAuction,
                    highestBid: amount,
                    highestBidder: M.sender.id,
                    highestBidderName: user.name,
                    bidHistory: [
                        ...(freshAuction.bidHistory || []),
                        {
                            jid: M.sender.id,
                            name: user.name,
                            amount,
                            tax,
                            at: Date.now()
                        }
                    ]
                }

                await saveState(auctionKey, updatedAuction)

                // ── Broadcast ─────────────────────────────────────────────
                const remaining = Math.max(0, freshAuction.endTime - Date.now())
                await broadcast(
                    client,
                    freshAuction.groups,
                    `📈 *NEW HIGHEST BID*\n\n` +
                        `🃏 *Card:* ${freshAuction.card.title} [${freshAuction.card.tier}]\n` +
                        `👤 *Bidder:* ${user.name}\n` +
                        `💰 *Bid:* ₹${amount.toLocaleString()}\n` +
                        `🏛️ *Tax:* ₹${tax.toLocaleString()}\n` +
                        `⏳ *Time Left:* ${fmtTime(remaining)}\n\n` +
                        `Use *${global.config.prefix}bid <amount>* to outbid!`
                )

                return M.reply(
                    `✅ *Bid placed!*\n\n` +
                        `💰 Bid: ₹${amount.toLocaleString()}\n` +
                        `🏛️ Tax: ₹${tax.toLocaleString()}\n` +
                        `💸 Total deducted: ₹${totalCost.toLocaleString()}\n\n` +
                        `_If you are outbid, your ₹${amount.toLocaleString()} will be refunded automatically._`
                )
            } finally {
                // Always release the lock, even if an error occurred
                _bidLocks.delete(auctionKey)
            }
        } catch (err) {
            console.error('[BID ERROR]', err)
            _bidLocks.delete(`auc:local:${M.from}`)
            _bidLocks.delete('auc:global')
            return M.reply('❌ An error occurred while placing your bid.')
        }
    }
)
