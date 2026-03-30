import { plugin } from '../../utils/plugin.js'
import { findUser } from '../../database/db.js'

plugin(
    {
        name: 'searchcard',
        aliases: ['scard', 'findcard', 'src'],
        category: 'cards',
        description: {
            content: 'Search through your deck and collection. Matches the formatting of the cards command.',
            usage: '<query>',
            example: 'rem'
        }
    },
    async (_, M, { text }) => {
        if (!text) {
            return M.reply('❌ Please provide a title or source to search for!')
        }

        try {
            const user = await findUser(M.sender.id)

            const deck = user.cards?.deck || []
            const collection = user.cards?.collection || []
            const query = text.toLowerCase()

            const results = []

            // Helper to process and find matches
            const processSearch = (array, type) => {
                array.forEach((card, index) => {
                    const c = typeof card.toObject === 'function' ? card.toObject() : card
                    if (c.title?.toLowerCase().includes(query) || c.source?.toLowerCase().includes(query)) {
                        results.push({ ...c, type, pos: index + 1 })
                    }
                })
            }

            processSearch(deck, 'deck')
            processSearch(collection, 'coll')

            if (!results.length) {
                return M.reply(`❌ No cards found matching "${text}" in your deck or collection.`)
            }

            // Match your specific tierOrder from the cards command
            const tierOrder = [
                'UR',
                'SSR',
                'SR',
                'R',
                'C',
                'Tier S',
                'Tier 6',
                'Tier 5',
                'Tier 4',
                'Tier 3',
                'Tier 2',
                'Tier 1'
            ]

            // Grouping for the "Similarities" section
            const grouped = {}
            results.forEach((card) => {
                const tier = card.tier || 'Unknown'
                if (!grouped[tier]) {
                    grouped[tier] = 0
                }
                grouped[tier]++
            })

            let caption = `🔍 *Search Results for:* "${text}"\n\n`

            // Similarities section (Organized by your Tier Order)
            caption += `📊 *Similarities Found:* \n`
            const allFoundTiers = Object.keys(grouped)

            // Sort tiers based on your specific order
            const sortedTiers = allFoundTiers.sort((a, b) => {
                let indexA = tierOrder.indexOf(a)
                let indexB = tierOrder.indexOf(b)
                if (indexA === -1) indexA = 99
                if (indexB === -1) indexB = 99
                return indexA - indexB
            })

            for (const tier of sortedTiers) {
                caption += `▫️ ${tier}: ${grouped[tier]} matching card(s)\n`
            }

            caption += `\n\n`

            // Listing results
            results.forEach((item, i) => {
                const cmd = item.type === 'deck' ? `${global.config.prefix}deck` : `${global.config.prefix}collec`
                const locationLabel = item.type === 'deck' ? '📦 Deck' : '🗂 Collection'

                caption += `*${i + 1}.* ${item.title} (${item.tier || 'N/A'})\n`
                caption += `   ${locationLabel} | Source: ${item.source || 'Unknown'}\n`
                caption += `   💡 Use: *${cmd} ${item.pos}*\n\n`
            })

            caption += `Note: Use the commands above to view the card details.`

            return M.reply(caption)
        } catch (err) {
            console.error('[SEARCHCARD ERROR]', err)
            return M.reply('❌ An error occurred during the search.')
        }
    }
)
