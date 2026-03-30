import { plugin } from '../../utils/plugin.js'
import { findUser, editUser } from '../../database/db.js'
import { getTierEmoji } from '../../handler/card.js'
import { getBuffer, webpToMp4, webpToPng, gifToMp4 } from '../../functions/helpler.js'
import { createHash } from 'crypto'

const _deckCache = new Map()
const MAX_CACHE_AGE = 6 * 60 * 60 * 1000 // 6 hours
const MS_PER_DAY = 24 * 60 * 60 * 1000

const COLLAGE_API = 'https://permuim-along-deck-main.vercel.app/api/combine-images'

const deckHash = (deck, bgUrl = null) =>
    createHash('sha1')
        .update(deck.map((c) => `${c.id}:${c.image}:${c.price}`).join('|') + (bgUrl || ''))
        .digest('hex')
        .slice(0, 16)

// ─────────────────────────────────────────────────────────────────────────────
plugin(
    {
        name: 'deck',
        aliases: ['mydeck', 'dk'],
        category: 'cards',
        isGroup: true,
        description: {
            content: 'View your active 12-card deck. Use an index to see specific card stats.',
            usage: '<index>',
            example: '3'
        }
    },
    async (_, M, { args }) => {
        try {
            // Fetch user with deck AND customDeck for background support
            const user = await findUser(M.sender.id, 'cards.deck customDeck')
            const deck = user?.cards?.deck || []
            const customDeck = user?.customDeck

            if (!deck.length) {
                return M.reply(
                    `🪹 Your deck is currently empty. Use *${global.config.prefix}col2deck* to add cards from your collection!`
                )
            }

            /* ---------- DETAILED CARD VIEW (BY INDEX) ---------- */
            if (args[0]) {
                const index = parseInt(args[0])
                if (isNaN(index) || index < 1 || index > deck.length) {
                    return M.reply(`❌ Invalid index. Choose a number between 1 and ${deck.length}.`)
                }

                const card = deck[index - 1]
                const emoji = getTierEmoji(card.tier)
                const media = await prepareMedia(card)

                if (!media?.buffer) {
                    return M.reply('❌ Failed to load this card image.')
                }

                return M.replyRaw({
                    [media.type]: media.buffer,
                    mimetype: media.mime,
                    gifPlayback: media.isGif,
                    caption: [
                        `🃏 *DECK CARD #${index}*`,
                        '',
                        `💠 *Title:* ${card.title}`,
                        `👑 *Tier:* ${card.tier} ${emoji}`,
                        `🏷️ *Type:* ${card.type?.toUpperCase() || 'UNKNOWN'}`,
                        `💰 *Base Price:* ₹${(card.basePrice || 0).toLocaleString()}`,
                        `🧩 *Piece Value:* ₹${(card.price || 0).toLocaleString()}`,
                        '',
                        `📝 *Description:* ${card.title} from ${card.source || 'Original'}`
                    ].join('\n')
                })
            }

            /* ---------- DECK OVERVIEW WITH COLLAGE (CACHED) ---------- */

            const jid = M.sender.id
            const now = Date.now()

            // ── Check for valid custom deck background ─────────────────────────
            let bgUrl = null
            let bgCaption = ''

            if (customDeck?.url && customDeck?.expiresAt) {
                if (now > customDeck.expiresAt) {
                    // Expired — clean up silently
                    await editUser(M.sender.id, { customDeck: null }).catch(() => {})
                    console.log(`[DECK BG] Expired for ${jid.split('@')[0]}, cleaned up`)
                } else {
                    bgUrl = customDeck.url
                    const daysLeft = Math.ceil((customDeck.expiresAt - now) / MS_PER_DAY)
                    let urgency = ''
                    if (daysLeft <= 3) {
                        urgency = ' ⚠️ _Expiring soon!_'
                    } else if (daysLeft <= 7) {
                        urgency = ` _(${daysLeft}d left)_`
                    }
                    bgCaption = `\n🖼️ *Custom BG expires in:* ${daysLeft} day${daysLeft !== 1 ? 's' : ''}${urgency}`
                }
            }

            console.log(bgUrl)
            const currentHash = deckHash(deck, bgUrl)
            const cached = _deckCache.get(jid)

            // Caption always rebuilt fresh — titles/tiers can change independently
            let msg = `🃏 *YOUR ACTIVE DECK (${deck.length}/12)*\n\n`
            deck.forEach((card, i) => {
                msg += `${i + 1}. ${getTierEmoji(card.tier)} *${card.title}*\n   🎏 Tier: ${card.tier}\n\n`
            })
            msg += `Use *${global.config.prefix}deck <number>* for full card details.`
            if (bgCaption) {
                msg += bgCaption
            }

            if (cached && cached.hash === currentHash && now - cached.builtAt < MAX_CACHE_AGE) {
                console.log(`[DECK CACHE] ✅ Hit ${jid.split('@')[0]} (${currentHash})`)
                return M.replyRaw({
                    video: cached.buffer,
                    mimetype: 'video/mp4',
                    gifPlayback: true,
                    caption: msg.trim()
                })
            }

            // ── Cache miss — rebuild ──────────────────────────────────────
            const reason = !cached
                ? 'first time'
                : cached.hash !== currentHash
                  ? cached.bgUrl !== bgUrl
                      ? 'background changed'
                      : 'deck changed'
                  : 'cache expired'
            console.log(`[DECK CACHE] 🔄 Miss ${jid.split('@')[0]}: ${reason}`)

            // Resolve the direct image URL for each card
            const imageUrls = deck.slice(0, 12).map((card) => resolveCardUrl(card))

            // Build the API query string: pic1=...&pic2=...&pic3=...
            const params = new URLSearchParams()
            imageUrls.forEach((url, i) => {
                if (url) {
                    params.set(`pic${i + 1}`, url)
                }
            })

            // ── Add custom background URL if available ───────────────────────
            if (bgUrl) {
                params.set('bgurl', bgUrl)
                console.log(`[DECK BG] Using custom background for ${jid.split('@')[0]}`)
            }

            const apiUrl = `${COLLAGE_API}?${params.toString()}`
            console.log(`[DECK COLLAGE] Fetching remote collage for ${deck.length} cards${bgUrl ? ' with BG' : ''}...`)

            let mp4Buffer = null
            try {
                mp4Buffer = await getBuffer(apiUrl)
            } catch (err) {
                console.error('[DECK COLLAGE] API fetch failed:', err.message)
            }

            if (mp4Buffer && mp4Buffer.length > 0) {
                _deckCache.set(jid, {
                    hash: currentHash,
                    buffer: mp4Buffer,
                    builtAt: now,
                    bgUrl: bgUrl // Store bgUrl to detect BG changes
                })
                console.log(
                    `[DECK CACHE] 💾 Stored ${jid.split('@')[0]} (${currentHash}, ${(mp4Buffer.length / 1024).toFixed(0)}kb)`
                )
                return M.replyRaw({
                    video: mp4Buffer,
                    mimetype: 'video/mp4',
                    gifPlayback: true,
                    caption: msg.trim()
                })
            }

            // Collage API failed — send text-only fallback, don't cache
            console.warn('[DECK COLLAGE] Falling back to text-only response')
            return M.reply(msg.trim())
        } catch (err) {
            console.error('[DECK COMMAND ERROR]', err)
            return M.reply('❌ Failed to load your deck inventory.')
        }
    }
)

