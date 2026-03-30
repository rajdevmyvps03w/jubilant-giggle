import { plugin } from '../../utils/plugin.js'
import { findUser } from '../../database/db.js'
import { User } from '../../database/models/index.js'
import { getTierEmoji } from '../../handler/card.js'

plugin(
    {
        name: 'cardowners',
        aliases: ['whoowns', 'ownedby', 'cardinfo'],
        category: 'cards',
        isGroup: true,
        description: {
            content: 'See how many users own a specific card from your deck or collection.',
            usage: '<index> [--loc=deck|col]',
            example: '3 --loc=col'
        }
    },
    async (_, M, { args, flags }) => {
        try {
            /* 1. PARSE --loc FLAG — default deck ────────────────────────── */
            const locRaw = flags.loc?.toLowerCase()
            const isCollection = locRaw === 'col' || locRaw === 'collection'

            if (locRaw && locRaw !== 'deck' && locRaw !== 'col' && locRaw !== 'collection') {
                return M.reply(`❌ Invalid location. Use:\n` + `• *--loc=deck* (default)\n` + `• *--loc=col*`)
            }

            /* 2. PARSE INDEX ─────────────────────────────────────────────── */
            const indexArg = parseInt(args[0])
            if (!args[0] || isNaN(indexArg) || indexArg < 1) {
                return M.reply(
                    `❌ Please provide a valid card index.\n\n` +
                        `Usage: *${global.config.prefix}cardowners <index> [--loc=deck|col]*\n` +
                        `Example: *${global.config.prefix}cardowners 3 --loc=col*`
                )
            }

            const index = indexArg - 1

            /* 3. FETCH SENDER'S CARD ─────────────────────────────────────── */
            const user = await findUser(M.sender.id, isCollection ? 'cards.collection' : 'cards.deck')
            const cards = isCollection ? user?.cards?.collection || [] : user?.cards?.deck || []

            if (!cards.length) {
                return M.reply(isCollection ? `📦 Your collection is empty.` : `🪹 Your deck is empty.`)
            }

            if (indexArg > cards.length) {
                return M.reply(
                    `❌ Invalid index. You only have *${cards.length}* card(s) in your ${isCollection ? 'collection' : 'deck'}.`
                )
            }

            const targetCard = cards[index]
            const emoji = getTierEmoji(targetCard.tier)
            const cardTitle = targetCard.title

            /* 4. SINGLE AGGREGATION — counts + top 10 owners in one query ── */
            const pipeline = [
                // Only pull users who actually own this card
                {
                    $match: {
                        $or: [
                            { 'cards.deck': { $elemMatch: { title: cardTitle } } },
                            { 'cards.collection': { $elemMatch: { title: cardTitle } } }
                        ]
                    }
                },
                // Compute per-user deck/col counts inside MongoDB
                {
                    $project: {
                        name: 1,
                        deckCount: {
                            $size: {
                                $filter: {
                                    input: { $ifNull: ['$cards.deck', []] },
                                    as: 'c',
                                    cond: { $eq: ['$$c.title', cardTitle] }
                                }
                            }
                        },
                        colCount: {
                            $size: {
                                $filter: {
                                    input: { $ifNull: ['$cards.collection', []] },
                                    as: 'c',
                                    cond: { $eq: ['$$c.title', cardTitle] }
                                }
                            }
                        }
                    }
                },
                // Sort by total copies owned descending so top owners come first
                {
                    $addFields: {
                        totalCopies: { $add: ['$deckCount', '$colCount'] }
                    }
                },
                { $sort: { totalCopies: -1 } }
            ]

            const ownersRaw = await User.aggregate(pipeline)

            const totalUnique = ownersRaw.length

            // Global deck/col counts derived from the same result — no extra DB calls
            const deckOwners = ownersRaw.filter((u) => u.deckCount > 0).length
            const colOwners = ownersRaw.filter((u) => u.colCount > 0).length

            /* 5. BUILD OWNER LIST (top 10) ───────────────────────────────── */
            const ownerLines = ownersRaw.slice(0, 10).map((u, i) => {
                const locations = []
                if (u.deckCount > 0) {
                    locations.push(`Deck ×${u.deckCount}`)
                }
                if (u.colCount > 0) {
                    locations.push(`Col ×${u.colCount}`)
                }
                return `${i + 1}. *${u.name || 'Unknown'}* — ${locations.join(', ')}`
            })

            const moreText = totalUnique > 10 ? `\n_...and ${totalUnique - 10} more owner(s)._` : ''

            /* 6. REPLY ───────────────────────────────────────────────────── */
            return M.reply(
                `🔍 *Card Ownership Info*\n\n` +
                    `🃏 *${cardTitle}*\n` +
                    `${emoji} *Tier:* ${targetCard.tier}\n` +
                    `📺 *Source:* ${targetCard.source || 'Unknown'}\n` +
                    `🏷️ *Type:* ${(targetCard.type || 'shoob').toUpperCase()}\n\n` +
                    `👥 *Total Unique Owners:* ${totalUnique}\n` +
                    `📦 *In Decks:* ${deckOwners}\n` +
                    `🗂️ *In Collections:* ${colOwners}\n\n` +
                    (ownerLines.length > 0
                        ? `*Top Owners:*\n${ownerLines.join('\n')}${moreText}`
                        : `_No one else owns this card._`)
            )
        } catch (err) {
            console.error('[CARDOWNERS ERROR]', err)
            return M.reply('❌ An error occurred while fetching card ownership data.')
        }
    }
)
