import { plugin } from '../../utils/plugin.js'
import { findUser, removeFromWallet, editUser } from '../../database/db.js'
import { uploadToQuax } from '../../functions/helpler.js'

// ── Pricing ──────────────────────────────────────────────────────────────────
const PRICE_PER_MONTH = 8000 // Slightly cheaper than pfp
const MS_PER_DAY = 24 * 60 * 60 * 1000
const MS_PER_MONTH = 30 * MS_PER_DAY
const MAX_MONTHS = 12

plugin(
    {
        name: 'setdeckbg',
        aliases: ['setdeckbackground', 'deckbg', 'customdeck'],
        category: 'misc',
        description: {
            content: `Set a custom background image for your deck display. Costs ₹${PRICE_PER_MONTH.toLocaleString()} per month. Images only.`,
            usage: '<months>',
            example: '1 (reply to an image)'
        }
    },
    async (_, M, { args }) => {
        const prefix = global.config.prefix

        // ── Show info if no args ─────────────────────────────────────────────
        if (!args.length && !M.isQuoted && M.type !== 'image') {
            let pricing = ''
            for (let i = 1; i <= 6; i++) {
                pricing += `  ${i} month${i > 1 ? 's' : ''}\n  └ 📝 *Pricing:* ₹${(PRICE_PER_MONTH * i).toLocaleString()}\n`
            }
            return M.reply(
                `🖼️ *SET CUSTOM DECK BACKGROUND*\n\n` +
                    `Upload a custom background image that shows behind your *${prefix}deck* cards.\n\n` +
                    `💰 *Pricing:*\n${pricing}\n` +
                    `📁 *Supported:* Images only (JPG/PNG)\n` +
                    `📐 *Recommended:* 1200x800px or similar landscape ratio\n` +
                    `📅 *Max duration:* ${MAX_MONTHS} months\n\n` +
                    `📌 *How to use:*\n` +
                    `  1. Send/reply to an image\n` +
                    `  2. Add months as your caption/text\n` +
                    `  Example: *${prefix}setdeckbg 2* (replying to an image)\n\n` +
                    `_Use *${prefix}unsetdeckbg* to remove your deck bg (no refund)._`
            )
        }

        // ── Parse months ─────────────────────────────────────────────────────
        const months = parseInt(args[0])
        if (isNaN(months) || months < 1 || months > MAX_MONTHS) {
            return M.reply(
                `❌ *Invalid duration.*\n\n` +
                    `Please enter a number between *1 and ${MAX_MONTHS}*.\n` +
                    `Usage: *${prefix}setdeckbg <months>* (while replying to an image)`
            )
        }

        const totalCost = PRICE_PER_MONTH * months

        // ── Determine media source ────────────────────────────────────────────
        const isQuotedImage = M.isQuoted && M.quotedMessage?.type === 'image'
        const isDirectImage = M.type === 'image'

        if (!isQuotedImage && !isDirectImage) {
            return M.reply(
                `❌ *No image found!*\n\n` +
                    `Please either:\n` +
                    `  • Reply to an image with *${prefix}setdeckbg ${months}*\n` +
                    `  • Send an image with the caption *${prefix}setdeckbg ${months}*\n\n` +
                    `⚠️ *Note:* Only images are supported (no videos).`
            )
        }

        try {
            const user = await findUser(M.sender.id)

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

            // ── Block if already has active deck bg ───────────────────────────
            const existing = user.customDeck
            if (existing?.url && existing?.expiresAt && Date.now() < existing.expiresAt) {
                const daysLeft = Math.ceil((existing.expiresAt - Date.now()) / MS_PER_DAY)
                return M.reply(
                    `⚠️ *You already have an active custom deck background!*\n\n` +
                        `⏳ *Days remaining:* ${daysLeft} day(s)\n\n` +
                        `Use *${prefix}extenddeckbg ${months}* to add more time,\n` +
                        `or *${prefix}unsetdeckbg* to remove the current one first.\n\n` +
                        `_Removing gives NO refund._`
                )
            }

            // ── Download media ───────────────────────────────────────────────
            await M.reply('⏳ *Processing your image... please wait.*')

            let buffer
            try {
                if (isQuotedImage) {
                    buffer = await M.quotedMessage.download()
                } else {
                    buffer = await M.download()
                }
            } catch (err) {
                console.error('[SETDECKBG] Download error:', err)
                return M.reply('❌ *Failed to download the image.* Please try again.')
            }

            if (!buffer || !Buffer.isBuffer(buffer)) {
                return M.reply('❌ *Could not read the image.* Please try a different file.')
            }

            // ── Size check (max 10MB for images) ─────────────────────────────
            const MAX_SIZE = 10 * 1024 * 1024 // 10 MB
            if (buffer.length > MAX_SIZE) {
                return M.reply(
                    `❌ *Image is too large.*\n\n` +
                        `📏 *Your file:* ${(buffer.length / 1024 / 1024).toFixed(2)} MB\n` +
                        `📐 *Maximum:* 10 MB\n\n` +
                        `Please compress your image and try again.`
                )
            }

            // ── Upload to image host ─────────────────────────────────────────
            let imageUrl
            try {
                imageUrl = await uploadToQuax(buffer)
            } catch (err) {
                console.error('[SETPFP] Upload error:', err)
                return M.reply(
                    `❌ *Upload failed.* The media could not be saved.\n` +
                        `Reason: ${err.message || 'Unknown error'}\n\n` +
                        `Please try again with a smaller or different file.`
                )
            }
            // ── Deduct wallet ─────────────────────────────────────────────────
            const deducted = await removeFromWallet(M.sender.id, totalCost)
            if (!deducted) {
                return M.reply(`❌ *Transaction failed.* Your wallet may have been modified. Try again.`)
            }

            // ── Save to DB ───────────────────────────────────────────────────
            const now = Date.now()
            const expiresAt = now + months * MS_PER_MONTH

            await editUser(M.sender.id, {
                customDeck: {
                    url: imageUrl,
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
                `✅ *Custom Deck Background Set!*\n\n` +
                    `📅 *Duration:* ${months} month${months > 1 ? 's' : ''}\n` +
                    `💸 *Paid:* ₹${totalCost.toLocaleString()}\n` +
                    `🗓️ *Expires on:* ${expiryDate}\n\n` +
                    `_Check it out on your *${prefix}deck*!_`
            )
        } catch (err) {
            console.error('[SETDECKBG ERROR]', err)
            return M.reply('❌ An unexpected error occurred. Please try again.')
        }
    }
)
