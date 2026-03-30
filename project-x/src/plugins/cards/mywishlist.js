import { plugin } from '../../utils/plugin.js'
import { getWishlist, removeFromWishlist } from '../../database/db.js'
import { User } from '../../database/models/index.js'
import { getTierEmoji } from '../../handler/card.js'

plugin(
    {
        name: 'mywishlist',
        aliases: ['wishlist', 'wl', 'totalwishlist'],
        category: 'cards',
        description: {
            content:
                'View your wishlist or see who has the most wishlisted cards. Use --local or --global for leaderboard. Use --remove <index> to remove a card.',
            usage: '[--local | --global] [--remove=INDEX]',
            example: '--global'
        }
    },
    async (_, M, { flags }) => {
        try {
            const prefix = global.config.prefix

            // ── --remove <index> ──────────────────────────────────────────────
            if ('remove' in flags) {
                const idx = parseInt(flags.remove)
                if (isNaN(idx) || idx < 1) {
                    return M.reply(`❌ Invalid index. Usage: *${prefix}wishlist --remove=INDEX*`)
                }

                const user = await getWishlist(M.sender.id)
                if (!user?.wishlist?.length) {
                    return M.reply('📋 Your wishlist is empty.')
                }

                const card = user.wishlist[idx - 1]
                if (!card) {
                    return M.reply(`❌ No card at index *${idx}*. You have ${user.wishlist.length} card(s).`)
                }

                await removeFromWishlist(M.sender.id, card.id)

                return M.reply(
                    `🗑️ *Removed from Wishlist*\n\n` +
                        `🃏 *${card.title}* (${card.tier}) has been removed.\n\n` +
                        `_View your updated list: *${prefix}wishlist*_`
                )
            }

            const isGlobal = 'global' in flags || 'g' in flags
            const isLocal = 'local' in flags || 'l' in flags

            // ── Leaderboard mode (--global or --local) ────────────────────────
            if (isGlobal || isLocal) {
                let users
                if (isGlobal) {
                    users = await User.find({ 'wishlist.0': { $exists: true } }, 'name wishlist').lean()
                } else {
                    const groupMembers = M.participants.map((p) => p.id)
                    users = await User.find(
                        {
                            $and: [
                                { $or: [{ jid: { $in: groupMembers } }, { lid: { $in: groupMembers } }] },
                                { 'wishlist.0': { $exists: true } }
                            ]
                        },
                        'name wishlist'
                    ).lean()
                }

                if (!users?.length) {
                    return M.reply(`📋 No wishlists found for the ${isGlobal ? 'global' : 'group'} leaderboard.`)
                }

                const ranked = users
                    .map((u) => ({ name: u.name, count: u.wishlist.length }))
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 10)

                const scopeLabel = isGlobal ? 'GLOBAL' : 'GROUP'
                let msg = `📋 *${scopeLabel} WISHLIST LEADERBOARD*\n\n`

                ranked.forEach((u, i) => {
                    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`
                    msg += `${medal} *${u.name}*\n`
                    msg += `   🃏 ${u.count} card(s) wishlisted\n\n`
                })

                msg += `_Use *${prefix}wishlistadd <url>* to add cards to your wishlist._`
                return M.reply(msg)
            }

            // ── Personal wishlist ─────────────────────────────────────────────
            const user = await getWishlist(M.sender.id)

            if (!user?.wishlist?.length) {
                return M.reply(
                    `📋 *Your Wishlist is Empty*\n\n` +
                        `Add cards using:\n` +
                        `*${prefix}wishlistadd <mazoku or shoob url>*\n\n` +
                        `Example:\n` +
                        `${prefix}wishlistadd https://mazoku.cc/card/e2607c48-40f4-41e8-b236-02434ef33749`
                )
            }

            let msg = `📋 *${user.name.toUpperCase()}'S WISHLIST*\n`
            msg += `🃏 *${user.wishlist.length} card(s)*\n\n`

            user.wishlist.forEach((card, i) => {
                const emoji = getTierEmoji(card.tier)
                const provider = card.type === 'maz' ? '🟦 Maz' : '🟧 Shoob'
                msg += `*${i + 1}.* ${emoji} *${card.title}*\n`
                msg += `   📺 ${card.source}  •  ${card.tier}  •  ${provider}\n\n`
            })

            msg += `_Remove a card: *${prefix}wishlist --remove=INDEX*_`
            return M.reply(msg)
        } catch (err) {
            console.error('[WISHLIST ERROR]', err)
            return M.reply('❌ An error occurred while fetching your wishlist.')
        }
    }
)