// ── Resolve the best direct URL for a card ───────────────────────────────────
// The API needs plain image URLs (no local buffers), so we derive them here.
const resolveCardUrl = (card) => {
    if (!card?.image) {
        return null
    }
    let url = card.image

    if (card.type === 'shoob') {
        // shoob uses .webm for animated tiers — swap to .gif for the API
        if (url.toLowerCase().endsWith('.webm')) {
            url = url.replace(/\.webm$/i, '.gif')
        }
    }
    // maz and other types: use the URL as-is
    return url
}

// ── Individual card media helper (used for indexed single-card view) ──────────
const prepareMedia = async (card) => {
    const media = { buffer: null, type: 'image', mime: 'image/png', isGif: false }

    try {
        if (card.type === 'maz') {
            const raw = await getBuffer(card.image, true)
            media.isGif = ['UR', 'SSR'].includes(card.tier)
            if (media.isGif) {
                media.buffer = await webpToMp4(raw)
                media.type = 'video'
                media.mime = 'video/mp4'
            } else {
                media.buffer = await webpToPng(raw)
            }
        } else if (card.type === 'shoob') {
            let url = card.image || ''
            if (url.toLowerCase().endsWith('.webm')) url = url.replace(/\.webm$/i, '.gif')
            const raw = await getBuffer(url)
            media.isGif = ['Tier 6', 'Tier S'].includes(card.tier)
            if (media.isGif) {
                media.buffer = await gifToMp4(raw)
                media.type = 'video'
                media.mime = 'video/mp4'
            } else {
                media.buffer = raw
            }
        } else {
            media.buffer = await getBuffer(card.image)
        }
    } catch (err) {
        console.error(`[DECK] Media load failed for "${card.title}":`, err.message)
        return null
    }

    return media
}
