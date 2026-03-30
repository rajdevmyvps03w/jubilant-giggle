import { plugin } from '../../utils/plugin.js'
import { User } from '../../database/models/index.js'

plugin(
    {
        name: 'topcollector',
        aliases: ['tc', 'topcol'],
        category: 'cards',
        description: {
            content: 'Search for top collectors of a specific card name or series.',
            usage: '<search_term> [--type=name | --type=series]',
            example: 'Naruto --type=series'
        }
    },
    async (_, M, { text, flags }) => {
        try {
            const type = flags.type ?? 'name'
            const searchField = type === 'series' ? 'source' : 'title'

            if (!text) {
                return M.reply(
                    `❓ *HOW TO SEARCH*\n\n` +
                        `You must provide a search term and specify the type.\n\n` +
                        `• *--type=name* : Search for a specific card (e.g. Naruto Uzumaki)\n` +
                        `• *--type=series* : Search for a whole anime (e.g. One Piece)\n\n` +
                        `📝 *Example:* ${global.config.prefix}topcollector Luffy --type=name`
                )
            }

            const searchRegex = new RegExp(text, 'i')

            const pipeline = [
                // ── 1. Match: only users who have at least one matching card ──
                {
                    $match: {
                        $or: [
                            { 'cards.deck': { $elemMatch: { [searchField]: searchRegex } } },
                            { 'cards.collection': { $elemMatch: { [searchField]: searchRegex } } }
                        ]
                    }
                },
                // ── 2. Project: build a flat array of ONLY matching cards ─────
                {
                    $project: {
                        name: 1,
                        matchingCards: {
                            $filter: {
                                input: {
                                    $concatArrays: [
                                        { $ifNull: ['$cards.deck', []] },
                                        { $ifNull: ['$cards.collection', []] }
                                    ]
                                },
                                as: 'card',
                                cond: {
                                    $regexMatch: {
                                        input: { $ifNull: [`$$card.${searchField}`, ''] },
                                        regex: text,
                                        options: 'i'
                                    }
                                }
                            }
                        }
                    }
                },
                // ── 3. Compute count + total value inside MongoDB ─────────────
                {
                    $addFields: {
                        count: { $size: '$matchingCards' },
                        value: {
                            $sum: {
                                $map: {
                                    input: '$matchingCards',
                                    as: 'card',
                                    in: {
                                        $max: [{ $ifNull: ['$$card.price', 0] }, { $ifNull: ['$$card.basePrice', 0] }]
                                    }
                                }
                            }
                        }
                    }
                },
                // Drop users where no cards actually matched after filtering
                { $match: { count: { $gt: 0 } } },
                // ── 4. Sort + limit in MongoDB ────────────────────────────────
                { $sort: { count: -1, value: -1 } },
                { $limit: 10 },
                // ── 5. Keep only what we need for the reply ───────────────────
                {
                    $project: {
                        name: 1,
                        count: 1,
                        value: 1,
                        // Build tier summary inside MongoDB too
                        tierCounts: {
                            $arrayToObject: {
                                $map: {
                                    input: {
                                        $setUnion: {
                                            $map: {
                                                input: '$matchingCards',
                                                as: 'c',
                                                in: { $ifNull: [{ $toUpper: '$$c.tier' }, 'UNKNOWN'] }
                                            }
                                        }
                                    },
                                    as: 'tier',
                                    in: {
                                        k: '$$tier',
                                        v: {
                                            $size: {
                                                $filter: {
                                                    input: '$matchingCards',
                                                    as: 'c',
                                                    cond: {
                                                        $eq: [
                                                            { $ifNull: [{ $toUpper: '$$c.tier' }, 'UNKNOWN'] },
                                                            '$$tier'
                                                        ]
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            ]

            const topCollectors = await User.aggregate(pipeline)

            if (!topCollectors || topCollectors.length === 0) {
                return M.reply(`🃏 No collectors found for ${type}: *${text}*`)
            }

            // ── 6. Build message ──────────────────────────────────────────────
            let message = `🏆 *TOP COLLECTORS* 🏆\n`
            message += `🔍 *Target:* ${text} (${type.toUpperCase()})\n\n`

            topCollectors.forEach((user, i) => {
                const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '🔹'

                // Sort tier entries by count descending
                const tierStr =
                    Object.entries(user.tierCounts || {})
                        .sort((a, b) => b[1] - a[1])
                        .map(([tier, count]) => `${tier}: ${count}`)
                        .join(' | ') || 'None'

                message += `${medal} *#${i + 1}: ${user.name}*\n`
                message += `📊 Owned: *${user.count}* cards\n`
                message += `💰 Net Value: *₹${user.value.toLocaleString()}*\n`
                message += `✨ *Tiers:* ${tierStr}\n\n`
            })

            message += `💡 _Ranked by quantity owned, followed by market value._`

            return M.reply(message)
        } catch (err) {
            console.error('[TOP COLLECTOR ERROR]', err)
            return M.reply('❌ An error occurred while searching for collectors.')
        }
    }
)
