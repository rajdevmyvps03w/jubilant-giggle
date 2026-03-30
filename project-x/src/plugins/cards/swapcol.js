import { plugin } from '../../utils/plugin.js'
// Updated to your MongoDB database path
import { findUser, editUser, swapUserCardPositions } from '../../database/db.js'

plugin(
    {
        name: 'swapcollection',
        aliases: ['swapcol', 'scol'],
        category: 'cards',
        isGroup: true,
        description: {
            content: 'Swap positions of two cards inside your collection.',
            usage: '<position1> <position2>',
            example: '1 4'
        }
    },
    async (_, M, { args }) => {
        try {
            /* ---------- INITIAL DATA FETCH ---------- */
            // Optimization: Only fetch the collection field to reduce RAM load
            const user = await findUser(M.sender.id, 'cards.collection')

            const p1 = parseInt(args[0]) - 1
            const p2 = parseInt(args[1]) - 1

            if (isNaN(p1) || isNaN(p2) || p1 < 0 || p2 < 0) {
                return M.reply('❌ Invalid format! Please provide two valid numbers.')
            }

            if (p1 === p2) {
                return M.reply('❓ These are the same position!')
            }

            /* ---------- COLLECTION LOGIC ---------- */
            const collection = user.cards?.collection || []

            // Bounds Check
            if (!collection[p1] || !collection[p2]) {
                return M.reply(
                    `❌ Invalid index! Your collection has ${collection.length} cards.\n` +
                        `Make sure both slots are filled.`
                )
            }

            /* ---------- DATA CAPTURE ---------- */
            // Capture names BEFORE swapping so the success message is accurate
            const card1Name = collection[p1].title || 'Unknown Card'
            const card2Name = collection[p2].title || 'Unknown Card'

            // BUG FIX: swapUserCardPositions re-reads the live collection from DB.
            const success = await swapUserCardPositions(M.sender.id, 'cards.collection', p1, p2)

            if (!success) {
                return M.reply('❌ Database Error: Failed to save changes.')
            }

            /* ---------- FINAL RESPONSE ---------- */
            return M.reply(
                `✅ *Collection Rearranged*\n\n` +
                    `🔄 Swapped *${card1Name}* (Pos ${p1 + 1}) with *${card2Name}* (Pos ${p2 + 1}).`
            )
        } catch (err) {
            console.error('[SWAPCOLLECTION ERROR]', err)
            return M.reply('❌ An error occurred while swapping cards.')
        }
    }
)
