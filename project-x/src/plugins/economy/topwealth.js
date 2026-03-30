import { plugin } from '../../utils/plugin.js'
import { User } from '../../database/models/index.js'

plugin(
    {
        name: 'topwealth',
        aliases: ['tw', 'richlb', 'topmoney'],
        category: 'economy',
        description: {
            content: 'Top 10 richest users. Use --global/--local and --card=true/false.',
            usage: '[--global | --local] [--card=BOOLEAN]',
            example: '--local --card=true'
        }
    },
    async (_, M, { flags }) => {
        try {
            const isGlobal = 'global' in flags || 'g' in flags || M.chat !== 'group'
            const includeCards = flags.card === 'true'
            const groupId = M.from

            const modJids = global.config.mods.map((m) => m.split('@')[0])

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

            const projectStage = includeCards
                ? {
                      $project: {
                          name: 1,
                          jid: 1,
                          'bank.id': 1,
                          moneyWealth: {
                              $add: [{ $ifNull: ['$wallet', 0] }, { $ifNull: ['$bank.value', 0] }]
                          },
                          cardWealth: {
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
                  }
                : {
                      $project: {
                          name: 1,
                          jid: 1,
                          'bank.id': 1,
                          moneyWealth: {
                              $add: [{ $ifNull: ['$wallet', 0] }, { $ifNull: ['$bank.value', 0] }]
                          },
                          cardWealth: { $literal: 0 }
                      }
                  }

            const pipeline = [
                matchStage,
                projectStage,
                {
                    $addFields: {
                        total: { $add: ['$moneyWealth', '$cardWealth'] }
                    }
                },
                { $match: { total: { $gt: 0 } } },
                { $sort: { total: -1 } },
                { $limit: 10 }
            ]

            const top10 = await User.aggregate(pipeline)

            if (!top10 || top10.length === 0) {
                return M.reply(`🃏 No users found for the ${isGlobal ? 'global' : 'local'} leaderboard.`)
            }

            // ── 4. Build message ──────────────────────────────────────────────
            let message = `🏆 *${isGlobal ? 'GLOBAL' : 'GROUP'} WEALTH LEADERBOARD* 🏆\n`
            message += `📊 Mode: ${includeCards ? 'Combined (Money + Cards)' : 'Economy Only'}\n\n`

            top10.forEach((user, i) => {
                const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '🔹'
                const homeTag = user.bank?.id === groupId ? ' 🏠 *(Home)*' : ''

                message += `${medal} *#${i + 1}: ${user.name}*${homeTag}\n`
                message += `💰 Total: *₹${user.total.toLocaleString()}*\n`
                if (includeCards) {
                    message += `💵 Cash: ₹${user.moneyWealth.toLocaleString()} | 🎴 Cards: ₹${user.cardWealth.toLocaleString()}\n`
                }
                message += `\n`
            })

            message += `💡 Ranked by total net worth in ${isGlobal ? 'the system' : 'this chat'}.`

            return M.reply(message)
        } catch (err) {
            console.error('[TOPWEALTH ERROR]', err)
            return M.reply('❌ Failed to calculate the leaderboard.')
        }
    }
)
