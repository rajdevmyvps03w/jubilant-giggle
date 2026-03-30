import { plugin } from '../../utils/plugin.js'
import {
    findUser,
    addCardToDeck,
    addCardToCollection,
    getState,
    removeCardFromDeck,
    hasWarnType
} from '../../database/db.js'
import { extractNumbers } from '../../functions/helpler.js'

plugin(
    {
        name: 'givecard',
        aliases: ['give'],
        category: 'cards',
        isGroup: true,
        description: {
            content: 'Give a card from your deck to another user by its index.',
            usage: '<card_index> @user',
            example: '1 @917003213983'
        }
    },
    async (_, M, { text }) => {
        try {
            /* 1. INPUT VALIDATION */
            let targetJid = M.mentioned?.[0] || (M.isQuoted ? M.quotedMessage?.participant : null)
            const [num] = extractNumbers(text)
            if (!num || num < 1 || num > 12) {
                return M.reply('❌ Invalid index! The index should be between 1 - 12 (your deck).')
            }
            const index = num - 1

            if (!targetJid) {
                return M.reply('❌ You must mention or reply to a user to give a card.')
            }
            if (targetJid === M.sender.id || targetJid === M.sender.jid) {
                return M.reply('❌ You cannot give a card to yourself.')
            }
            if (index < 0) {
                return M.reply('❌ Please provide a valid card index (e.g., 1, 2, 3).')
            }

            /* 2. RECIPIENT & LOCK CHECKS */
            const receiver = await findUser(targetJid, 'cards.deck name jid')
            if (!receiver) {
                return M.reply('❌ The recipient is not registered in the system.')
            }

            const senderLock =
                (await getState(`exchange:${M.sender.id}`)) || (await getState(`auc:seller:${M.sender.id}`))
            if (senderLock) {
                return M.reply('❌ Action blocked: You have an active trade or auction.')
            }

            const senderRestricted = await hasWarnType(M.sender.id, M.from, 6)
            if (senderRestricted) {
                return M.reply('🚫 *RESTRICTED:* You cannot initiate trades because you have an active Warning Type 6.')
            }

            const targetRestricted = await hasWarnType(targetJid, M.from, 6)
            if (targetRestricted) {
                return M.reply(
                    `🚫 *RESTRICTED:* You cannot trade with this user as they currently have an active Warning Type 6.`
                )
            }
            /* 3. EXTRACTION */
            // We remove the card first. If this fails, the process stops.
            const cardToGive = await removeCardFromDeck(M.sender.id, index)
            if (!cardToGive) {
                return M.reply('❌ Transaction Failed: No card found at that index in your deck.')
            }

            /* 4. DELIVERY */
            let destination = 'Collection 🗂'
            const deckLimit = 12
            const currentDeckSize = receiver.cards?.deck?.length || 0

            const wentToDeck = await addCardToDeck(targetJid, cardToGive)
            destination = 'Deck 📦'
            if (!wentToDeck) {
                await addCardToCollection(targetJid, cardToGive)
            }

            /* 5. SUCCESS NOTIFICATION */
            const cardName = cardToGive.title || 'Unknown Card'
            const cardTier = cardToGive.tier || 'Standard'

            return M.reply(
                `🎁 *TRANSFER SUCCESSFUL*\n\n` +
                    `👤 *To:* ${receiver.name || 'User'}\n` +
                    `🃏 *Card:* ${cardName}\n` +
                    `👑 *Tier:* ${cardTier}\n` +
                    `📥 *Stored in:* ${destination}\n\n` +
                    `_The card has been removed from your deck._`
            )
        } catch (err) {
            console.error('[GIVECARD ERROR]', err)
            return M.reply('❌ An internal error occurred. Please contact an admin if your card went missing.')
        }
    }
)
