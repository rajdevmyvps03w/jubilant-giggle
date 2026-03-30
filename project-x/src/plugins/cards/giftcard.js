import { plugin } from '../../utils/plugin.js'
import { findUser, removeFromWallet, addGroupFunds, getState, saveState, hasWarnType } from '../../database/db.js'
import { extractNumbers, randomString } from '../../functions/helpler.js'

plugin(
    {
        name: 'giftcard',
        aliases: ['sendcard', 'gift'],
        category: 'cards',
        isGroup: true,
        description: {
            content: 'Gift a card from your deck (₹1,000 fee). Strict position check applies.',
            usage: '<card_index> <mention/reply>',
            example: '1 @user'
        }
    },
    async (client, M, { text }) => {
        try {
            /* ---------- JID EXTRACTION ---------- */
            let targetJid = M.mentioned?.[0] || (M.isQuoted ? M.quotedMessage?.participant : null)
            if (targetJid === M.sender.id || targetJid === M.sender.jid) {
                return M.reply('❌ You cannot gift a card to yourself.')
            }

            /* ---------- INDEX EXTRACTION ---------- */
            const nums = extractNumbers(text)
            if (nums.length === 0) {
                return M.reply(`❌ Usage: *${global.config.prefix}giftcard <index> @user*`)
            }
            const index = nums[0] - 1 // 0-based index

            /* ---------- REGISTRATION & STATE CHECKS ---------- */
            const sender = await findUser(M.sender.id)
            const receiver = await findUser(targetJid)

            if (!receiver) {
                return M.reply('❌ The recipient is not registered.')
            }

            const senderRestricted = await hasWarnType(M.sender.id, M.from, 6)
            if (senderRestricted) {
                return M.reply('🚫 *RESTRICTED:* You cannot initiate trades because you have an active Warning Type 6.')
            }

            const targetRestricted = await hasWarnType(receiver, M.from, 6)
            if (targetRestricted) {
                return M.reply(
                    `🚫 *RESTRICTED:* You cannot trade with this user as they currently have an active Warning Type 6.`
                )
            }

            // Lock Check
            const exchangeLock = await getState(`exchange:${M.sender.id}`)
            const auctionLock = await getState(`auc:seller:${M.sender.id}`)
            if (exchangeLock || auctionLock) {
                return M.reply('❌ You are busy in another transaction.')
            }

            /* ---------- WALLET & DECK CARD CHECK ---------- */
            const FEE = 1000
            if (sender.wallet < FEE) {
                return M.reply(`❌ Minimum ₹${FEE.toLocaleString()} fee required to send a gift.`)
            }

            // TARGET ONLY THE DECK
            const deck = sender.cards?.deck || []

            // Validate index against Deck only
            if (index < 0 || index >= deck.length) {
                return M.reply(`❌ Invalid index. You only have ${deck.length} cards in your deck.`)
            }

            const card = deck[index]

            /* ---------- PROCESS FEE ---------- */
            await removeFromWallet(M.sender.id, FEE)
            if (M.chat === 'group') {
                await addGroupFunds(M.from, FEE)
            }

            /* ---------- CREATE GIFT STATE (STRICT) ---------- */
            const giftId = randomString(6).toUpperCase()
            const giftData = {
                from: M.sender.id,
                to: targetJid,
                cardId: card.id,
                cardIdx: index,
                location: 'deck',
                timestamp: Date.now()
            }

            // Save gift state with TTL
            await saveState(`gift:${giftId}`, giftData, 300000)

            // BUG FIX: lock the sender's deck for the duration of the gift window.
            // Without this lock, the sender could use -swapdeck/-dec2col/-give to
            // move the card before the recipient accepts, causing gaccept to remove
            // a different card at that index position.
            // We reuse the exchange lock key so all other trade commands respect it.
            await saveState(`exchange:${M.sender.id}`, { giftLock: true, giftId }, 300000)

            /* ---------- NOTIFICATIONS ---------- */
            const msg =
                `🎁 *DECK CARD GIFT REQUEST*\n\n` +
                `👤 *From:* ${sender.name}\n` +
                `🃏 *Card:* ${card.title}\n` +
                `👑 *Tier:* ${card.tier}\n\n` +
                `To accept, reply with:\n` +
                `✅ *${global.config.prefix}acceptgift ${giftId}*\n\n` +
                `⚠️ *Note:* If the sender moves this card from deck position ${nums[0]}, the gift becomes invalid.`

            // Direct message to receiver if possible
            await client.sendMessage(targetJid, { text: msg, mentions: [targetJid] }).catch(() => {})

            return M.reply(
                `📨 Gift request for *${card.title}* sent to ${receiver.name}.\n💰 ₹${FEE.toLocaleString()} fee deducted.`
            )
        } catch (err) {
            console.error('[GIFTCARD ERROR]', err)
            return M.reply('❌ An error occurred.')
        }
    }
)
