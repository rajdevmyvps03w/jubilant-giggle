import { plugin } from '../../utils/plugin.js'
import { findUser, addCardToDeck, addCardToCollection, getDynamicCardPrice } from '../../database/db.js'
import { fetch, getBuffer, gifToMp4, realURL } from '../../functions/helpler.js'
import { getPrice, getTierEmoji } from '../../handler/card.js'

plugin(
    {
        name: 'addshoobcard',
        aliases: ['addshoob', 'giveshoob'],
        category: 'dev',
        isDev: true,
        description: {
            content: "Dev: Add a Shoob card to a user's deck by card ID.",
            usage: '<@user| reply> <card_id>',
            example: '@917003213983 12345'
        }
    },
    async (client, M, { text }) => {
        try {
            // ── 1. Resolve target ────────────────────────────────────────────
            const targetJid = M.mentioned?.[0] || (M.isQuoted ? M.quotedMessage?.participant : null)
            if (!targetJid) {
                return M.reply(
                    `❌ Please mention or reply to the user you want to give the card to.\n` +
                        `Usage: *${global.config.prefix}addshoobcard @user <card id>*`
                )
            }

            // ── 2. Extract card ID ───────────────────────────────────────────
            const cardId = text.replace(/@\d+/g, '').trim()
            if (!cardId) {
                return M.reply(
                    `❌ Please provide a card ID.\n` + `Usage: *${global.config.prefix}addshoobcard @user <card id>*`
                )
            }

            // ── 3. Verify target is registered ───────────────────────────────
            const targetUser = await findUser(targetJid, 'name cards.deck')
            if (!targetUser) {
                return M.reply(`❌ @${targetJid.split('@')[0]} is not registered in the bot.`)
            }

            await M.reply(`🔍 Fetching Shoob card *${cardId}*...`)
            // ── 4. Fetch card directly by ID ─────────────────────────────────
            const card = await fetch(`https://api-fawn-seven-28.vercel.app/api/getCard?id=${cardId}`)

            if (!card || card.error || !card.tier) {
                return M.reply(`❌ No Shoob card found for ID *${cardId}*. Double-check the ID and try again.`)
            }

            // ── 5. Pricing ───────────────────────────────────────────────────
            const basePrice = getPrice(card.tier)
            const price = await getDynamicCardPrice(basePrice, M.from)
            const emoji = getTierEmoji(card.tier)

            // ── 6. Media ─────────────────────────────────────────────────────
            const isAnimated = ['Tier 6', 'Tier S', 'SSR', 'UR'].includes(card.tier)

            let mediaUrl = await realURL(`https://asapi.shoob.gg/site/api/cardr/${card.id}`)
            if (mediaUrl.toLowerCase().endsWith('.webm')) {
                mediaUrl = mediaUrl.replace(/\.webm$/i, '.gif')
            }

            let buffer = await getBuffer(mediaUrl)
            let mediaType = 'image'
            let mimetype = 'image/jpeg'

            if (isAnimated) {
                buffer = await gifToMp4(buffer)
                mediaType = 'video'
                mimetype = 'video/mp4'
            }

            // ── 7. Build card object ──────────────────────────────────────────
            const cardObj = {
                id: card.id,
                title: card.title,
                source: card.source || 'Unknown',
                tier: card.tier,
                image: mediaUrl,
                url: card.url || null,
                price,
                basePrice,
                type: 'shoob',
                obtainedAt: new Date()
            }

            // ── 8. Deliver — deck first, overflow to collection ───────────────
            const wentToDeck = await addCardToDeck(targetJid, cardObj)
            if (!wentToDeck) {
                await addCardToCollection(targetJid, cardObj)
            }

            const dest = wentToDeck ? '📦 Deck' : '🗂️ Collection (deck full)'

            // ── 9. Send card image + caption ──────────────────────────────────
            const caption =
                `✅ *SHOOB CARD ADDED*\n\n` +
                `👤 *To:* ${targetUser.name}\n` +
                `🃏 *Card:* ${cardObj.title}\n` +
                `👑 *Tier:* ${cardObj.tier} ${emoji}\n` +
                `📝 *Source:* ${cardObj.source}\n` +
                `💰 *Value:* ₹${price.toLocaleString()}\n` +
                `🆔 *ID:* ${cardObj.id}\n` +
                `📥 *Stored in:* ${dest}\n\n` +
                `_Added by: ${M.sender.name}_`

            await client.sendMessage(M.from, {
                [mediaType]: buffer,
                mimetype,
                gifPlayback: isAnimated,
                caption
            })
        } catch (err) {
            console.error('[ADDSHOOBCARD ERROR]', err)
            return M.reply('❌ An error occurred while adding the Shoob card.')
        }
    }
)
