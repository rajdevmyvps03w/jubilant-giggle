// src/functions/collage.js
// Builds a deck grid image using nodeHtmlToImage (same engine as quote.js).
//
// How it works:
//   1. Fetch card buffers in parallel (done by deck.js using getBuffer)
//   2. Extract first frame from animated webp / gif / webm using sharp + ffmpeg
//   3. Resize each card to slot size, encode as JPEG
//   4. Embed every card as a base64 data: URI directly in the HTML
//   5. Render the HTML to a PNG using nodeHtmlToImage (Puppeteer)
//
// No external network calls inside the renderer — all card data is embedded.
// Output: PNG Buffer ready to send as a WhatsApp image.

import nodeHtmlToImage from 'node-html-to-image'
import sharp from 'sharp'
import { spawn } from 'child_process'
import { tmpdir } from 'os'
import { readFile, unlink } from 'fs/promises'
import path from 'path'

const CARD_W = 160
const CARD_H = 224
const COLS = 4
const GAP = 10
const PADDING = 14
const RADIUS = 8

// ── Puppeteer args — mirrors quote.js exactly ─────────────────────────────────
const puppeteerArgs =
    process.env.PREFIX?.includes('com.termux') ||
    process.env.HOME?.includes('/data/data/com.termux') ||
    process.platform === 'android'
        ? {
              executablePath: '/data/data/com.termux/files/home/chrome',
              args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
          }
        : {
              args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
          }

// ── FFmpeg pipe: first frame from webm / large gif ────────────────────────────
const ffmpegFirstFrame = (buf) =>
    new Promise((resolve, reject) => {
        const proc = spawn('ffmpeg', [
            '-hide_banner',
            '-loglevel',
            'error',
            '-i',
            'pipe:0',
            '-vframes',
            '1',
            '-f',
            'image2',
            '-vcodec',
            'png',
            'pipe:1'
        ])

        proc.stdin.on('error', (err) => {
            if (err.code !== 'EPIPE') reject(err)
        })

        const chunks = [],
            errLines = []
        proc.stdout.on('data', (c) => chunks.push(c))
        proc.stderr.on('data', (d) => errLines.push(d.toString()))

        proc.on('close', (code) => {
            if (!chunks.length)
                return reject(new Error(`ffmpeg no output (${code}): ${errLines.join('').slice(0, 200)}`))
            resolve(Buffer.concat(chunks))
        })
        proc.on('error', reject)

        proc.stdin.write(buf)
        proc.stdin.end()
    })

// ── Convert buffer → base64 JPEG data URI ────────────────────────────────────
const GIF_THRESHOLD = 2 * 1024 * 1024

const toDataUri = async (buffer) => {
    if (!Buffer.isBuffer(buffer) || buffer.length === 0) return null

    try {
        let format = 'unknown',
            isAnimated = false
        try {
            const meta = await sharp(buffer, { pages: -1 }).metadata()
            format = meta.format || 'unknown'
            isAnimated = (meta.pages || 1) > 1
        } catch {
            format = 'webm'
        }

        let frame
        if (format === 'webm' || format === 'unknown') {
            frame = await ffmpegFirstFrame(buffer)
        } else if (format === 'gif' && isAnimated && buffer.length > GIF_THRESHOLD) {
            frame = await ffmpegFirstFrame(buffer)
        } else {
            // webp (static or animated), jpg, png, small gif
            // pages:1 = only decode first frame — key for animated webp
            frame = await sharp(buffer, { pages: 1, animated: false }).toBuffer()
        }

        const jpeg = await sharp(frame)
            .resize(CARD_W, CARD_H, { fit: 'cover', position: 'centre', kernel: 'lanczos2' })
            .flatten({ background: { r: 15, g: 17, b: 26 } })
            .jpeg({ quality: 82, mozjpeg: true })
            .toBuffer()

        return `data:image/jpeg;base64,${jpeg.toString('base64')}`
    } catch (err) {
        console.error('[COLLAGE] Card encode failed:', err.message)
        return null
    }
}

