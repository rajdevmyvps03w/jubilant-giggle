import { plugin } from '../../utils/plugin.js'
import { findUser, getState, swapUserCardPositions } from '../../database/db.js'

plugin(
    {
        name: 'swapdeck',
        aliases: ['swapd', 'sd'],
        category: 'cards',
        isGroup: true,
        description: {
            content: 'Swap positions of two cards inside your active deck (1-12).',
            usage: '<position1> <position2>',
            example: '2 5'
        }
    },
    async (_, M, { args }) => {
        try {
            // We still fetch the user initially to validate card names and existence
            const user = await findUser(M.sender.id, 'cards.deck')

            const p1 = parseInt(args[0]) - 1
            const p2 = parseInt(args[1]) - 1

            if (isNaN(p1) || isNaN(p2) || p1 < 0 || p2 < 0) {
                return M.reply('❌ Invalid indexes! Please provide two numbers (e.g., 1 5).')
            }

            if (p1 === p2) {
                return M.reply('❓ These are the same position!')
            }

            /* ---------- TRANSACTION LOCK CHECK ---------- */
            // Parallelize lock checks to reduce latency
            const [exchangeLock, auctionLock] = await Promise.all([
                getState(`exchange:${M.sender.id}`),
                getState(`auc:seller:${M.sender.id}`)
            ])

            if (exchangeLock || auctionLock) {
                return M.reply('❌ Security Lock: You cannot rearrange your deck while a trade or auction is active.')
            }

            /* ---------- CARD LOGIC ---------- */
            const deck = user.cards?.deck || []

            /* ---------- BOUNDS CHECK ---------- */
            if (!deck[p1] || !deck[p2]) {
                return M.reply(`❌ Slot ${!deck[p1] ? p1 + 1 : p2 + 1} is empty! Check your deck first.`)
            }

            // Capture names BEFORE swapping for an accurate success message
            const name1 = deck[p1].title || 'Unknown Card'
            const name2 = deck[p2].title || 'Unknown Card'

            // BUG FIX: swapUserCardPositions no longer accepts a caller snapshot.
            // It re-reads the live deck from DB internally to prevent stale swaps.
            const success = await swapUserCardPositions(M.sender.id, 'cards.deck', p1, p2)

            if (!success) {
                return M.reply('❌ Database Error: The swap failed to save.')
            }

            return M.reply(
                `✅ *DECK REARRANGED*\n\n` +
                    `🔄 *Slot ${p1 + 1}:* ${name1} ↔️ *Slot ${p2 + 1}:* ${name2}\n` +
                    `✨ Your lineup has been updated successfully!`
            )
        } catch (err) {
            console.error('[SWAPDECK ERROR]', err)
            return M.reply('❌ An error occurred while swapping deck cards.')
        }
    }
)
