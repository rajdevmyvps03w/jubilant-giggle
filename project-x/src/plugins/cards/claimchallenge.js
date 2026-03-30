// src/plugins/cards/claimchallenge.js

import { plugin } from '../../utils/plugin.js'
import {
    checkLiveChallenge,
    claimChallengeReward,
    addCardToDeck,
    addCardToCollection,
    getDynamicCardPrice,
    findUser
} from '../../database/db.js'
import { fetch, getBuffer, webpToPng, webpToMp4, gifToMp4, realURL } from '../../functions/helpler.js'
import { getPrice, getTierEmoji } from '../../handler/card.js'

// ─────────────────────────────────────────────────────────────────────────────
// deliverWishlistCard
// Fetches fresh card data from the API, builds the card object, adds it to
// the recipient's deck (or collection if deck is full), and sends the card
// media + caption into the chat.
//
// Falls back to cached wishlist data if the API is unreachable.
// Falls back to text-only message if media fetch fails.
//
// Returns { cardObj, dest } on success.
// Throws on unrecoverable errors (caller should catch).
// ─────────────────────────────────────────────────────────────────────────────
export const deliverWishlistCard = async (client, M, rewardCard, recipientJid, recipientName) => {
    const groupId = M.from

    // ── 1. Fetch fresh card data from API ────────────────────────────────────
    let freshCard = null
    try {
        if (rewardCard.type === 'maz') {
            freshCard = await fetch(`https://api-fawn-seven-28.vercel.app/api/mazokuCard?uuid=${rewardCard.id}`)
        } else {
            freshCard = await fetch(`https://api-fawn-seven-28.vercel.app/api/getCard?id=${rewardCard.id}`)
        }
    } catch (fetchErr) {
        console.error('[deliverWishlistCard] API fetch error — using cached wishlist data:', fetchErr.message)
    }

    // Use fresh data if valid, otherwise fall back to cached wishlist entry
    const cardData = freshCard && !freshCard.error && freshCard.tier ? freshCard : rewardCard
    const tier = cardData.tier || rewardCard.tier || 'Tier 1'
    const emoji = getTierEmoji(tier)

    // ── 2. Pricing ────────────────────────────────────────────────────────────
    const basePrice = getPrice(tier)
    const price = await getDynamicCardPrice(basePrice, groupId).catch(() => basePrice)

    // ── 3. Build card object ──────────────────────────────────────────────────
    const cardObj = {
        id: rewardCard.id,
        title: cardData.title || rewardCard.title || 'Unknown',
        source: cardData.source || rewardCard.source || 'Unknown',
        tier,
        image:
            rewardCard.type === 'maz'
                ? cardData.image || rewardCard.image
                : `https://asapi.shoob.gg/site/api/cardr/${rewardCard.id}`,
        url: cardData.url || null,
        price,
        basePrice,
        type: rewardCard.type,
        obtainedAt: new Date()
    }

    // ── 4. Add to deck (or collection if deck is full) ────────────────────────
    const wentToDeck = await addCardToDeck(recipientJid, cardObj)
    if (!wentToDeck) {
        await addCardToCollection(recipientJid, cardObj)
    }
    const dest = wentToDeck ? '📦 Deck' : '🗂️ Collection (deck full)'

    // ── 5. Fetch media ────────────────────────────────────────────────────────
    let media = null
    let mediaType = 'image'
    let mimetype = 'image/png'

    try {
        if (rewardCard.type === 'maz') {
            const isAnimated = ['SSR', 'UR'].includes(tier)
            const rawBuf = await getBuffer(cardObj.image, true)
            if (isAnimated) {
                media = await webpToMp4(rawBuf)
                mediaType = 'video'
                mimetype = 'video/mp4'
            } else {
                media = await webpToPng(rawBuf)
                mediaType = 'image'
                mimetype = 'image/png'
            }
        } else {
            const isAnimated = ['Tier 6', 'Tier S', 'SSR', 'UR'].includes(tier)
            let mediaUrl = await realURL(`https://asapi.shoob.gg/site/api/cardr/${rewardCard.id}`)
            if (mediaUrl.toLowerCase().endsWith('.webm')) {
                mediaUrl = mediaUrl.replace(/\.webm$/i, '.gif')
            }
            const rawBuf = await getBuffer(mediaUrl)
            if (isAnimated) {
                media = await gifToMp4(rawBuf)
                mediaType = 'video'
                mimetype = 'video/mp4'
            } else {
                media = rawBuf
                mediaType = 'image'
                mimetype = 'image/jpeg'
            }
        }
    } catch (mediaErr) {
        console.error('[deliverWishlistCard] Media fetch error — sending text fallback:', mediaErr.message)
        media = null
    }

    // ── 6. Send ───────────────────────────────────────────────────────────────
    const caption =
        `🏆 *CHALLENGE REWARD DELIVERED!*\n\n` +
        `👤 *Player:* ${recipientName}\n` +
        `🃏 *Card:* ${cardObj.title}\n` +
        `${emoji} *Tier:* ${tier}\n` +
        `📺 *Source:* ${cardObj.source}\n` +
        `💰 *Value:* ₹${price.toLocaleString()}\n` +
        `🔖 *Provider:* ${rewardCard.type === 'maz' ? 'Mazoku' : 'Shoob'}\n` +
        `📥 *Stored in:* ${dest}\n\n` +
        `_Earned by completing a personal challenge!_`

    if (media) {
        await client.sendMessage(M.from, {
            [mediaType]: media,
            mimetype,
            gifPlayback: mediaType === 'video',
            caption
        })
    } else {
        await client.sendMessage(M.from, { text: caption })
    }

    return { cardObj, dest }
}

