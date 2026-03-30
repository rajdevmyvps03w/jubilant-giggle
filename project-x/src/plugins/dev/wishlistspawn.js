// src/plugins/dev/wishlistspawn.js

import { plugin } from '../../utils/plugin.js'
import {
    findUser,
    addCardToDeck,
    addCardToCollection,
    getDynamicCardPrice,
    getActiveChallenge
} from '../../database/db.js'
import { fetch, getBuffer, webpToPng, webpToMp4, gifToMp4, realURL } from '../../functions/helpler.js'
import { getPrice, getTierEmoji } from '../../handler/card.js'
import { User } from '../../database/models/index.js'

plugin(
    {
        name: 'wishlistspawn',
        aliases: ['wlspawn', 'spawnwishlist'],
        category: 'dev',
        isDev: true,
        description: {
            content:
                "Spawn a specific card from a user's wishlist by index and give it to them. Resets any active challenge for that card.",
            usage: '<@user | reply> <index>',
            example: '@917003213983 1'
        }
    },
    async (client, M, { text }) => {
        try {
            // ── 1. Resolve target ─────────────────────────────────────────────
            const targetJid = M.mentioned?.[0] || (M.isQuoted ? M.quotedMessage?.participant : null)
            if (!targetJid) {
                return M.reply(
                    `❌ Please mention or reply to the user.\n` +
                        `Usage: *${global.config.prefix}wishlistspawn @user <index>*`
                )
            }

            // ── 2. Parse index ────────────────────────────────────────────────
            const cleanText = text.replace(/@\d+/g, '').trim()
            const idx = parseInt(cleanText)

            if (isNaN(idx) || idx < 1) {
                return M.reply(
                    `❌ Please provide a valid wishlist index.\n` +
                        `Usage: *${global.config.prefix}wishlistspawn @user <index>*`
                )
            }

            // ── 3. Fetch target user + wishlist ───────────────────────────────
            const targetUser = await findUser(targetJid, 'name jid wishlist')
            if (!targetUser) {
                return M.reply(`❌ That user is not registered in the bot.`)
            }

            const wishlist = targetUser.wishlist || []
            if (!wishlist.length) return M.reply(`❌ *${targetUser.name}* has no cards in their wishlist.`)

            const card = wishlist[idx - 1]
            if (!card) {
                return M.reply(
                    `❌ Invalid index *${idx}*. *${targetUser.name}* has ${wishlist.length} card(s) in their wishlist.`
                )
            }

            await M.reply(`🔍 Fetching *${card.title}* (${card.type === 'maz' ? 'Mazoku' : 'Shoob'})...`)

            // ── 4. Re-fetch fresh card data from API ──────────────────────────
            let freshCard
            if (card.type === 'maz') {
                freshCard = await fetch(`https://api-fawn-seven-28.vercel.app/api/mazokuCard?uuid=${card.id}`)
            } else {
                freshCard = await fetch(`https://api-fawn-seven-28.vercel.app/api/getCard?id=${card.id}`)
            }

            if (!freshCard || freshCard.error || !freshCard.tier) {
                return M.reply(`❌ Could not fetch card data for *${card.title}*. The API may be down.`)
            }

            // ── 5. Pricing ────────────────────────────────────────────────────
            const basePrice = getPrice(freshCard.tier)
            const price = await getDynamicCardPrice(basePrice, M.from)
            const emoji = getTierEmoji(freshCard.tier)

            // ── 6. Media ──────────────────────────────────────────────────────
            let media, mediaType, mimetype

            if (card.type === 'maz') {
                const isAnimated = ['SSR', 'UR'].includes(freshCard.tier)
                const buffer = await getBuffer(freshCard.image, true)

                if (isAnimated) {
                    media = await webpToMp4(buffer)
                    mediaType = 'video'
                    mimetype = 'video/mp4'
                } else {
                    media = await webpToPng(buffer)
                    mediaType = 'image'
                    mimetype = 'image/png'
                }
            } else {
                const isAnimated = ['Tier 6', 'Tier S'].includes(freshCard.tier)
                let mediaUrl = await realURL(`https://asapi.shoob.gg/site/api/cardr/${freshCard.id}`)
                if (mediaUrl.toLowerCase().endsWith('.webm')) {
                    mediaUrl = mediaUrl.replace(/\.webm$/i, '.gif')
                }

                const buffer = await getBuffer(mediaUrl)

                if (isAnimated) {
                    media = await gifToMp4(buffer)
                    mediaType = 'video'
                    mimetype = 'video/mp4'
                } else {
                    media = buffer
                    mediaType = 'image'
                    mimetype = 'image/jpeg'
                }
            }

            // ── 7. Build card object ──────────────────────────────────────────
            const cardObj = {
                id: card.id,
                title: freshCard.title || card.title,
                source: freshCard.source || card.source || 'Unknown',
                tier: freshCard.tier,
                image: card.type === 'maz' ? freshCard.image : card.image,
                url: freshCard.url || null,
                price,
                basePrice,
                type: card.type,
                obtainedAt: new Date()
            }

            // ── 8. Deliver card ───────────────────────────────────────────────
            const wentToDeck = await addCardToDeck(targetJid, cardObj)
            if (!wentToDeck) {
                await addCardToCollection(targetJid, cardObj)
            }

            const dest = wentToDeck ? '📦 Deck' : '🗂️ Collection (deck full)'

            // ── 9. Reset active challenge if it targets this card ─────────────
            let challengeResetMsg = ''
            try {
                const activeChallenge = await getActiveChallenge(targetJid)

                if (activeChallenge && activeChallenge.cardId === card.id) {
                    await User.updateOne(
                        { $or: [{ jid: targetJid }, { lid: targetJid }] },
                        { $pull: { challenges: { cardId: card.id, rewardClaimed: false } } }
                    )
                    challengeResetMsg =
                        `\n⚠️ *Active challenge reset* ~ the challenge for this card has been cleared.\n` +
                        `📊 Progress *${activeChallenge.progress}/${activeChallenge.goal}* was wiped.\n` +
                        `_User can run *${global.config.prefix}mychallenge* to roll for a new one._`

                    client
                        .sendMessage(targetJid, {
                            text:
                                `⚠️ *Challenge Reset*\n\n` +
                                `Your active challenge for *${card.title}* has been cleared by a developer.\n` +
                                `The card was directly added to your inventory.\n\n` +
                                `Use *${global.config.prefix}mychallenge* to roll for a new challenge!`
                        })
                        .catch(() => {})
                }
            } catch (chalErr) {
                console.error('[WISHLISTSPAWN] Challenge reset error:', chalErr.message)
            }

            // ── 10. Send ──────────────────────────────────────────────────────
            const caption =
                `✅ *WISHLIST CARD SPAWNED*\n\n` +
                `👤 *To:* ${targetUser.name}\n` +
                `🃏 *Card:* ${cardObj.title}\n` +
                `${emoji} *Tier:* ${cardObj.tier}\n` +
                `📺 *Source:* ${cardObj.source}\n` +
                `💰 *Value:* ₹${price.toLocaleString()}\n` +
                `🔖 *Provider:* ${card.type === 'maz' ? 'Mazoku' : 'Shoob'}\n` +
                `🆔 *ID:* ${card.id}\n` +
                `📥 *Stored in:* ${dest}\n` +
                `📋 *Wishlist index:* #${idx}` +
                challengeResetMsg +
                `\n\n_Spawned by: ${M.sender.name}_`

            await client.sendMessage(M.from, {
                [mediaType]: media,
                mimetype,
                gifPlayback: mediaType === 'video',
                caption
            })
        } catch (err) {
            console.error('[WISHLISTSPAWN ERROR]', err)
            return M.reply('❌ An error occurred while spawning the wishlist card.')
        }
    }
)
