import { plugin } from '../../utils/plugin.js'
import { findUser, removeFromWallet, editUser } from '../../database/db.js'
import { uploadToQuax, gifToMp4 } from '../../functions/helpler.js'
import { fileTypeFromBuffer } from 'file-type'

// ── Pricing ──────────────────────────────────────────────────────────────────
const PRICE_PER_MONTH = 10000
const MS_PER_DAY = 24 * 60 * 60 * 1000
const MS_PER_MONTH = 30 * MS_PER_DAY
const MAX_MONTHS = 12

// Allowed media types and their display labels
const ALLOWED_TYPES = {
    'image/jpeg': { label: 'Image (JPG)', mediaType: 'image' },
    'image/png': { label: 'Image (PNG)', mediaType: 'image' },
    'image/webp': { label: 'Image (WEBP)', mediaType: 'image' },
    'image/gif': { label: 'GIF', mediaType: 'gif' },
    'video/mp4': { label: 'Video (MP4)', mediaType: 'video' }
}

plugin(
    {
        name: 'setpfp',
        aliases: ['setprofilepic', 'custompfp', 'profilepic'],
        category: 'misc',
        description: {
            content: `Set a custom profile picture (image, GIF, or MP4) shown on your profile. Costs ₹${PRICE_PER_MONTH.toLocaleString()} per month.`,
            usage: '<months>',
            example: '1 (reply to an image or gif)'
        }
    },
    async (_, M, { args }) => {
        const prefix = global.config.prefix

        // ── Show info if no args ─────────────────────────────────────────────
        if (!args.length && !M.isQuoted && !['image', 'video', 'gif'].includes(M.type)) {
            let pricing = ''
            for (let i = 1; i <= 6; i++) {
                pricing += `  ${i} month${i > 1 ? 's' : ''}\n  └ 📝 *Pricing:* ₹${(PRICE_PER_MONTH * i).toLocaleString()}\n`
            }
            return M.reply(
                `🖼️ *SET CUSTOM PROFILE PIC*\n\n` +
                    `Upload a custom image, GIF, or video that shows on your *${prefix}profile*.\n\n` +
                    `💰 *Pricing:*\n${pricing}\n` +
                    `📁 *Supported:* Image (JPG/PNG/WEBP), GIF, MP4\n` +
                    `📅 *Max duration:* ${MAX_MONTHS} months\n\n` +
                    `📌 *How to use:*\n` +
                    `  1. Send/reply to a media file\n` +
                    `  2. Add months as your caption/text\n` +
                    `  Example: *${prefix}setpfp 2* (replying to a gif)\n\n` +
                    `_Use *${prefix}unsetpfp* to remove your custom pfp (no refund)._`
            )
        }

        // ── Parse months ─────────────────────────────────────────────────────
        const months = parseInt(args[0])
        if (isNaN(months) || months < 1 || months > MAX_MONTHS) {
            return M.reply(
                `❌ *Invalid duration.*\n\n` +
                    `Please enter a number between *1 and ${MAX_MONTHS}*.\n` +
                    `Usage: *${prefix}setpfp <months>* (while replying to media)`
            )
        }

        const totalCost = PRICE_PER_MONTH * months

        // ── Determine media source ────────────────────────────────────────────
        // Priority: quoted message > the message itself
        const isQuotedMedia =
            M.isQuoted && ['image', 'video', 'gif'].includes(M.quotedMessage?.type?.replace('Message', ''))
        const isDirectMedia = ['image', 'video', 'gif'].includes(M.type)

        if (!isQuotedMedia && !isDirectMedia) {
            return M.reply(
                `❌ *No media found!*\n\n` +
                    `Please either:\n` +
                    `  • Reply to an image/gif/video with *${prefix}setpfp ${months}*\n` +
                    `  • Send an image/gif/video with the caption *${prefix}setpfp ${months}*`
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

            // ── Block if already has active pfp ──────────────────────────────
            const existing = user.customPfp
            if (existing?.url && existing?.expiresAt && Date.now() < existing.expiresAt) {
                const daysLeft = Math.ceil((existing.expiresAt - Date.now()) / MS_PER_DAY)
                return M.reply(
                    `⚠️ *You already have an active custom PFP!*\n\n` +
                        `⏳ *Days remaining:* ${daysLeft} day(s)\n\n` +
                        `Use *${prefix}extendpfp ${months}* to add more time,\n` +
                        `or *${prefix}unsetpfp* to remove the current one first.\n\n` +
                        `_Removing gives NO refund._`
                )
            }

            // ── Download media ───────────────────────────────────────────────
            await M.reply('⏳ *Processing your media... please wait.*')

            let buffer
            try {
                if (isQuotedMedia) {
                    buffer = await M.quotedMessage.download()
                } else {
                    buffer = await M.download()
                }
            } catch (err) {
                console.error('[SETPFP] Download error:', err)
                return M.reply('❌ *Failed to download the media.* Please try again.')
            }

            if (!buffer || !Buffer.isBuffer(buffer)) {
                return M.reply('❌ *Could not read the media.* Please try a different file.')
            }

            // ── Detect real file type ────────────────────────────────────────
            const detected = await fileTypeFromBuffer(buffer)
            const mime = detected?.mime || ''

            if (!ALLOWED_TYPES[mime]) {
                return M.reply(
                    `❌ *Unsupported media type:* \`${mime || 'unknown'}\`\n\n` +
                        `Supported types: JPG, PNG, WEBP, GIF, MP4`
                )
            }

            const { label, mediaType } = ALLOWED_TYPES[mime]

            // ── Convert GIF → MP4 for better WhatsApp support ────────────────
            let finalBuffer = buffer
            let finalMediaType = mediaType

            if (mime === 'image/gif') {
                try {
                    finalBuffer = await gifToMp4(buffer)
                    finalMediaType = 'video'
                } catch (err) {
                    console.warn('[SETPFP] GIF→MP4 conversion failed, keeping as GIF:', err.message)
                    // Keep original gif buffer if conversion fails
                }
            }

            // ── Size check (Quax max 256MB) ──────────────────────────────────
            const MAX_SIZE = 256 * 1024 * 1024 // 256 MB
            if (finalBuffer.length > MAX_SIZE) {
                return M.reply(`❌ *File is too large.* Maximum allowed size is 256MB.`)
            }

            // ── Upload to Quax for permanent-ish URL ─────────────────────────
            let mediaUrl
            try {
                mediaUrl = await uploadToQuax(finalBuffer)
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
                customPfp: {
                    url: mediaUrl,
                    mediaType: finalMediaType, // 'image' | 'video' | 'gif'
                    mimeType: mime,
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
                `✅ *Custom PFP Set!*\n\n` +
                    `🖼️ *Type:* ${label}\n` +
                    `📅 *Duration:* ${months} month${months > 1 ? 's' : ''}\n` +
                    `💸 *Paid:* ₹${totalCost.toLocaleString()}\n` +
                    `🗓️ *Expires on:* ${expiryDate}\n\n` +
                    `_Check it out on your *${prefix}profile*!_`
            )
        } catch (err) {
            console.error('[SETPFP ERROR]', err)
            return M.reply('❌ An unexpected error occurred. Please try again.')
        }
    }
)
