import { plugin } from '../../utils/plugin.js'
import { findUser, addCardToDeck, addCardToCollection, getDynamicCardPrice } from '../../database/db.js'
import { fetch, getBuffer, webpToPng, webpToMp4 } from '../../functions/helpler.js'
import { getPrice, getTierEmoji } from '../../handler/card.js'

plugin(
    {
        name: 'addmazcard',
        aliases: ['addmaz', 'givemaz'],
        category: 'dev',
        isDev: true,
        description: {
            content: "Dev: Add a Mazoku card to a user's deck by UUID.",
            usage: '<@user | reply> <uuid>',
            example: '@917003213983 abc-123-xyz'
        }
    },
    async (client, M, { text }) => {
        try {
            // ── 1. Resolve target ────────────────────────────────────────────
            const targetJid = M.mentioned?.[0] || (M.isQuoted ? M.quotedMessage?.participant : null)
            if (!targetJid) {
                return M.reply(
                    `❌ Please mention or reply to the user you want to give the card to.\n` +
                        `Usage: *${global.config.prefix}addmazcard @user <uuid>*`
                )
            }

            // ── 2. Extract UUID ──────────────────────────────────────────────
            const uuid = text.replace(/@\d+/g, '').trim()
            if (!uuid) {
                return M.reply(
                    `❌ Please provide a card UUID.\n` + `Usage: *${global.config.prefix}addmazcard @user <uuid>*`
                )
            }

            // ── 3. Verify target is registered ───────────────────────────────
            const targetUser = await findUser(targetJid, 'name cards.deck')
            if (!targetUser) {
                return M.reply(`❌ @${targetJid.split('@')[0]} is not registered in the bot.`)
            }

            await M.reply(`🔍 Fetching Mazoku card *${uuid}*...`)

            // ── 4. Fetch card directly by UUID ───────────────────────────────
            const card = await fetch(`https://api-fawn-seven-28.vercel.app/api/mazokuCard?uuid=${uuid}`)

            if (!card || card.error || !card.tier) {
                return M.reply(`❌ No Mazoku card found for UUID *${uuid}*. Double-check the UUID and try again.`)
            }

            // ── 5. Pricing ───────────────────────────────────────────────────
            const basePrice = getPrice(card.tier)
            const price = await getDynamicCardPrice(basePrice, M.from)
            const emoji = getTierEmoji(card.tier)

            // ── 6. Media ─────────────────────────────────────────────────────
            const isAnimated = ['SSR', 'UR'].includes(card.tier)

            const buffer = await getBuffer(card.image, true)
            let media, mediaType, mimetype

            if (isAnimated) {
                media = await webpToMp4(buffer)
                mediaType = 'video'
                mimetype = 'video/mp4'
            } else {
                media = await webpToPng(buffer)
                mediaType = 'image'
                mimetype = 'image/png'
            }

            // ── 7. Build card object ──────────────────────────────────────────
            const cardObj = {
                id: uuid,
                title: card.title,
                source: card.source || 'Unknown',
                tier: card.tier,
                image: card.image,
                url: null,
                price,
                basePrice,
                type: 'maz',
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
                `✅ *MAZOKU CARD ADDED*\n\n` +
                `👤 *To:* ${targetUser.name}\n` +
                `🃏 *Card:* ${cardObj.title}\n` +
                `👑 *Tier:* ${cardObj.tier} ${emoji}\n` +
                `📝 *Source:* ${cardObj.source}\n` +
                `💰 *Value:* ₹${price.toLocaleString()}\n` +
                `🆔 *UUID:* ${uuid}\n` +
                `📥 *Stored in:* ${dest}\n\n` +
                `_Added by: ${M.sender.name}_`

            await client.sendMessage(M.from, {
                [mediaType]: media,
                mimetype,
                gifPlayback: isAnimated,
                caption
            })
        } catch (err) {
            console.error('[ADDMAZCARD ERROR]', err)
            return M.reply('❌ An error occurred while adding the Mazoku card.')
        }
    }
)
