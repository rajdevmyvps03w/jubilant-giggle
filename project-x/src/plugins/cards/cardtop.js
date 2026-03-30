import { plugin } from '../../utils/plugin.js'
import { User } from '../../database/models/index.js'

plugin(
    {
        name: 'topcardwealth',
        aliases: ['tcw', 'cardlb', 'cardtop'],
        category: 'cards',
        description: {
            content:
                'Displays the top 10 users with the highest card wealth (Deck + Collection). Use --global or --local.',
            usage: '[--global]',
            example: '--global'
        }
    },
    async (_, M, { flags }) => {
        try {
            const isGlobal = 'global' in flags || 'g' in flags || M.chat !== 'group'
            const groupId = M.from

            const modJids = global.config.mods.map((m) => m.split('@')[0])

            // ── 1. Match: filter to group members + exclude mods ─────────────
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

            // ── 2. Project: compute card wealth + count inside MongoDB ────────
            const pipeline = [
                matchStage,
                {
                    $project: {
                        name: 1,
                        jid: 1,
                        'bank.id': 1,
                        cardCount: {
                            $add: [
                                { $size: { $ifNull: ['$cards.deck', []] } },
                                { $size: { $ifNull: ['$cards.collection', []] } }
                            ]
                        },
                        wealth: {
                            $sum: {
                                $map: {
                                    input: {
                                        $concatArrays: [
                                            { $ifNull: ['$cards.deck', []] },
                                            { $ifNull: ['$cards.collection', []] }
                                        ]
                                    },
                                    as: 'card',
                                    in: {
                                        $max: [{ $ifNull: ['$$card.price', 0] }, { $ifNull: ['$$card.basePrice', 0] }]
                                    }
                                }
                            }
                        }
                    }
                },
                { $match: { wealth: { $gt: 0 } } },
                { $sort: { wealth: -1 } },
                { $limit: 10 }
            ]

            const top10 = await User.aggregate(pipeline)

            if (!top10 || top10.length === 0) {
                return M.reply(`🃏 No users found for the ${isGlobal ? 'global' : 'local'} leaderboard.`)
            }

            // ── 3. Build message ──────────────────────────────────────────────
            const typeLabel = isGlobal ? 'GLOBAL' : 'GROUP'
            let message = `🏆 *${typeLabel} CARD WEALTH LEADERBOARD* 🏆\n\n`

            top10.forEach((user, index) => {
                const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🔹'
                const homeTag = user.bank?.id === groupId ? ' 🏠 *(Home)*' : ''

                message += `${medal} *#${index + 1}: ${user.name}*${homeTag}\n`
                message += `💰 Value: *₹${user.wealth.toLocaleString()}*\n`
                message += `🎴 Cards: ${user.cardCount}\n\n`
            })

            message += `💡 Calculated using the highest market or base price for all cards in Deck & Collection.`

            return M.reply(message)
        } catch (err) {
            console.error('[CARD LEADERBOARD ERROR]', err)
            return M.reply('❌ An error occurred while generating the leaderboard.')
        }
    }
)
