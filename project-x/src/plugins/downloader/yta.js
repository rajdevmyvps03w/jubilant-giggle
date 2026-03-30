// src/plugins/downloader/yta.js

import { plugin } from '../../utils/plugin.js'
import { getInfo, downloadAudio, isYouTubeUrl, extractVideoId } from '../../functions/yt.js'
import yts from 'yt-search'

plugin(
    {
        name: 'yta',
        aliases: ['ytaudio', 'ytmp3', 'play', 'song'],
        category: 'downloader',
        description: {
            content: 'Download a YouTube video as MP3. Pass a URL or search by keyword.',
            usage: '<url | search query>',
            example: 'never gonna give you up'
        }
    },
    async (_, M, { args }) => {
        try {
            const input = args.join(' ').trim()
            const p = global.config.prefix

            if (!input) {
                return M.reply(
                    `❌ Provide a YouTube URL or search query.\n\n` +
                        `*Usage:* ${p}yta <URL or keyword>\n\n` +
                        `Examples:\n` +
                        `• ${p}yta https://youtu.be/dQw4w9WgXcQ\n` +
                        `• ${p}yta never gonna give you up`
                )
            }

            // ── Resolve URL ───────────────────────────────────────────────────
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
                    return M.reply(`❌ Search failed. Try providing a direct URL instead.`)
                }
            }

            // ── Fetch metadata ────────────────────────────────────────────────
            let title, channel, duration, views, uploadDate

            try {
                const info = await getInfo(videoUrl)
                title = info.title
                channel = info.uploader || info.channel
                duration = info.duration // seconds (number)
                views = info.view_count?.toLocaleString()
                uploadDate = info.upload_date
                    ? `${info.upload_date.slice(0, 4)}-${info.upload_date.slice(4, 6)}-${info.upload_date.slice(6, 8)}`
                    : null
                videoId = info.id ?? videoId

                // Block very long videos (audio limit: 2 hours)
                if (duration && duration > 7200) {
                    return M.reply(
                        `❌ *Video too long*\n\n` +
                            `This video is *${Math.floor(duration / 60)} minutes* long.\n` +
                            `Maximum for audio download is *2 hours*.`
                    )
                }
            } catch (e) {
                console.warn('[YTA] getInfo failed:', e.message)
                title = 'YouTube Audio'
            }

            // ── Send info card ────────────────────────────────────────────────
            const thumb = videoId ? `https://i.ytimg.com/vi/${videoId}/sddefault.jpg` : null

            const fmtDuration = duration ? `${Math.floor(duration / 60)}m ${duration % 60}s` : null

            const caption =
                `🎵 *${title}*\n` +
                (channel ? `🎤 *Channel:* ${channel}\n` : '') +
                (fmtDuration ? `⏱️ *Duration:* ${fmtDuration}\n` : '') +
                (views ? `👁️ *Views:* ${views}\n` : '') +
                (uploadDate ? `📅 *Date:* ${uploadDate}\n` : '') +
                `\n⏳ _Downloading audio..._`

            try {
                if (thumb) {
                    await M.replyRaw({ image: { url: thumb }, caption })
                } else {
                    await M.reply(caption)
                }
            } catch {
                /* cosmetic — don't abort if thumbnail fails */
            }

            // ── Download ──────────────────────────────────────────────────────
            let audio
            try {
                audio = await downloadAudio(videoUrl)
            } catch (e) {
                console.error('[YTA] Download error:', e.message)
                return M.reply(
                    `❌ *Download Failed*\n\n` +
                        `The video may be age-restricted, private, or region-blocked.\n` +
                        `_Try a different video._`
                )
            }

            const safeTitle = (title || 'audio')
                .replace(/[^\w\s-]/g, '')
                .trim()
                .slice(0, 60)

            // ── Send as audio ─────────────────────────────────────────────────
            return M.replyRaw({
                audio: audio,
                mimetype: 'audio/mpeg',
                fileName: `${safeTitle}.mp3`,
                ptt: false
            })
        } catch (err) {
            console.error('[YTA ERROR]', err)
            return M.reply('❌ Download failed. Please try again later.')
        }
    }
)
