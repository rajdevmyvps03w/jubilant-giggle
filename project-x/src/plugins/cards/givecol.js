import { plugin } from '../../utils/plugin.js'
import {
    findUser,
    addCardToDeck,
    addCardToCollection,
    getState,
    removeCardFromCollection,
    removeFromWallet,
    addGroupFunds,
    hasWarnType
} from '../../database/db.js'
import { extractNumbers } from '../../functions/helpler.js'

const COLLECTION_FEE = 1000

plugin(
    {
        name: 'givecol',
        aliases: ['givecollection', 'givecolcard'],
        category: 'cards',
        isGroup: true,
        description: {
            content: `Give a card from your collection to another user. Costs ₹${COLLECTION_FEE.toLocaleString()} which goes to group funds.`,
            usage: '<card_index> @user',
            example: '5 @917003213983'
        }
    },
    async (_, M, { text }) => {
        try {
            /* 1. INPUT VALIDATION ─────────────────────────────────────────── */
            const targetJid = M.mentioned?.[0] || (M.isQuoted ? M.quotedMessage?.participant : null)
            const [num] = extractNumbers(text)

            if (!num || num < 1) {
                return M.reply('❌ Invalid index! Provide a valid position in your collection.')
            }

            const index = num - 1

            if (!targetJid) {
                return M.reply('❌ You must mention or reply to a user to give a card.')
            }
            if (targetJid === M.sender.id || targetJid === M.sender.jid) {
                return M.reply('❌ You cannot give a card to yourself.')
            }

            /* 2. RECIPIENT, LOCK & WARN CHECKS ───────────────────────────── */
            const [receiver, sender] = await Promise.all([
                findUser(targetJid, 'cards.deck name jid'),
                findUser(M.sender.id, 'wallet cards.collection jid')
            ])

            if (!receiver) {
                return M.reply('❌ The recipient is not registered in the system.')
            }

            const senderLock =
                (await getState(`exchange:${M.sender.id}`)) || (await getState(`auc:seller:${M.sender.id}`))
            if (senderLock) {
                return M.reply('❌ Action blocked: You have an active trade or auction.')
            }

            const [senderRestricted, targetRestricted] = await Promise.all([
                hasWarnType(M.sender.id, M.from, 6),
                hasWarnType(targetJid, M.from, 6)
            ])

            if (senderRestricted) {
                return M.reply('🚫 *RESTRICTED:* You cannot initiate trades because you have an active Warning Type 6.')
            }
            if (targetRestricted) {
                return M.reply(
                    '🚫 *RESTRICTED:* You cannot trade with this user as they have an active Warning Type 6.'
                )
            }

            /* 3. WALLET CHECK ────────────────────────────────────────────── */
            const wallet = sender?.wallet ?? 0
            if (wallet - COLLECTION_FEE < 0) {
                return M.reply(
                    `❌ *Insufficient funds.*\n\n` +
                        `Giving from your collection costs *₹${COLLECTION_FEE.toLocaleString()}*.\n` +
                        `Your wallet: *₹${wallet.toLocaleString()}*`
                )
            }

            /* 4. DEDUCT FEE → GROUP FUNDS ────────────────────────────────── */
            const feePaid = await removeFromWallet(M.sender.id, COLLECTION_FEE)
            if (!feePaid) {
                return M.reply(
                    `❌ Failed to deduct the collection fee.\n` +
                        `Make sure you have at least ₹${COLLECTION_FEE.toLocaleString()} in your wallet.`
                )
            }

            // Route fee into group funds — same as gamble/slot tax
            await addGroupFunds(M.from, COLLECTION_FEE)

            /* 5. CARD EXTRACTION ─────────────────────────────────────────── */
            const cardToGive = await removeCardFromCollection(M.sender.id, index)
            if (!cardToGive) {
                // Refund both wallet and group funds since no card was moved
                await removeFromWallet(M.sender.id, -COLLECTION_FEE).catch(() => {})
                await addGroupFunds(M.from, -COLLECTION_FEE).catch(() => {})
                return M.reply(
                    `❌ No card found at position *${num}* in your collection.\n` +
                        `Your fee of *₹${COLLECTION_FEE.toLocaleString()}* has been refunded.`
                )
            }

            /* 6. DELIVERY ────────────────────────────────────────────────── */
            const wentToDeck = await addCardToDeck(targetJid, cardToGive)
            const destination = wentToDeck ? 'Deck 📦' : 'Collection 🗂'
            if (!wentToDeck) await addCardToCollection(targetJid, cardToGive)

            /* 7. SUCCESS RESPONSE ────────────────────────────────────────── */
            return M.reply(
                `🎁 *TRANSFER SUCCESSFUL*\n\n` +
                    `👤 *To:* ${receiver.name || 'User'}\n` +
                    `🃏 *Card:* ${cardToGive.title || 'Unknown Card'}\n` +
                    `👑 *Tier:* ${cardToGive.tier || 'Standard'}\n` +
                    `📤 *From:* Collection 🗂\n` +
                    `📥 *Stored in:* ${destination}\n` +
                    `🏛️ *Fee:* ₹${COLLECTION_FEE.toLocaleString()} → Group Funds\n\n` +
                    `_The card has been removed from your collection._`
            )
        } catch (err) {
            console.error('[GIVECOL ERROR]', err)
            return M.reply('❌ An internal error occurred. Please contact an admin if your card went missing.')
        }
    }
)
