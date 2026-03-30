import { plugin } from '../../utils/plugin.js'
import { findUser } from '../../database/db.js'

plugin(
    {
        name: 'cards',
        aliases: ['mycards'],
        category: 'cards',
        description: {
            content: 'View all your cards. Use --org to organize by tier.'
        }
    },
    async (_, M, { flags }) => {
        try {
            const user = await findUser(M.sender.id, 'cards')

            const deck = user.cards?.deck || []
            const collection = user.cards?.collection || []
            const allCards = [...deck, ...collection]

            if (allCards.length === 0) {
                return M.reply('🃏 Your inventory is empty. Start spawning cards to build your deck!')
            }

            const indexMap = new Map()
            allCards.forEach((card, i) => {
                indexMap.set(card.id, i + 1)
            })

            /* ---------- ORGANIZED VIEW (--org) ---------- */
            if ('org' in flags) {
                const grouped = {}
                for (const card of allCards) {
                    const tier = card.tier || 'Unknown'
                    if (!grouped[tier]) grouped[tier] = []
                    grouped[tier].push(card)
                }

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

                let output = `🃏 *YOUR CARDS (ORGANIZED BY TIER)*\n`
                output += `\n📦 *Deck:* ${deck.length}/12`
                output += `\n🗂 *Collection:* ${collection.length}\n`

                for (const tier of tierOrder) {
                    if (!grouped[tier]) continue

                    output += `\n\n👑 *${tier}* (${grouped[tier].length})\n`
                    output += grouped[tier].map((c) => `${indexMap.get(c.id)}. ${c.title}`).join('\n')
                }

                for (const tier in grouped) {
                    if (!tierOrder.includes(tier)) {
                        output += `\n\n👑 *${tier}* (${grouped[tier].length})\n`
                        output += grouped[tier].map((c) => `${indexMap.get(c.id)}. ${c.title}`).join('\n')
                    }
                }

                return M.reply(output)
            }

            /* ---------- NORMAL VIEW (sorted strictly by index) ---------- */
            const sortedCards = [...allCards].sort((a, b) => indexMap.get(a.id) - indexMap.get(b.id))

            let output = `🃏 *YOUR CARD INVENTORY*\n`
            output += `\n\n📦 *Deck:* ${deck.length}/12`
            output += `\n🗂 *Collection:* ${collection.length}\n\n`

            output += sortedCards
                .map((c, i) => {
                    const displayIndex = i + 1
                    return `*${displayIndex}.* *${c.title}*\n   👑 Tier: ${c.tier || 'Unknown'}`
                })
                .join('\n\n')

            return M.reply(output)
        } catch (err) {
            console.error('[CARDS COMMAND ERROR]', err)
            return M.reply('❌ An error occurred while fetching your card inventory.')
        }
    }
)