// ── Parse background to a CSS value ──────────────────────────────────────────
const parseBg = (bg) => {
    if (!bg || bg === 'transparent') return 'transparent'
    const named = { black: '#0d0f1a', white: '#ffffff', dark: '#0d0f1a', navy: '#0a0c23', gray: '#282832' }
    if (named[bg?.toLowerCase()]) return named[bg.toLowerCase()]
    return bg // hex, rgb(), or image URL — pass through
}

// ── Build HTML ────────────────────────────────────────────────────────────────
const buildHtml = (uris, bg, meta, totalW, totalH) => {
    const bgStyle = bg.startsWith('http') ? `background: url('${bg}') center/cover no-repeat` : `background: ${bg}`

    const cards = uris
        .map((uri, i) => {
            const m = meta[i] || {}
            const img = uri ? `<img src="${uri}" class="ci">` : `<div class="cp"></div>`
            const tier = m.tier ? `<div class="tb">${m.tier}</div>` : ''
            return `<div class="card">${img}<div class="ib">${i + 1}</div>${tier}</div>`
        })
        .join('')

    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
*{box-sizing:border-box;margin:0;padding:0}
body{width:${totalW}px;height:${totalH}px;${bgStyle};overflow:hidden}
.grid{display:grid;grid-template-columns:repeat(${COLS},${CARD_W}px);gap:${GAP}px;padding:${PADDING}px}
.card{position:relative;width:${CARD_W}px;height:${CARD_H}px;border-radius:${RADIUS}px;overflow:hidden;background:#0f111a;box-shadow:0 3px 10px rgba(0,0,0,.5)}
.ci{width:100%;height:100%;object-fit:cover;display:block}
.cp{width:100%;height:100%;background:#1a1c2e}
.ib{position:absolute;top:4px;left:4px;background:rgba(0,0,0,.62);color:#cbd5e1;font-family:Arial,sans-serif;font-size:10px;font-weight:700;padding:2px 5px;border-radius:4px;line-height:1.3}
.tb{position:absolute;bottom:4px;right:4px;background:rgba(0,0,0,.62);color:#94a3b8;font-family:Arial,sans-serif;font-size:10px;font-weight:700;padding:2px 5px;border-radius:4px;line-height:1.3}
</style></head><body><div class="grid">${cards}</div></body></html>`
}

export const createCollage = async (cards, background = 'black') => {
    if (!cards?.length) throw new Error('No cards provided')

    const items = cards.slice(0, 12)

    console.log(`[COLLAGE] Encoding ${items.length} card buffers...`)

    // Convert all buffers to base64 data URIs in parallel
    const uris = await Promise.all(
        items.map((item) => (Buffer.isBuffer(item) ? toDataUri(item) : Promise.resolve(null)))
    )

    const meta = items.map((item) =>
        Buffer.isBuffer(item) ? {} : { tier: item?.tier || '', title: item?.title || '' }
    )

    const valid = uris.filter(Boolean).length
    console.log(`[COLLAGE] ${valid}/${items.length} cards encoded`)
    if (valid === 0) throw new Error('No cards could be encoded')

    const bg = parseBg(background)
    const rows = Math.ceil(items.length / COLS)
    const totalW = PADDING * 2 + COLS * CARD_W + (COLS - 1) * GAP
    const totalH = PADDING * 2 + rows * CARD_H + (rows - 1) * GAP
    const html = buildHtml(uris, bg, meta, totalW, totalH)

    const outPath = path.join(tmpdir(), `deck_${Date.now()}.png`)
    console.log(`[COLLAGE] Rendering ${totalW}x${totalH}px...`)

    await nodeHtmlToImage({
        output: outPath,
        html,
        type: 'png',
        selector: '.grid',
        puppeteerArgs
    })

    const buffer = await readFile(outPath)
    await unlink(outPath).catch(() => {})

    console.log(`[COLLAGE] Done — ${(buffer.length / 1024).toFixed(1)} KB`)
    return buffer
}
