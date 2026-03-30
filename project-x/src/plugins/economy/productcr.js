import { plugin } from '../../utils/plugin.js'
import { findUser, editUser } from '../../database/db.js' // Updated to MongoDB path

plugin(
    {
        name: 'productcr',
        aliases: ['shareproduct', 'giveitem'],
        category: 'economy',
        isGroup: true,
        description: {
            usage: '<index> @mention',
            content: 'Share any product from your inventory with another user.',
            example: '1 @user'
        }
    },
    async (_, M, { args }) => {
        try {
            const { inventory } = await findUser(M.sender.id)

            if (!args[0]) {
                return M.reply(
                    `❌ Please specify the product index.\nExample: *${global.config.prefix}productcr 1 @user*`
                )
            }

            if (inventory.length === 0) {
                return M.reply('🎒 Your inventory is empty.')
            }

            /* ---------- TARGET IDENTIFICATION ---------- */
            const opponent =
                (M.mentioned?.[0] ?? (M.isQuoted ? M.quotedMessage?.participant : null)) &&
                !(
                    M.isQuoted &&
                    M.sender.id !== M.quotedMessage.participant &&
                    M.sender.jid !== M.quotedMessage.participant
                )
                    ? (M.mentioned?.[0] ?? M.quotedMessage?.participant)
                    : null

            if (!opponent) {
                return M.reply('❌ You must *mention or reply* to a user to send an item.')
            }

            if (opponent === M.sender.id || opponent === M.sender.jid) {
                return M.reply('❌ You cannot send an item to yourself.')
            }

            /* ---------- RECEIVER REGISTRATION CHECK ---------- */
            const receiver = await findUser(opponent)
            if (!receiver) {
                return M.reply(
                    `❌ The recipient (@${opponent.split('@')[0]}) is not registered.\n\n` +
                        `They must use *${global.config.prefix}getreg* to register before they can receive items.`,
                    'text',
                    null,
                    null,
                    [opponent]
                )
            }

            /* ---------- INDEX VALIDATION ---------- */
            const index = parseInt(args[0])
            if (isNaN(index) || index < 1 || index > inventory.length) {
                return M.reply('❌ Invalid product index provided.')
            }

            const product = inventory[index - 1]

            /* ---------- ATOMIC TRANSFER (MONGODB) ---------- */
            // 1. Remove item from sender
            const updatedSenderInv = inventory.filter((_, i) => i !== index - 1)
            await editUser(M.sender.id, { inventory: updatedSenderInv })

            // 2. Add item to receiver
            const receiverInv = receiver.inventory || []
            receiverInv.push({
                ...product,
                whenClaimed: new Date().toISOString()
            })
            await editUser(opponent, { inventory: receiverInv })

            /* ---------- NOTIFICATION ---------- */
            await M.reply(
                `🎁 *Transfer Successful!*\n\n` +
                    `📤 From: @${M.sender.id.split('@')[0]}\n` +
                    `📥 To: @${opponent.split('@')[0]}\n` +
                    `📦 Item: *${product.name || 'Unknown Item'}*\n\n` +
                    `The item has been moved to their inventory.`,
                'text',
                null,
                null,
                [M.sender.id, opponent]
            )
        } catch (err) {
            console.error('[PRODUCT TRANSFER ERROR]', err)
            return M.reply('❌ An error occurred while transferring the item.')
        }
    }
)
