import { plugin } from '../../utils/plugin.js'
import { findUser, removeFromWallet, editUser } from '../../database/db.js'

const PRICE_PER_MONTH = 8000
const MS_PER_DAY = 24 * 60 * 60 * 1000
const MS_PER_MONTH = 30 * MS_PER_DAY
const MAX_MONTHS = 12

plugin(
    {
        name: 'extenddeckbg',
        aliases: ['renewdeckbg', 'extdeckbg'],
        category: 'misc',
        description: {
            content: `Extend your existing active custom deck background by 1–${MAX_MONTHS} months. Costs ₹${PRICE_PER_MONTH.toLocaleString()} per month.`,
            usage: '<months>',
            example: '2'
        }
    },
    async (_, M, { args }) => {
        const prefix = global.config.prefix
        const months = parseInt(args[0])

        if (isNaN(months) || months < 1 || months > MAX_MONTHS) {
            return M.reply(
                `❌ *Invalid duration.*\n\n` +
                    `Please enter a number between *1 and ${MAX_MONTHS}*.\n` +
                    `Usage: *${prefix}extenddeckbg <months>*`
            )
        }

        const totalCost = PRICE_PER_MONTH * months

        try {
            const user = await findUser(M.sender.id)

            const deckBg = user.customDeck
            if (!deckBg?.url || !deckBg?.expiresAt) {
                return M.reply(
                    `❌ *You don't have an active custom deck background to extend.*\n\n` +
                        `Use *${prefix}setdeckbg <months>* (replying to an image) to set one first.`
                )
            }

            // ── Wallet check ─────────────────────────────────────────────────
            if ((user.wallet || 0) - totalCost < 0) {
                const shortfall = totalCost - (user.wallet || 0)
                return M.reply(
                    `❌ *Insufficient funds!*\n\n` +
                        `💸 *Cost:* ₹${totalCost.toLocaleString()} (${months} month${months > 1 ? 's' : ''})\n` +
                        `💰 *Your wallet:* ₹${(user.wallet || 0).toLocaleString()}\n` +
                        `📉 *Shortfall:* ₹${shortfall.toLocaleString()}`
                )
            }

            // ── Cap check ────────────────────────────────────────────────────
            const now = Date.now()
            const currentExpiry = Math.max(deckBg.expiresAt, now)
            const newExpiry = currentExpiry + months * MS_PER_MONTH
            const maxExpiry = now + MAX_MONTHS * MS_PER_MONTH

            if (newExpiry > maxExpiry) {
                const allowedMs = maxExpiry - currentExpiry
                const allowedMonths = Math.floor(allowedMs / MS_PER_MONTH)
                if (allowedMonths <= 0) {
                    return M.reply(
                        `⚠️ *You've already hit the maximum ${MAX_MONTHS}-month limit.*\n\n` +
                            `You cannot extend further right now.`
                    )
                }
                return M.reply(
                    `⚠️ *Too long!*\n\n` +
                        `You can only extend by *${allowedMonths} more month(s)* before hitting the ${MAX_MONTHS}-month cap.\n\n` +
                        `Try: *${prefix}extenddeckbg ${allowedMonths}*`
                )
            }

            // ── Deduct & save ─────────────────────────────────────────────────
            const deducted = await removeFromWallet(M.sender.id, totalCost)
            if (!deducted) {
                return M.reply(`❌ *Transaction failed.* Try again.`)
            }

            await editUser(M.sender.id, {
                customDeck: { ...deckBg, expiresAt: newExpiry }
            })

            const daysLeft = Math.ceil((newExpiry - now) / MS_PER_DAY)
            const expiryDate = new Date(newExpiry).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            })

            return M.reply(
                `✅ *Deck Background Extended!*\n\n` +
                    `➕ *Extended by:* ${months} month${months > 1 ? 's' : ''}\n` +
                    `💸 *Paid:* ₹${totalCost.toLocaleString()}\n` +
                    `⏳ *New total remaining:* ${daysLeft} day(s)\n` +
                    `🗓️ *New expiry:* ${expiryDate}`
            )
        } catch (err) {
            console.error('[EXTENDDECKBG ERROR]', err)
            return M.reply('❌ An error occurred. Please try again.')
        }
    }
)
