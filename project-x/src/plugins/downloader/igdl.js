import { plugin } from '../../utils/plugin.js'
import { getBuffer, fetch } from '../../functions/helpler.js'
import { fileTypeFromBuffer } from 'file-type'

plugin(
    {
        name: 'igdl',
        aliases: ['instagram', 'igdownload'],
        category: 'downloader',
        description: {
            content: 'Download Instagram post, reel, or carousel.',
            usage: '<instagram_url>',
            example: 'https://www.instagram.com/reel/xxxx/'
        }
    },
    async (_, M, { args }) => {
        try {
            const url = args?.[0]
            if (!url) {
                return M.reply('❌ Provide an Instagram URL.')
            }

            await M.reply('⏳ Fetching Instagram media...')

            let data
            try {
                data = await fetch(`https://api-fawn-seven-28.vercel.app/api/instaDownloader?link=${url}`)
            } catch (err) {
                console.error('[IGDL FETCH]', err)
                return M.reply('❌ Failed to fetch Instagram data. Please provide a valid url!')
            }

            if (data?.msg) {
                return M.reply('❌ Failed to fetch Instagram data. Please provide a valid url!')
            }

            if (!Array.isArray(data?.url) || !data.url.length) {
                return M.reply('❌ No media found. Please provide a valid url!')
            }

            const meta = data.metadata || {}

            const caption = (meta.caption && meta.caption.trim()) || (meta.username ? `From @${meta.username}` : '')

            for (const mediaUrl of data.url) {
                let buffer
                try {
                    buffer = await getBuffer(mediaUrl)
                } catch {
                    continue
                }

                if (!buffer) {
                    continue
                }

                let type = null
                try {
                    type = await fileTypeFromBuffer(buffer)
                } catch {}

                const isVideo = meta.isVideo === true || type?.mime?.startsWith('video')

                if (isVideo) {
                    await M.replyRaw({
                        video: buffer,
                        mimetype: 'video/mp4',
                        caption
                    })
                } else {
                    await M.replyRaw({
                        image: buffer,
                        caption
                    })
                }
            }
        } catch (err) {
            console.error('[IGDL COMMAND]', err)
            return M.reply('❌ Unexpected error while downloading Instagram media.')
        }
    }
)
