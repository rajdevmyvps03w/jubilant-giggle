import { plugin } from '../../utils/plugin.js'
import { addToWishlist, getState, saveState } from '../../database/db.js'
import { fetch, getUrls } from '../../functions/helpler.js'
import { getTierEmoji } from '../../handler/card.js'

const MAZ_REGEX = /mazoku\.cc\/card\/([a-f0-9-]{36})/i
const SHOOB_REGEX = /shoob\.gg\/cards\/info\/([a-f0-9]{24})/i
const WISHLIST_LIMIT = 20
const WISHLIST_COOLDOWN = 48 * 60 * 60 * 1000 // 24 hours

plugin(
    {
        name: 'wishlistadd',
        aliases: ['wladd', 'addwishlist', 'wl+'],
        category: 'cards',
        description: {
            content: 'Add a card to your wishlist using its Mazoku or Shoob URL.',
            usage: '<mazoku_url | shoob_url>',
            example: 'https://mazoku.cc/card/e2607c48-40f4-41e8-b236-02434ef33749'
        }
    },
    async (_, M, { text }) => {
        try {
            if (!text) {
                return M.reply(
                    `📋 *WISHLIST ADD*\n\n` +
                        `Paste a card URL to add it to your wishlist.\n\n` +
                        `*Supported URLs:*\n` +
                        `• https://mazoku.cc/card/<uuid>\n` +
                        `• https://shoob.gg/cards/info/<id>\n\n` +
                        `📌 *Usage:* ${global.config.prefix}wishlistadd <url>\n` +
                        `🔢 *Limit:* ${WISHLIST_LIMIT} cards\n` +
                        `⏳ *Cooldown:* 48 hours per add`
                )
            }

            // ── Cooldown check ────────────────────────────────────────────────
            const cdKey = `wishlistadd:cd:${M.sender.id}`
            const lastAdd = await getState(cdKey)

            if (lastAdd) {
                const elapsed = Date.now() - lastAdd
                const remaining = WISHLIST_COOLDOWN - elapsed

                if (remaining > 0) {
                    const h = Math.floor(remaining / 3600000)
                    const m = Math.floor((remaining % 3600000) / 60000)
                    return M.reply(
                        `⏳ *Wishlist Cooldown Active*\n\n` +
                            `You can only add one card every *24 hours*.\n` +
                            `Come back in *${h}h ${m}m*.\n\n` +
                            `_This cooldown exists to keep the challenge system fair._`
                    )
                }
            }

            // ── Extract URL ───────────────────────────────────────────────────
            const urlList = [...getUrls(text)]
            if (!urlList.length) return M.reply('❌ No valid URL found in your message.')

            const url = urlList[0]
            const mazMatch = url.match(MAZ_REGEX)
            const shoobMatch = url.match(SHOOB_REGEX)

            if (!mazMatch && !shoobMatch) {
                return M.reply(
                    `❌ *Invalid URL.*\n\nOnly these are supported:\n` +
                        `• https://mazoku.cc/card/<uuid>\n` +
                        `• https://shoob.gg/cards/info/<id>`
                )
            }

            const provider = mazMatch ? 'maz' : 'shoob'
            const cardId = mazMatch ? mazMatch[1] : shoobMatch[1]

            await M.reply(`🔍 Fetching card info...`)

            // ── Fetch card data ───────────────────────────────────────────────
            let card
            if (provider === 'maz') {
                card = await fetch(`https://api-fawn-seven-28.vercel.app/api/mazokuCard?uuid=${cardId}`)
            } else {
                card = await fetch(`https://api-fawn-seven-28.vercel.app/api/getCard?id=${cardId}`)
            }

            if (!card || card.error || !card.tier) {
                return M.reply(`❌ Could not fetch card data. The card may not exist or the API is down.`)
            }

            const emoji = getTierEmoji(card.tier)
            const cardEntry = {
                id: cardId,
                title: card.title || 'Unknown',
                source: card.source || 'Unknown',
                tier: card.tier,
                image: provider === 'maz' ? card.image : `https://asapi.shoob.gg/site/api/cardr/${cardId}`,
                type: provider,
                addedAt: Date.now()
            }

            // ── Save to wishlist ──────────────────────────────────────────────
            const result = await addToWishlist(M.sender.id, cardEntry)

            if (!result.ok) {
                if (result.error === 'ALREADY_IN_WISHLIST') {
                    return M.reply(`⚠️ *${card.title}* is already in your wishlist.`)
                }
                if (result.error === 'LIMIT_REACHED') {
                    return M.reply(
                        `❌ *Wishlist Full!*\n\n` +
                            `You've reached the limit of *${WISHLIST_LIMIT} cards*.\n` +
                            `Use *${global.config.prefix}mywishlist --remove=INDEX* to free up space.`
                    )
                }
                return M.reply('❌ An error occurred while adding to your wishlist.')
            }

            // ── Set cooldown AFTER successful add ─────────────────────────────
            await saveState(cdKey, Date.now(), WISHLIST_COOLDOWN)

            return M.reply(
                `✅ *Added to Wishlist!*\n\n` +
                    `🃏 *Card:* ${card.title}\n` +
                    `${emoji} *Tier:* ${card.tier}\n` +
                    `📺 *Source:* ${card.source || 'Unknown'}\n` +
                    `🔖 *Provider:* ${provider === 'maz' ? 'Mazoku' : 'Shoob'}\n` +
                    `🆔 *ID:* ${cardId}\n\n` +
                    `⏳ *Next add available in:* 24 hours\n\n` +
                    `_View your wishlist: *${global.config.prefix}mywishlist*_\n` +
                    `_Try your luck: *${global.config.prefix}mychallenge*_`
            )
        } catch (err) {
            console.error('[WISHLISTADD ERROR]', err)
            return M.reply('❌ An error occurred while adding to your wishlist.')
        }
    }
)
