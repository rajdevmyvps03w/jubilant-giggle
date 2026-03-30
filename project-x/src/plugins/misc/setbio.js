import { plugin } from '../../utils/plugin.js'
import { findUser, removeFromWallet, editUser } from '../../database/db.js'

// Pricing: cost per month in ₹
const PRICE_PER_MONTH = 10000
const MS_PER_DAY = 24 * 60 * 60 * 1000
const MS_PER_MONTH = 30 * MS_PER_DAY

const MAX_BIO_LENGTH = 150
const MAX_MONTHS = 12

plugin(
    {
        name: 'setbio',
        aliases: ['setprofilebio', 'addbio'],
        category: 'misc',
        description: {
            content: `Set a custom bio on your profile. Costs ₹${PRICE_PER_MONTH.toLocaleString()} per month (up to ${MAX_MONTHS} months). Bio expires automatically.`,
            usage: '<months> <your bio text>',
            example: '1 Just a chill gamer 🎮'
        }
    },
    async (_, M, { args }) => {
        const prefix = global.config.prefix

        // ── Show pricing info if no args ────────────────────────────────────
        if (!args.length) {
            let pricingList = ''
            for (let i = 1; i <= 6; i++) {
                pricingList += `  ${i} month${i > 1 ? 's' : ''}\n  └ 📝 *Pricing:* ₹${(PRICE_PER_MONTH * i).toLocaleString()}\n`
            }

            return M.reply(
                `📝 *SET PROFILE BIO*\n\n` +
                    `Set a custom bio that shows on your *${prefix}profile*.\n\n` +
                    `💰 *Pricing:*\n${pricingList}\n` +
                    `📏 *Max length:* ${MAX_BIO_LENGTH} characters\n` +
                    `📅 *Max duration:* ${MAX_MONTHS} months\n\n` +
                    `📌 *Usage:* ${prefix}setbio <months> <bio text>\n` +
                    `💡 *Example:* ${prefix}setbio 2 Just vibing 🎵\n\n` +
                    `_Use *${prefix}unsetbio* to remove your bio and get NO refund._`
            )
        }

        const months = parseInt(args[0])
        const bioText = args.slice(1).join(' ').trim()

        // ── Validation ──────────────────────────────────────────────────────
        if (isNaN(months) || months < 1 || months > MAX_MONTHS) {
            return M.reply(
                `❌ *Invalid duration.*\n\n` +
                    `Please enter a number between *1 and ${MAX_MONTHS}* for months.\n` +
                    `Example: *${prefix}setbio 1 Your bio here*`
            )
        }

        if (!bioText) {
            return M.reply(`❌ *Please provide your bio text.*\n\n` + `Usage: *${prefix}setbio ${months} <your bio>*`)
        }

        if (bioText.length > MAX_BIO_LENGTH) {
            return M.reply(
                `❌ *Bio is too long!*\n\n` +
                    `Your bio: *${bioText.length}* characters\n` +
                    `Maximum: *${MAX_BIO_LENGTH}* characters\n\n` +
                    `Please shorten it by *${bioText.length - MAX_BIO_LENGTH}* character(s).`
            )
        }

        const totalCost = PRICE_PER_MONTH * months

        try {
            const user = await findUser(M.sender.id)

            // ── Wallet check ────────────────────────────────────────────────
            if ((user.wallet || 0) - totalCost < 0) {
                const shortfall = totalCost - (user.wallet || 0)
                return M.reply(
                    `❌ *Insufficient funds!*\n\n` +
                        `💸 *Cost:* ₹${totalCost.toLocaleString()} (${months} month${months > 1 ? 's' : ''})\n` +
                        `💰 *Your wallet:* ₹${(user.wallet || 0).toLocaleString()}\n` +
                        `📉 *Shortfall:* ₹${shortfall.toLocaleString()}\n\n` +
                        `Earn more coins via *${prefix}daily*, *${prefix}wallet*, or *${prefix}gamble*.`
                )
            }

            // ── If user already has an active bio, warn and let them extend ─
            const existingBio = user.customBio
            if (existingBio?.text && existingBio?.expiresAt) {
                const remaining = existingBio.expiresAt - Date.now()
                if (remaining > 0) {
                    const daysLeft = Math.ceil(remaining / MS_PER_DAY)
                    return M.reply(
                        `⚠️ *You already have an active bio!*\n\n` +
                            `📝 *Current bio:* ${existingBio.text}\n` +
                            `⏳ *Days remaining:* ${daysLeft} day(s)\n\n` +
                            `Use *${prefix}extendbio ${months} ${bioText}* to extend it,\n` +
                            `or *${prefix}unsetbio* to remove the current one first.\n\n` +
                            `_Note: Removing your bio gives NO refund._`
                    )
                }
            }

            // ── Deduct wallet ────────────────────────────────────────────────
            const deducted = await removeFromWallet(M.sender.id, totalCost)
            if (!deducted) {
                return M.reply(`❌ *Transaction failed.* Your wallet may have insufficient funds. Try again.`)
            }

            // ── Save bio ─────────────────────────────────────────────────────
            const now = Date.now()
            const expiresAt = now + months * MS_PER_MONTH

            await editUser(M.sender.id, {
                customBio: {
                    text: bioText,
                    setAt: now,
                    expiresAt
                }
            })

            const expiryDate = new Date(expiresAt).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            })

            return M.reply(
                `✅ *Bio Set Successfully!*\n\n` +
                    `📝 *Your bio:* ${bioText}\n\n` +
                    `📅 *Duration:* ${months} month${months > 1 ? 's' : ''}\n` +
                    `💸 *Paid:* ₹${totalCost.toLocaleString()}\n` +
                    `🗓️ *Expires on:* ${expiryDate}\n\n` +
                    `_View it on your *${prefix}profile*!_`
            )
        } catch (err) {
            console.error('[SETBIO ERROR]', err)
            return M.reply('❌ An error occurred while setting your bio. Please try again.')
        }
    }
)