plugin(
    {
        name: 'claimchallenge',
        aliases: ['claimchal', 'challengeclaim', 'getchal'],
        category: 'cards',
        description: {
            content: 'Claim the card reward for your completed challenge.'
        }
    },
    async (client, M) => {
        try {
            const prefix = global.config.prefix
            const jid = M.sender.id

            // ── Run live check first ───────────────────────────────────────────
            // Covers challenges that can't be incremented passively:
            // exp_milestone, wallet_milestone, global_lb_top10, local_lb_top5.
            // If the goal was reached, this marks the challenge as completed now.
            await checkLiveChallenge(jid, M.from)

            // ── Attempt to claim ──────────────────────────────────────────────
            const result = await claimChallengeReward(jid)

            if (!result.ok) {
                switch (result.error) {
                    case 'NOT_FOUND':
                        return M.reply(`❌ You are not registered in the bot.`)

                    case 'NO_COMPLETED_CHALLENGE':
                        return M.reply(
                            `⏳ *No completed challenge to claim.*\n\n` +
                                `You either have no active challenge or it isn't done yet.\n` +
                                `Use *${prefix}mychallenge* to check your progress.`
                        )

                    case 'CLAIM_EXPIRED':
                        return M.reply(
                            `⌛ *Claim window expired.*\n\n` +
                                `Your challenge was completed but the 48-hour claim window has passed.\n` +
                                `Use *${prefix}mychallenge* to get a fresh challenge.`
                        )

                    case 'REWARD_CARD_NOT_IN_WISHLIST':
                        return M.reply(
                            `⚠️ *Reward card no longer in your wishlist.*\n\n` +
                                `The card assigned as your reward (ID: \`${result.cardId}\`) ` +
                                `was removed from your wishlist before you claimed.\n\n` +
                                `Your challenge has been marked as claimed but no card was delivered. ` +
                                `Contact a moderator if you believe this is an error.`
                        )

                    default:
                        return M.reply(`❌ An unexpected error occurred while claiming your reward.\nPlease try again.`)
                }
            }

            // ── Deliver the card ──────────────────────────────────────────────
            const user = await findUser(jid, 'name')
            const recipientName = user?.name || 'Unknown'

            await M.reply(`🎁 *Delivering your reward card...*\nPlease wait a moment.`)

            try {
                await deliverWishlistCard(client, M, result.rewardCard, jid, recipientName)
            } catch (deliverErr) {
                console.error('[CLAIMCHALLENGE DELIVER ERROR]', deliverErr)
                // The card was already written to the DB before this point.
                // The user hasn't lost it — just inform them to check their deck.
                return M.reply(
                    `✅ *Challenge claimed!*\n\n` +
                        `Your card *${result.rewardCard.title}* has been added to your collection,\n` +
                        `but the card image could not be sent right now.\n` +
                        `Use *${prefix}deck* or *${prefix}collection* to verify it arrived.`
                )
            }
        } catch (err) {
            console.error('[CLAIMCHALLENGE ERROR]', err)
            return M.reply('❌ An error occurred while claiming your challenge reward.')
        }
    }
)
