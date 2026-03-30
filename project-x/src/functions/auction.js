import {
    findUser,
    addCardToDeck,
    addCardToCollection,
    addToWallet,
    getState,
    deleteState,
    hasWarnType,
    addGroupFunds
} from '../database/db.js'
import { State } from '../database/models/index.js'
import { getRandomInt } from './helpler.js'

const _auctionTimers = new Map()

export const broadcast = async (client, groups, text, mentions = []) => {
    for (const jid of groups) {
        await client.sendMessage(jid, { text, mentions }).catch(() => {})
    }
}

export const scheduleAuctionEnd = (client, auction, auctionKey) => {
    // Cancel existing timer if any (important during crash recovery)
    if (_auctionTimers.has(auctionKey)) {
        clearTimeout(_auctionTimers.get(auctionKey))
    }

    const remaining = Math.max(0, auction.endTime - Date.now())

    const handle = setTimeout(async () => {
        _auctionTimers.delete(auctionKey)
        // Re-fetch from DB — state may have changed since timer was set
        const current = await getState(auctionKey)
        if (current && current.id === auction.id) {
            await endAuction(client, current, auctionKey)
        }
    }, remaining)

    _auctionTimers.set(auctionKey, handle)
}

export const endAuction = async (client, auction, auctionKey) => {
    try {
        const deleted = await deleteState(auctionKey)
        if (!deleted || deleted.deletedCount === 0) {
            return
        } // already ended

        // ── No bids placed ────────────────────────────────────────────────
        if (!auction.highestBidder) {
            const seller = await findUser(auction.seller, 'cards.deck')
            const deckFull = (seller?.cards?.deck?.length || 0) >= 12
            if (deckFull) {
                await addCardToCollection(auction.seller, auction.card)
            } else {
                await addCardToDeck(auction.seller, auction.card)
            }

            return await broadcast(
                client,
                auction.groups,
                `❌ *AUCTION ENDED — NO BIDS*\n\n` +
                    `🃏 *Card:* ${auction.card.title} [${auction.card.tier}]\n` +
                    `The card has been returned to *${auction.sellerName}*.`
            )
        }

        // ── Process winner ────────────────────────────────────────────────
        const winnerId = auction.highestBidder
        let sellerReward = auction.highestBid

        // Warning Type 5: economy penalty on seller
        const isRestricted5 = await hasWarnType(auction.seller, auction.orgGroup, 5)
        if (isRestricted5) {
            const penaltyPct = getRandomInt(50, 90)
            const deduction = Math.floor(sellerReward * (penaltyPct / 100))
            sellerReward -= deduction
            await addGroupFunds(auction.orgGroup, deduction)
            await client.sendMessage(auction.orgGroup, {
                text:
                    `📉 *PENALTY NOTICE (Type 5)*\n\n` +
                    `Seller's earnings reduced by *${penaltyPct}%* due to warning status.\n` +
                    `💰 *₹${deduction.toLocaleString()}* transferred to Group Funds.`
            })
        }

        // Pay seller — winner's bid was already deducted from their wallet
        // when they placed the bid, so we just add to seller now
        await addToWallet(auction.seller, sellerReward)

        // Warning Type 6: card redirect
        const isRestricted6 = await hasWarnType(winnerId, auction.orgGroup, 6)
        if (isRestricted6) {
            const meta = client.cachedGroupMetadata(auction.orgGroup)
            const participants = meta?.participants?.map((p) => p.id) || []
            const shuffled = [...participants].sort(() => 0.5 - Math.random())
            let luckyUser = null

            for (const p of shuffled) {
                if (p !== winnerId && (await isRegUser(p))) {
                    luckyUser = p
                    break
                }
            }

            if (luckyUser) {
                const wentToDeck = await addCardToDeck(luckyUser, auction.card)
                if (!wentToDeck) {
                    await addCardToCollection(luckyUser, auction.card)
                }

                return await broadcast(
                    client,
                    auction.groups,
                    `🚫 *CLAIM RESTRICTED (Type 6)*\n\n` +
                        `*@${winnerId.split('@')[0]}*'s card was redirected to *@${luckyUser.split('@')[0]}*`,
                    [winnerId, luckyUser]
                )
            }

            return await client.sendMessage(auction.orgGroup, {
                text: '🚫 *CLAIM RESTRICTED:* No registered members available to receive the card.'
            })
        }

        // Give card to winner
        const wentToDeck = await addCardToDeck(winnerId, auction.card)
        if (!wentToDeck) {
            await addCardToCollection(winnerId, auction.card)
        }

        await broadcast(
            client,
            auction.groups,
            `🏆 *AUCTION CONCLUDED*\n\n` +
                `🃏 *Card:* ${auction.card.title} [${auction.card.tier}]\n` +
                `👑 *Winner:* @${winnerId.split('@')[0]}\n` +
                `💰 *Final Price:* ₹${auction.highestBid.toLocaleString()}\n` +
                `💵 *Seller Received:* ₹${sellerReward.toLocaleString()}\n\n` +
                `The card has been added to the winner's inventory.`,
            [winnerId]
        )
    } catch (err) {
        console.error('[AUCTION END ERROR]', err)
    }
}

export const restoreAuctions = async (client) => {
    try {
        const docs = await State.find({ key: /^auc:/ }).lean()

        let restored = 0
        let ended = 0

        for (const doc of docs) {
            const auction = doc.data
            if (!auction?.id) continue

            const key = doc.key

            if (Date.now() >= auction.endTime) {
                // Expired during downtime — end immediately
                await endAuction(client, auction, key)
                ended++
            } else {
                // Still live — restore the countdown timer
                scheduleAuctionEnd(client, auction, key)
                restored++
            }
        }

        if (docs.length > 0) {
            console.log(`[AUCTION] Restored ${restored} active, ended ${ended} expired auction(s)`)
        }
    } catch (err) {
        console.error('[AUCTION RESTORE ERROR]', err)
    }
}
