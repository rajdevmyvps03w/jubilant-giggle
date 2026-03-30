// src/plugins/downloader/ytv.js

import { plugin } from '../../utils/plugin.js'
import { getInfo, getVideoUrl, isYouTubeUrl, extractVideoId } from '../../functions/yt.js'
import yts from 'yt-search'

const VALID_QUALITIES = ['low', 'medium', 'high']

plugin(
    {
        name: 'ytv',
        aliases: ['youtube', 'ytvideo', 'yv'],
        category: 'downloader',
        description: {
            content: 'Download a YouTube video. Pass a URL or search by keyword.',
            usage: '<url | search query> [--quality=low|medium|high]',
            example: 'never gonna give you up --quality=high'
        }
    },
    async (_, M, { args, flags }) => {
        try {
            const p = global.config.prefix
            const qualityRaw = flags.quality?.toLowerCase()
            const quality = VALID_QUALITIES.includes(qualityRaw) ? qualityRaw : 'medium'
            const input = args.join(' ').trim()

            if (!input) {
                return M.reply(
                    `❌ Provide a YouTube URL or search query.\n\n` +
                        `*Usage:* ${p}ytv <URL or keyword> [--quality=low|medium|high]\n\n` +
                        `Examples:\n` +
                        `• ${p}ytv https://youtu.be/dQw4w9WgXcQ\n` +
                        `• ${p}ytv never gonna give you up --quality=high`
                )
            }

            let videoUrl, videoId

            if (isYouTubeUrl(input)) {
                videoUrl = input
                videoId = extractVideoId(input)
            } else {
                await M.reply(`🔍 Searching: *${input}*...`)
                try {
                    const { videos } = await yts(input)
                    if (!videos?.length) {
                        return M.reply(`❌ No results found for: *${input}*`)
                    }
                    videoUrl = videos[0].url
                    videoId = videos[0].videoId || extractVideoId(videos[0].url)
                } catch {
                    return M.reply(`❌ Search failed. Try a direct URL instead.`)
                }
            }

            let title, channel, duration, views, uploadDate, description

            try {
                const info = await getInfo(videoUrl)
                title = info.title
                channel = info.uploader || info.channel
                duration = info.duration
                views = info.view_count?.toLocaleString()
                uploadDate = info.upload_date
                    ? `${info.upload_date.slice(0, 4)}-${info.upload_date.slice(4, 6)}-${info.upload_date.slice(6, 8)}`
                    : null
                description = info.description?.slice(0, 200)
                videoId = info.id ?? videoId

                if (duration && duration > 1800) {
                    return M.reply(
                        `❌ *Video too long*\n\n` +
                            `This video is *${Math.floor(duration / 60)} minutes* long.\n` +
                            `Maximum allowed is *30 minutes*.`
                    )
                }
            } catch (e) {
                console.warn('[YTV] getInfo failed:', e.message)
                title = 'YouTube Video'
            }

            const fmtDuration = duration ? `${Math.floor(duration / 60)}m ${duration % 60}s` : null

            const infoText =
                `🎬 *${title}*\n` +
                (channel ? `🎤 *Channel:* ${channel}\n` : '') +
                (fmtDuration ? `⏱️ *Duration:* ${fmtDuration}\n` : '') +
                (views ? `👁️ *Views:* ${views}\n` : '') +
                (uploadDate ? `📅 *Date:* ${uploadDate}\n` : '') +
                `🎞️ *Quality:* ${quality.charAt(0).toUpperCase() + quality.slice(1)}\n` +
                `🔗 *URL:* ${videoUrl}` +
                (description ? `\n\n🌴 *Description:* ${description}...` : '')

            const thumb = videoId ? `https://i.ytimg.com/vi/${videoId}/sddefault.jpg` : null

            try {
                if (thumb) {
                    await M.replyRaw({
                        image: { url: thumb },
                        caption: `${infoText}\n\n⏳ _Fetching video stream..._`
                    })
                } else {
                    await M.reply(`${infoText}\n\n⏳ _Fetching video stream..._`)
                }
            } catch {
                /* cosmetic */
            }

            let streamUrl

            try {
                const result = await getVideoUrl(videoUrl, quality)
                streamUrl = result.url
            } catch (e) {
                console.error('[YTV] getVideoUrl failed:', e.message)
                return M.reply(
                    `❌ *Could not fetch video stream*\n\n` +
                        `The video may be age-restricted, private, or region-blocked.\n` +
                        `_Try a different quality or video._`
                )
            }

            const safeTitle = (title || 'video')
                .replace(/[^\w\s-]/g, '')
                .trim()
                .slice(0, 60)

            try {
                await M.replyRaw({
                    video: { url: streamUrl },
                    mimetype: 'video/mp4',
                    caption: infoText,
                    fileName: `${safeTitle}.mp4`
                })
            } catch (sendErr) {
                console.warn('[YTV] Video send failed:', sendErr.message)
                return M.reply(
                    `❌ *Failed to send video*\n\n` +
                        `WhatsApp rejected the stream. Try *--quality=low* for a smaller file.\n\n` +
                        `Direct link: ${streamUrl}`
                )
            }
        } catch (err) {
            console.error('[YTV ERROR]', err)
            return M.reply('❌ Download failed. Please try again later.')
        }
    }
)
