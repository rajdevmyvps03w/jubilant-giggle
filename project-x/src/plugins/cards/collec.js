import { plugin } from '../../utils/plugin.js'
// Updated to your MongoDB database path
import { findUser } from '../../database/db.js'
import { getTierEmoji } from '../../handler/card.js'
import { getBuffer, webpToPng, webpToMp4, gifToMp4 } from '../../functions/helpler.js'

plugin(
    {
        name: 'collection',
        aliases: ['cardscollection', 'col'],
        category: 'cards',
        isGroup: true,
        description: {
            content: 'View cards stored in your collection. Use an index to see details.',
            usage: '<index>',
            example: '5'
        }
    },
    async (_, M, { args }) => {
        try {
            /* ---------- REGISTRATION CHECK ---------- */
            const user = await findUser(M.sender.id, 'cards.collection')

            const collection = user.cards?.collection
            if (!collection.length) {
                return M.reply('📦 Your collection is empty. Cards move here when your deck (12 slots) is full.')
            }

            /* ---------- DETAILED CARD VIEW (BY INDEX) ---------- */
            if (args[0]) {
                const index = parseInt(args[0])

                if (isNaN(index) || index < 1 || index > collection.length) {
                    return M.reply(`❌ Invalid index. Choose a number between 1 and ${collection.length}.`)
                }

                const card = collection[index - 1]
                const emoji = getTierEmoji(card.tier)

                // Processing Media
                const media = await prepareMedia(card)

                const detailMsg = [
                    `📦 *COLLECTION CARD #${index}*`,
                    '',
                    `💠 *Title:* ${card.title}`,
                    `👑 *Tier:* ${card.tier} ${emoji}`,
                    `🏷️ *Type:* ${card.type?.toUpperCase() || 'UNKNOWN'}`,
                    `💰 *Base Price:* ₹${(card.basePrice || 0).toLocaleString()}`,
                    `🧩 *Piece Value:* ₹${(card.price || 0).toLocaleString()}`,
                    '',
                    `📝 *Source:* ${card.source || 'Original'}`
                ].join('\n')

                return M.replyRaw({
                    [media.type]: media.buffer,
                    mimetype: media.mime,
                    gifPlayback: media.isGif,
                    caption: detailMsg
                })
            }

            /* ---------- GENERAL LIST VIEW ---------- */
            let msg = `📦 *YOUR CARD COLLECTION (${collection.length})*\n\n`

            collection.forEach((card, i) => {
                const emoji = getTierEmoji(card.tier)
                msg += `${i + 1}. ${emoji} *${card.title}*\n   👑 Tier: ${card.tier}\n\n`
            })

            msg += `Use ${global.config.prefix}collection <number> for details.`

            // Preview the first card in the list
            const previewMedia = await prepareMedia(collection[0])

            return M.reply(previewMedia.buffer, previewMedia.type, previewMedia.mime, msg.trim())
        } catch (err) {
            console.error('[COLLECTION ERROR]', err)
            return M.reply('❌ An error occurred while loading your collection.')
        }
    }
)

/**
 * Helper to handle media conversions for individual card view
 */
const prepareMedia = async (card) => {
    // Default state
    let media = {
        buffer: null,
        type: 'image',
        mime: 'image/png', // Defaulting to png
        isGif: false
    }

    try {
        if (card.type === 'maz') {
            const rawBuffer = await getBuffer(card.image, true)
            media.isGif = ['UR', 'SSR'].includes(card.tier)

            if (media.isGif) {
                media.buffer = await webpToMp4(rawBuffer)
                media.type = 'video'
                media.mime = 'video/mp4'
            } else {
                // Ensure we use the converted PNG buffer
                media.buffer = await webpToPng(rawBuffer)
            }
        } else if (card.type === 'shoob') {
            let mediaUrl = card.image
            if (mediaUrl.toLowerCase().endsWith('.webm')) {
                mediaUrl = mediaUrl.replace(/\.webm$/i, '.gif')
            }
            let rawBuffer = await getBuffer(mediaUrl)
            media.isGif = ['Tier 6', 'Tier S'].includes(card.tier)

            if (media.isGif) {
                media.buffer = await gifToMp4(rawBuffer)
                media.type = 'video'
                media.mime = 'video/mp4'
            } else {
                media.buffer = rawBuffer
            }
        } else {
            // Default fallback for other card types
            media.buffer = await getBuffer(card.image)
        }
    } catch (e) {
        console.error(`Media Load Failed for [${card.title}]:`, e.message)
        // Return null or a placeholder to prevent downstream crashes
        return null
    }

    return media
}
