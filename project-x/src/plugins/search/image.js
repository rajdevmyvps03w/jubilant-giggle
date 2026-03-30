import google from 'googlethis'
import { plugin } from '../../utils/plugin.js'
import { getRandomItems } from '../../functions/helpler.js'

// Helper function to create delay
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

plugin(
    {
        name: 'image',
        aliases: ['img', 'gimg'],
        category: 'search',
        description: {
            usage: '<search query> | <number>',
            content: 'Search images with a specific count (Max 7) and delay.',
            example: 'cat | 5'
        }
    },
    async (_, M, { text }) => {
        if (!text) {
            return M.reply(`❌ Please provide a query.\n\n` + `Example: ${global.config.prefix}image cat | 3`)
        }

        // Split by | to get query and count
        let [query, countStr] = text.split('|').map((item) => item.trim())

        // Default to 1 image if no number provided, otherwise parse it
        let count = countStr ? parseInt(countStr) : 1

        // Validation: Max 7 images, Min 1
        if (isNaN(count) || count < 1) count = 1
        if (count > 7) {
            await M.reply('⚠️ Max limit is 7 images. Adjusting to 7...')
            count = 7
        }

        try {
            const images = await google.image(query, { safe: false })

            if (!images || images.length === 0) {
                return M.reply(`⚠️ No images found for "${query}".`)
            }

            // Shuffle or just slice the top results
            const results = getRandomItems(images, count)

            await M.reply(`🔍 Sending ${results.length} images for: *${query}*...`)

            for (const item of results) {
                await M.replyRaw({
                    image: { url: item.url },
                    caption: `🔗 *Source:* ${item.origin.title || 'Google'}`
                }).catch((err) => {
                    console.error(`[IMAGE_REPLY_ERROR]`, err.message)
                })

                // Add 1.5 second delay between images to avoid spam detection
                await sleep(1500)
            }
        } catch (err) {
            console.error('[GOOGLE_THIS_ERROR]', err)
            return M.reply('⚠️ Failed to fetch images. Please try again later.')
        }
    }
)
