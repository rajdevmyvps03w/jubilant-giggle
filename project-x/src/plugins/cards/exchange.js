import { plugin } from '../../utils/plugin.js'
// Updated to your MongoDB database path
import { findUser, saveState, getState, hasWarnType } from '../../database/db.js'
import { randomString, extractNumbers } from '../../functions/helpler.js'

plugin(
    {
        name: 'exchange',
        aliases: ['trade'],
        category: 'cards',
        isGroup: true,
        description: {
            content: 'Exchange cards with another user (Deck only).',
            usage: '<mention user | reply> <your_deck_index> <their_deck_index>',
            example: '@917003213983 1 3'
        }
    },
    async (_, M, { text }) => {
        try {
            /* ---------- JID EXTRACTION ---------- */
            let targetJid = M.mentioned?.[0] || (M.isQuoted ? M.quotedMessage?.participant : null)

            if (!targetJid) {
                return M.reply('❌ You must mention or reply to a user to exchange cards.')
            }

            // Clean the text to isolate indices
            const cleanText = text.replace(targetJid.split('@')[0], '').replace('@', '')

            if (targetJid === M.sender.id || targetJid === M.sender.jid) {
                return M.reply('❌ You cannot trade with yourself.')
            }

            /* ---------- INDEX VALIDATION ---------- */
            const nums = extractNumbers(cleanText)
            if (nums.length !== 2) {
                return M.reply(
                    `❌ Invalid format!\n` +
                        `Usage: *${global.config.prefix}exchange* @user <your_deck_index> <their_deck_index>`
                )
            }

            const yourNum = nums[0]
            const theirNum = nums[1]

            // Strict check for 1-12 range
            if (yourNum < 1 || yourNum > 12 || theirNum < 1 || theirNum > 12) {
                return M.reply('❌ Invalid indices! Both indices must be between 1 and 12 (Deck only).')
            }

            const yourIdx = yourNum - 1
            const theirIdx = theirNum - 1

            /* ---------- REGISTRATION & LOCK CHECK ---------- */
            const fromUser = await findUser(M.sender.id)
            const toUser = await findUser(targetJid)

            if (!toUser) {
                return M.reply('❌ The target user is not registered.')
            }

            const lock1 = await getState(`exchange:${M.sender.id}`)
            const lock2 = await getState(`exchange:${targetJid}`)

            if (lock1 || lock2) {
                return M.reply('❌ One of the users is already involved in a pending trade.')
            }

            /* ---------- DECK OWNERSHIP CHECK ---------- */
            // Targeting ONLY the deck array
            const yourDeck = fromUser.cards?.deck || []
            const theirDeck = toUser.cards?.deck || []

            const yourCard = yourDeck[yourIdx]
            const theirCard = theirDeck[theirIdx]

            // Strict deck length validation
            if (!yourCard) {
                return M.reply(`❌ Invalid index. You only have ${yourDeck.length} cards in your deck.`)
            }
            if (!theirCard) {
                return M.reply(`❌ The target user only has ${theirDeck.length} cards in their deck.`)
            }

            // Check if the sender has the restriction
            const senderRestricted = await hasWarnType(M.sender.id, M.from, 6)
            if (senderRestricted) {
                return M.reply('🚫 *RESTRICTED:* You cannot initiate trades because you have an active Warning Type 6.')
            }

            // Check if the target has the restriction
            const targetRestricted = await hasWarnType(targetJid, M.from, 6)
            if (targetRestricted) {
                return M.reply(
                    `🚫 *RESTRICTED:* You cannot trade with this user as they currently have an active Warning Type 6.`
                )
            }

            /* ---------- CREATE EXCHANGE STATE ---------- */
            const exchangeId = randomString(6).toUpperCase()
            const exchangeData = {
                id: exchangeId,
                from: M.sender.id,
                to: targetJid,
                fromCard: yourCard,
                toCard: theirCard,
                fromIdx: yourIdx, // Position in their respective decks
                toIdx: theirIdx,
                location: 'deck', // Marker for the acceptance logic
                timestamp: Date.now()
            }

            // Save state for both users to lock them from other trades
            await saveState(`exchange:${M.sender.id}`, exchangeData)
            await saveState(`exchange:${targetJid}`, exchangeData)
            await saveState(`exchange_info:${exchangeId}`, exchangeData)

            /* ---------- AUTO-EXPIRY NOTIFICATION ---------- */
            setTimeout(async () => {
                const stillExists = await getState(`exchange_info:${exchangeId}`)
                if (stillExists) {
                    // Clear locks
                    await Promise.all([
                        saveState(`exchange:${M.sender.id}`, null),
                        saveState(`exchange:${targetJid}`, null),
                        saveState(`exchange_info:${exchangeId}`, null)
                    ])
                    M.reply(`⏳ Trade request *${exchangeId}* has expired.`)
                }
            }, 60000)

            return M.reply(
                `🔁 *DECK EXCHANGE REQUEST [${exchangeId}]*\n\n` +
                    `📤 *From:* ${fromUser.name}\n` +
                    `🃏 Offering: ${yourCard.title} (${yourCard.tier})\n\n` +
                    `📥 *To:* ${toUser.name}\n` +
                    `🃏 Requesting: ${theirCard.title} (${theirCard.tier})\n\n` +
                    `⚠️ *Expires in 60 seconds.*\n\n` +
                    `@${targetJid.split('@')[0]}, respond with:\n` +
                    `✅ *${global.config.prefix}accepttrade ${exchangeId}*\n` +
                    `❌ *${global.config.prefix}declinetrade ${exchangeId}*`,
                { mentions: [targetJid] }
            )
        } catch (err) {
            console.error('[EXCHANGE ERROR]', err)
            return M.reply('❌ An error occurred while initiating the trade.')
        }
    }
)
