import { plugin } from '../../utils/plugin.js'
import { User } from '../../database/models/index.js'

const TIER_EMOJI = {
    'Tier 1': '⚪',
    'Tier 2': '🟢',
    'Tier 3': '🔵',
    'Tier 4': '🟣',
    'Tier 5': '🟡',
    'Tier 6': '🔴',
    R: '🟣',
    SR: '🟡',
    SSR: '🔴',
    'Tier S': '🌟',
    UR: '💎'
}

plugin(
    {
        name: 'topcardvalue',
        aliases: ['tcv', 'mostexpensive', 'richcards'],
        category: 'cards',
        description: {
            content:
                'Shows the top 10 most expensive individual cards owned by any user. Use --global or --deck / --col to filter.',
            usage: '[--global] [--deck | --col]',
            example: '--global --deck'
        }
    },
    async (_, M, { flags }) => {
        try {
            const isGlobal = 'global' in flags || 'g' in flags || M.chat !== 'group'
            const deckOnly = 'deck' in flags
            const colOnly = 'col' in flags || 'collection' in flags

            const modJids = global.config.mods.map((m) => m.split('@')[0])

            // ── 1. Match: scope + exclude mods ───────────────────────────────
            const matchStage = {
                $match: {
                    jid: { $not: { $regex: modJids.join('|') } },
                    lid: { $not: { $regex: modJids.join('|') } }
                }
            }

            if (!isGlobal) {
                const groupMembers = M.participants.map((p) => p.id)
                matchStage.$match.$or = [{ jid: { $in: groupMembers } }, { lid: { $in: groupMembers } }]
            }

            // ── 2. Project: build a single flat array of cards to unwind ─────
            // Depending on flags, include deck, col, or both
            let cardArrayExpr
            if (deckOnly) {
                cardArrayExpr = { $ifNull: ['$cards.deck', []] }
            } else if (colOnly) {
                cardArrayExpr = { $ifNull: ['$cards.collection', []] }
            } else {
                cardArrayExpr = {
                    $concatArrays: [{ $ifNull: ['$cards.deck', []] }, { $ifNull: ['$cards.collection', []] }]
                }
            }

            const pipeline = [
                matchStage,
                // Project only what we need — drop all the heavy fields
                {
                    $project: {
                        name: 1,
                        allCards: cardArrayExpr
                    }
                },
                // Explode the array — one document per card
                { $unwind: '$allCards' },
                // Compute card value inside MongoDB
                {
                    $addFields: {
                        'allCards.value': {
                            $max: [{ $ifNull: ['$allCards.price', 0] }, { $ifNull: ['$allCards.basePrice', 0] }]
                        },
                        'allCards.owner': '$name'
                    }
                },
                // Drop zero-value cards before sorting
                { $match: { 'allCards.value': { $gt: 0 } } },
                // Sort all individual cards by value, take top 10
                { $sort: { 'allCards.value': -1 } },
                { $limit: 10 },
                // Clean up output shape
                {
                    $project: {
                        _id: 0,
                        title: { $ifNull: ['$allCards.title', 'Unknown'] },
                        source: { $ifNull: ['$allCards.source', 'Unknown'] },
                        tier: { $ifNull: ['$allCards.tier', '—'] },
                        type: { $ifNull: ['$allCards.type', 'shoob'] },
                        value: '$allCards.value',
                        owner: '$allCards.owner'
                    }
                }
            ]

            const top10 = await User.aggregate(pipeline)

            if (!top10 || top10.length === 0) {
                return M.reply(`🃏 No cards found for the ${isGlobal ? 'global' : 'group'} leaderboard.`)
            }

            // ── 3. Build message ──────────────────────────────────────────────
            const scopeLabel = isGlobal ? 'GLOBAL' : 'GROUP'
            const filterLabel = deckOnly ? ' · Deck Only' : colOnly ? ' · Collection Only' : ''

            let msg = `💎 *TOP ${top10.length} MOST EXPENSIVE CARDS* 💎\n`
            msg += `📊 *Scope:* ${scopeLabel}${filterLabel}\n\n`

            top10.forEach((card, i) => {
                const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`
                const tierEmoji = TIER_EMOJI[card.tier] || '🔹'

                msg += `${medal} *${card.title}*\n`
                msg += `   💰 *₹${card.value.toLocaleString()}*\n`
                msg += `   ${tierEmoji} ${card.tier}  •  📺 ${card.source}\n`
                msg += `   👤 *Owner:* ${card.owner}\n\n`
            })

            msg += `_Valued at the highest of market price or base price._`

            return M.reply(msg)
        } catch (err) {
            console.error('[TOPCARDVALUE ERROR]', err)
            return M.reply('❌ An error occurred while fetching the top cards.')
        }
    }
)
