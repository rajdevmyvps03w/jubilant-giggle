import fs from 'fs'
import { plugin } from '../../utils/plugin.js'
import { fetch, getBuffer, gifToMp4, realURL } from '../../functions/helpler.js'
import { getPrice, getTierEmoji } from '../../handler/card.js'
import { getDynamicCardPrice } from '../../database/db.js'

// Helper to search local JSON
const searchLocalCards = (query, tier) => {
    try {
        if (!fs.existsSync('./cards.json')) return null
        const allCards = JSON.parse(fs.readFileSync('./cards.json', 'utf8'))

        const results = allCards.filter((card) => {
            const nameMatch = card.title.toLowerCase().includes(query.toLowerCase())
            const tierMatch = !tier || card.tier.toUpperCase() === tier || card.tier.toUpperCase() === `Tier ${tier}`

            return nameMatch && tierMatch
        })

        return results.length > 0 ? results[0] : null // Return first match
    } catch (e) {
        console.error('[LOCAL_SEARCH_ERROR]', e)
        return null
    }
}

plugin(
    {
        name: 'shoobsearch',
        aliases: ['ss', 'ssearch'],
        category: 'cards',
        isGroup: true,
        description: {
            content: 'Search for a Shoob card with local JSON fallback.',
            usage: '<name> [--tier=1 | 2 | 3 | 4 | 5 | 6 | S]',
            example: 'rem --tier=S'
        }
    },
    async (_, M, { text, flags }) => {
        const query = text.trim()
        const tier = flags.tier?.toUpperCase()

        if (!query) {
            return M.reply('❌ Please provide a character name for the Shoob search!')
        }

        if (!['1', '2', '3', '4', '5', '6', 'S'].includes(tier)) {
            return M.reply('Invalid rarity! Supported tier are: 1, 2, 3 , 4, 5, 6, S')
        }

        try {
            let card = null
            let cardId = null

            // --- STEP 1: SEARCH LOCAL JSON FIRST ---
            const localCard = searchLocalCards(query, tier)

            if (localCard) {
                console.log(`[DEBUG] Found "${query}" in local cards.json`)
                card = localCard
                cardId = card.id
            } else {
                // --- STEP 2: FALLBACK TO API ---
                let searchUrl = `https://api-fawn-seven-28.vercel.app/api/shoobNameSearch?query=${encodeURIComponent(query)}`
                if (tier) {
                    searchUrl += `&tier=${tier}`
                }

                const apiId = await fetch(searchUrl)

                if (apiId && apiId !== 'No cards found') {
                    cardId = apiId
                    card = await fetch(`https://api-fawn-seven-28.vercel.app/api/getCard?id=${cardId}`)
                }
            }

            if (!card || card.error || !card.tier) {
                return M.reply(`❌ No Shoob results found for *${query}*${tier ? ` in Tier *${tier}*` : ''}.`)
            }

            // STEP 3: Pricing & Tiers
            const basePrice = getPrice(card.tier)
            const price = await getDynamicCardPrice(basePrice, M.from)
            const emoji = getTierEmoji(card.tier)
            const isAnimated = ['Tier 6', 'Tier S', 'UR', 'SSR'].includes(card.tier)

            // STEP 4: Media Processing
            let mediaUrl = await realURL(`https://asapi.shoob.gg/site/api/cardr/${card.id}`)
            if (mediaUrl.toLowerCase().endsWith('.webm')) {
                mediaUrl = mediaUrl.replace(/\.webm$/i, '.gif')
            }
            let buffer = await getBuffer(mediaUrl)
            let type = 'image'
            let mime = 'image/jpeg'

            if (isAnimated) {
                buffer = await gifToMp4(buffer)
                type = 'video'
                mime = 'video/mp4'
            }

            // STEP 5: Construct Caption
            const caption = [
                `🔍 *SHOOB SEARCH RESULT* ${localCard ? '(Local)' : '(Cloud)'}`,
                '',
                `💠 *Title:* ${card.title}`,
                `👑 *Tier:* ${card.tier} ${emoji}`,
                `💰 *Value:* ₹${price.toLocaleString()}`,
                `📝 *Source:* ${card.source || 'Unknown'}`,
                `🆔 *ID:* ${cardId}`,
                `📝 *Description:* ${card.title} from ${card.source || 'Original'}`
            ].join('\n')

            await M.replyRaw({
                [type]: buffer,
                mimetype: mime,
                gifPlayback: isAnimated,
                caption: caption
            })
        } catch (err) {
            console.error('[SHOOB SEARCH ERROR]', err)
            return M.reply('❌ An error occurred while searching for the card.')
        }
    }
)
