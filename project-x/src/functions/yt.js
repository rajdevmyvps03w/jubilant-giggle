import youtubedl from 'youtube-dl-exec'
import { tmpdir } from 'os'
import { readFile, unlink } from 'fs/promises'
import { randomBytes } from 'crypto'
import path from 'path'

const BASE_FLAGS = {
    noCheckCertificates: true,
    noWarnings: true,
    preferFreeFormats: true,
    addHeader: ['referer:youtube.com', 'user-agent:googlebot']
}

const tmpFile = (ext) => path.join(tmpdir(), `yt_${randomBytes(6).toString('hex')}.${ext}`)

export const getInfo = async (url) => youtubedl(url, { ...BASE_FLAGS, dumpSingleJson: true })

export const downloadAudio = async (url) => {
    const out = tmpFile('mp3')
    await youtubedl(url, {
        ...BASE_FLAGS,
        extractAudio: true,
        audioFormat: 'mp3',
        audioQuality: 0,
        output: out
    })
    const buffer = await readFile(out)
    unlink(out).catch(() => {})
    return buffer
}

export const getVideoUrl = async (url, quality = 'medium') => {
    const info = await youtubedl(url, { ...BASE_FLAGS, dumpSingleJson: true })

    const mp4s = (info.formats ?? []).filter((f) => f.ext === 'mp4' && (f.audio_channels ?? 0) >= 1)

    if (!mp4s.length) {
        throw new Error('No mp4+audio format found')
    }

    const sorted = mp4s.sort((a, b) => (a.height ?? 0) - (b.height ?? 0))

    let picked
    if (quality === 'low') {
        picked = sorted[0]
    } else if (quality === 'high') {
        picked = sorted[sorted.length - 1]
    } else {
        picked = sorted.filter((f) => (f.height ?? 0) <= 720).pop() ?? sorted[sorted.length - 1]
    }

    return {
        url: picked.url,
        seconds: Math.floor(info.duration ?? 0)
    }
}

export const isYouTubeUrl = (url = '') =>
    typeof url === 'string' && /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//i.test(url.trim())

export const extractVideoId = (url) => (url.match(/(?:youtu\.be\/|v=|shorts\/)([a-zA-Z0-9_-]{11})/) || [])[1] ?? null
