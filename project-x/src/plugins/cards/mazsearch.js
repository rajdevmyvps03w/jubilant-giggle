import { plugin } from '../../utils/plugin.js'
import { fetch, getBuffer, webpToPng, webpToMp4 } from '../../functions/helpler.js'
import { getPrice, getTierEmoji } from '../../handler/card.js'
import { getDynamicCardPrice } from '../../database/db.js'

plugin(
    {
        name: 'mazsearch',
        aliases: ['ms', 'msearch'],
        category: 'cards',
        isGroup: true,
        description: {
            content: 'Search for a Mazoku card with optional rarity flag.',
            usage: '<name> [--rarity=C | R | SR | SSR | UR]',
            example: 'rem --rarity=UR'
        }
    },
    async (_, M, { text, flags }) => {
        const characterName = text.trim()
        const rarity = flags.rarity?.toUpperCase()
        if (!characterName) {
            return M.reply('❌ Please provide a card name!')
        }

        if (!['C', 'R', 'SR', 'SSR', 'UR'].includes(rarity)) {
            return M.reply('Invalid rarity! Supported rarities are: C, R, SR, SSR, UR')
        }

        try {
            let searchUrl = `https://api-fawn-seven-28.vercel.app/api/mazokuNameSearch?name=${encodeURIComponent(characterName)}`
            if (rarity) {
                searchUrl += `&rarity=${rarity}`
            }
            const uuid = await fetch(searchUrl)
            if (uuid == 'No cards found') {
                return M.reply(
                    `❌ No results found for *${characterName}*${rarity ? ` with rarity *${rarity}* try without any --rarity=${rarity}` : ''}.`
                )
            }

            const card = await fetch(`https://api-fawn-seven-28.vercel.app/api/mazokuCard?uuid=${uuid}`)

            if (card.error) {
                return M.reply('❌ Failed to retrieve card details.')
            }

            // STEP 3: Setup Price and Tiers
            const basePrice = getPrice(card.tier)
            const price = await getDynamicCardPrice(basePrice, M.from)
            const emoji = getTierEmoji(card.tier)
            const isAnimated = ['UR', 'SSR'].includes(card.tier)

            // STEP 4: Process Media
            console.log(card, searchUrl)
            const buffer = await getBuffer(card.image, true)
            let type = 'image'
            let mime = 'image/jpeg'
            let img
            if (isAnimated) {
                img = await webpToMp4(buffer)
                type = 'video'
                mime = 'video/mp4'
            } else {
                img = await webpToPng(buffer)
            }

            // 4. Construct Caption
            const caption = [
                `🔍 *MAZOKU CARD SEARCH*`,
                '',
                `💠 *Title:* ${card.title}`,
                `👑 *Tier:* ${card.tier} ${emoji}`,
                `💰 *Est. Price:* ₹${price.toLocaleString()}`,
                `📝 *Source:* ${card.source || 'Unknown'}`,
                `🆔 *ID:* ${uuid}`,
                `📝 *Description:* ${card.title} from ${card.source || 'Original'}`
            ].join('\n')

            await M.replyRaw({
                [type]: img,
                mimetype: mime,
                gifPlayback: isAnimated,
                caption: caption
            })
        } catch (err) {
            console.error('[MAZ SEARCH ERROR]', err)
            return M.reply('❌ An error occurred while searching for the card. The API might be down.')
        }
    }
)
