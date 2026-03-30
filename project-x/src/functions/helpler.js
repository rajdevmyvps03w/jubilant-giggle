import { plugins } from '../utils/plugin.js'
import { tmpdir } from 'os'
import { writeFile, readFile, unlink } from 'fs/promises'
import imgbbUploader from 'imgbb-uploader'
import { exec } from 'child_process'
import { fileTypeFromBuffer } from 'file-type'
import FormData from 'form-data'
import { load } from 'cheerio'
import { promisify } from 'util'
import axios from 'axios'

export const execute = promisify(exec)
const AUDIO_EFFECTS = {
    slow: 'atempo=0.8,asetrate=44100',
    nightcore: 'atempo=1.07,asetrate=44100*1.20',
    reverse: 'areverse',
    deep: 'atempo=1,asetrate=44500*2/3',
    fat: 'atempo=1.8,asetrate=30100',
    bass: 'equalizer=f=18:width_type=o:width=2:g=14',
    blown: 'acrusher=.1:1:40:0:log'
}

const MAX_LITTERBOX = 256 * 1024 * 1024

const QUAX_ALLOWED = [
    '.jpg',
    '.jpeg',
    '.png',
    '.gif',
    '.webp',
    '.avif',
    '.svg',
    '.mp4',
    '.mov',
    '.wmv',
    '.mpeg',
    '.mpg',
    '.webm',
    '.zip',
    '.rar',
    '.7z',
    '.tar',
    '.gz',
    '.tar.gz',
    '.tar.gz2',
    '.pdf',
    '.txt'
]

const MAX_QUAX = 256 * 1024 * 1024

export const uploadToQuax = async (buffer) => {
    if (!Buffer.isBuffer(buffer)) {
        throw new Error('Buffer required')
    }
    if (buffer.length > MAX_QUAX) {
        throw new Error('File too large (256MB max)')
    }

    const type = await fileTypeFromBuffer(buffer)
    if (!type) {
        throw new Error('Unknown file type')
    }

    const ext = `.${type.ext}`
    if (!QUAX_ALLOWED.includes(ext)) {
        throw new Error(`Unsupported type: ${ext}`)
    }

    const filename = `${randomString(6)}${ext}`

    const form = new FormData()
    form.append('files[]', buffer, { filename })
    form.append('expiry', '1')

    const { data } = await axios.post('https://qu.ax/upload', form, {
        headers: form.getHeaders(),
        maxBodyLength: Infinity,
        maxContentLength: Infinity
    })

    if (!data?.success || !data.files?.[0]) {
        throw new Error('Upload failed')
    }

    const file = data.files[0]
    const cleanExt = ext.slice(1)

    return `https://qu.ax/x/${file.file_name}.${cleanExt}`
}

export const normalizeImages = async (images = []) => {
    if (!Array.isArray(images) || images.length === 0) {
        throw new Error('Images array is empty')
    }

    return Promise.all(
        images.map(async (img) => {
            let buffer = Buffer.isBuffer(img) ? img : await getBuffer(img)
            const isGif = typeof img === 'string' && img.toLowerCase().endsWith('.gif')

            const isWebp = typeof img === 'string' && img.toLowerCase().endsWith('.webp')

            if (!isGif && !isWebp) {
                return buffer
            }

            const name = `${tmpdir()}/${randomString(6)}`
            const inputPath = `${name}.${isGif ? 'gif' : 'webp'}`
            const outputPath = `${name}.${isGif ? 'jpg' : 'png'}`

            try {
                await writeFile(inputPath, buffer)

                if (isGif) {
                    await execute(`ffmpeg -y -i "${inputPath}" -vf "select=eq(n\\,0)" -q:v 3 "${outputPath}"`)
                } else {
                    await execute(`ffmpeg -y -i "${inputPath}" "${outputPath}"`)
                }

                return await readFile(outputPath)
            } finally {
                await Promise.all([unlink(inputPath).catch(() => {}), unlink(outputPath).catch(() => {})])
            }
        })
    )
}

export const uploadToLitterbox = async (buffer, time = '1h') => {
    if (!Buffer.isBuffer(buffer)) {
        throw new Error('Buffer required')
    }
    if (buffer.length > MAX_LITTERBOX) {
        throw new Error('File too large (max 200MB)')
    }

    const valid = ['1h', '12h', '24h', '72h']
    if (!valid.includes(time)) {
        throw new Error('Invalid expiry')
    }

    // detect real file type
    const type = await fileTypeFromBuffer(buffer)
    const ext = type?.ext || 'bin'
    const filename = `${randomString(6)}.${ext}`

    const form = new FormData()
    form.append('reqtype', 'fileupload')
    form.append('time', time)
    form.append('fileToUpload', buffer, { filename })

    const { data } = await axios.post('https://litterbox.catbox.moe/resources/internals/api.php', form, {
        headers: form.getHeaders(),
        maxBodyLength: Infinity,
        maxContentLength: Infinity
    })

    if (!data || typeof data !== 'string' || !data.startsWith('https://')) {
        throw new Error('Upload failed')
    }

    return data.trim()
}

export const getDisplayUrl = async (buffer, api, name = randomString(10)) => {
    return await imgbbUploader({
        apiKey: api,
        base64string: buffer,
        name
    })
        .then((res) => res.url)
        .catch((e) => 'http://placekitten.com/300/300')
}

export const shortenUrl = async (url, alias = null, token) => {
    if (!token) {
        throw new Error('TinyURL token missing')
    }

    const body = { url, domain: 'tinyurl.com' }
    if (alias) {
        body.alias = alias
    }

    const { data } = await axios.post('https://api.tinyurl.com/create', body, {
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })

    const shortUrl = data?.data?.tiny_url
    if (!shortUrl) {
        throw new Error('TinyURL did not return a shortened link.')
    }

    return shortUrl
}

export const getAudioEffects = () => Object.keys(AUDIO_EFFECTS)

export const applyAudioEffects = async (buffer, effects = []) => {
    if (!Array.isArray(effects) || effects.length === 0) {
        throw new Error('No audio effects provided')
    }
    const filters = effects.map((e) => {
        const f = AUDIO_EFFECTS[e]
        if (!f) {
            throw new Error(`Unknown audio effect: ${e}`)
        }
        return f
    })

    const filterChain = filters.join(',')
    const name = `${tmpdir()}/${randomString(7)}`
    const input = `${name}.mp3`
    const output = `${name}_out.mp3`

    await writeFile(input, buffer)

    try {
        await execute(`ffmpeg -y -i "${input}" -af "${filterChain}" "${output}"`)
        const out = await readFile(output)
        await Promise.all([unlink(input).catch(() => {}), unlink(output).catch(() => {})])

        return out
    } catch (e) {
        await Promise.all([unlink(input).catch(() => {}), unlink(output).catch(() => {})])
        throw e
    }
}

export const gifToMp4 = async (gif) => {
    const filename = `${tmpdir()}/${randomString(7)}`
    await writeFile(`${filename}.gif`, gif)
    await execute(
        `ffmpeg -f gif -i "${filename}.gif" -movflags faststart -pix_fmt yuv420p -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" "${filename}.mp4"`
    )
    const buffer = await readFile(`${filename}.mp4`)
    await Promise.all([unlink(`${filename}.gif`).catch(() => {}), unlink(`${filename}.mp4`).catch(() => {})])

    return buffer
}

export const webpToMp4 = async (webp) => {
    const request = async (form, file) => {
        const { data } = await axios.post(
            file ? `https://ezgif.com/webp-to-mp4/${file}` : 'https://ezgif.com/webp-to-mp4',
            form,
            {
                headers: { 'Content-Type': `multipart/form-data; boundary=${form._boundary}` }
            }
        )
        return load(data)
    }
    const form1 = new FormData()
    form1.append('new-image-url', '')
    form1.append('new-image', webp, { filename: 'bold' })
    const $1 = await request(form1)
    const file = $1('input[name="file"]').attr('value')
    const form2 = new FormData()
    form2.append('file', file)
    form2.append('convert', 'Convert WebP to MP4!')
    const $2 = await request(form2, file)
    const buffer = await getBuffer(`https:${$2('div#output > p.outfile > video > source').attr('src')}`)
    return buffer
}

export const webpToPng = async (buffer) => {
    const name = `${tmpdir()}/${randomString(7)}`
    const input = `${name}.webp` // Fixed: Define input
    const output = `${name}.png` // Fixed: Define output

    await writeFile(input, buffer) // Write with extension

    try {
        await execute(`dwebp "${input}" -o "${output}"`)
        const png = await readFile(output)
        return png
    } catch (error) {
        console.error('webpToPng Error:', error)
        throw error
    } finally {
        await Promise.all([unlink(input).catch(() => {}), unlink(output).catch(() => {})])
    }
}

export const realURL = async (url) => (await axios.get(url)).request.res.responseUrl

export const parseArgs = (raw) => {
    const splitArgs = raw
        .trim()
        .split(/\s+/)
        .filter((arg) => !/^@[0-9]{7,}$/.test(arg))

    const first = splitArgs.shift() || ''
    const prefix = global.config.prefix || '!'
    const cmd = first.startsWith(prefix) ? first.slice(prefix.length).toLowerCase() : first.toLowerCase()

    const flags = {}
    const cleanArgs = []

    for (const arg of splitArgs) {
        if (arg.startsWith('--')) {
            const [key, value] = arg.slice(2).split('=')
            flags[key] = value ?? ''
        } else if (arg.startsWith('-')) {
            flags[arg.slice(1)] = ''
        } else {
            cleanArgs.push(arg)
        }
    }

    const text = cleanArgs.join(' ')
    const args = cleanArgs

    return { cmd, text, flags, args, raw }
}

export const toSmallCaps = (text) => {
    const map = {
        a: 'ᴀ',
        b: 'ʙ',
        c: 'ᴄ',
        d: 'ᴅ',
        e: 'ᴇ',
        f: 'ꜰ',
        g: 'ɢ',
        h: 'ʜ',
        i: 'ɪ',
        j: 'ᴊ',
        k: 'ᴋ',
        l: 'ʟ',
        m: 'ᴍ',
        n: 'ɴ',
        o: 'ᴏ',
        p: 'ᴘ',
        q: 'ǫ',
        r: 'ʀ',
        s: 'ꜱ',
        t: 'ᴛ',
        u: 'ᴜ',
        v: 'ᴠ',
        w: 'ᴡ',
        x: 'x',
        y: 'ʏ',
        z: 'ᴢ'
    }

    return [...text].map((c) => map[c.toLowerCase()] || c).join('')
}

export const toScriptFont = (text) => {
    const map = {
        a: '𝓪',
        b: '𝓫',
        c: '𝓬',
        d: '𝓭',
        e: '𝓮',
        f: '𝓯',
        g: '𝓰',
        h: '𝓱',
        i: '𝓲',
        j: '𝓳',
        k: '𝓴',
        l: '𝓵',
        m: '𝓶',
        n: '𝓷',
        o: '𝓸',
        p: '𝓹',
        q: '𝓺',
        r: '𝓻',
        s: '𝓼',
        t: '𝓽',
        u: '𝓾',
        v: '𝓿',
        w: '𝔀',
        x: '𝔁',
        y: '𝔂',
        z: '𝔃'
    }

    return [...text].map((c) => map[c.toLowerCase()] || c).join('')
}

export const toBoldItalicUpper = (text) => {
    const map = {
        a: '𝘼',
        b: '𝘽',
        c: '𝘾',
        d: '𝘿',
        e: '𝙀',
        f: '𝙁',
        g: '𝙂',
        h: '𝙃',
        i: '𝙄',
        j: '𝙅',
        k: '𝙆',
        l: '𝙇',
        m: '𝙈',
        n: '𝙉',
        o: '𝙊',
        p: '𝙋',
        q: '𝙌',
        r: '𝙍',
        s: '𝙎',
        t: '𝙏',
        u: '𝙐',
        v: '𝙑',
        w: '𝙒',
        x: '𝙓',
        y: '𝙔',
        z: '𝙕'
    }

    return [...text].map((c) => map[c.toLowerCase()] || c).join('')
}

export const randomBool = () => getRandomInt(0, 1) === 1

export const chunk = (arr, length) => {
    const result = []
    for (let i = 0; i < arr.length / length; i++) {
        result.push(arr.slice(i * length, i * length + length))
    }
    return result
}

export const inRange = (num, min, max) => num >= min && num <= max

export const swap = (array, index1, index2) => {
    //prettier-ignore
    ;[array[index1], array[index2]] = [array[index2], array[index1]]
    return array
}

export const shuffle = (array) => {
    for (let i = array.length - 1; i > 0; i--) {
        const j = getRandomInt(0, i)
        swap(array, i, j)
    }
    return array
}

export const calculatePing = (timestamp, now) => (now - timestamp) / 1000

export const capitalize = (content, all = false) => {
    if (!all) return `${content.charAt(0).toUpperCase()}${content.slice(1)}`
    return `${content
        .split('')
        .map((text) => `${text.charAt(0).toUpperCase()}${text.slice(1)}`)
        .join('')}`
}

export const fetch = async (url) => (await axios.get(url)).data

export const generateRandomHex = () => `#${(~~(Math.random() * (1 << 24))).toString(16)}`

export const bufferToBase64 = (buffer) =>
    new Promise((resolve) => {
        const buff = new Buffer(buffer)
        const base64string = buff.toString('base64') // https://nodejs.org/api/buffer.html#buftostringencoding-start-end
        return setTimeout(() => {
            resolve(base64string)
        }, 1000)
    })

export const formatSeconds = (seconds) => new Date(seconds * 1000).toISOString().substr(11, 8)

export const getClosestCommand = (input) => {
    const allCmds = plugins.map((p) => p.name).concat(plugins.flatMap((p) => p.aliases))
    let closest = null
    let minDistance = Infinity

    const levenshtein = (a, b) => {
        const matrix = Array.from({ length: a.length + 1 }, (_, i) => [i])
        for (let j = 0; j <= b.length; j++) matrix[0][j] = j
        for (let i = 1; i <= a.length; i++) {
            for (let j = 1; j <= b.length; j++) {
                matrix[i][j] =
                    a[i - 1] === b[j - 1]
                        ? matrix[i - 1][j - 1]
                        : 1 + Math.min(matrix[i - 1][j - 1], matrix[i][j - 1], matrix[i - 1][j])
            }
        }
        return matrix[a.length][b.length]
    }

    for (const cmd of allCmds) {
        const dist = levenshtein(input, cmd)
        if (dist < minDistance) {
            minDistance = dist
            closest = cmd
        }
    }

    return closest
}

export const inAuction = (jid) => {
    for (const auction of global.activeAuctions.values()) {
        if (!auction.ended && (auction.seller === jid || auction.highestBidder === jid)) {
            return true
        }
    }
    return false
}

export const generateRandomUserAgent = () => {
    const versions = [
            '4.0.3',
            '4.1.1',
            '4.2.2',
            '4.3',
            '4.4',
            '5.0.2',
            '5.1',
            '6.0',
            '7.0',
            '8.0',
            '9.0',
            '10.0',
            '11.0'
        ],
        deviceModels = ['M2004J19C', 'S2020X3', 'Xiaomi4S', 'RedmiNote9', 'SamsungS21', 'GooglePixel5'],
        buildVersions = ['RP1A.200720.011', 'RP1A.210505.003', 'RP1A.210812.016', 'QKQ1.200114.002', 'RQ2A.210505.003']

    const randomElement = (arr) => arr[Math.floor(Math.random() * arr.length)]

    const randomChromeVersion = () => {
        const majorVersion = Math.floor(Math.random() * 80) + 1
        const minorVersion = Math.floor(Math.random() * 999) + 1
        const buildVersion = Math.floor(Math.random() * 9999) + 1
        return `Chrome/${majorVersion}.${minorVersion}.${buildVersion}`
    }

    const randomWhatsAppVersion = () => {
        const major = Math.floor(Math.random() * 9) + 1
        const minor = Math.floor(Math.random() * 9) + 1
        return `WhatsApp/1.${major}.${minor}`
    }

    return `Mozilla/5.0 (Linux; Android ${randomElement(versions)}; ${randomElement(deviceModels)} Build/${randomElement(buildVersions)}) AppleWebKit/537.36 (KHTML, like Gecko) ${randomChromeVersion()} Mobile Safari/537.36 ${randomWhatsAppVersion()}`
}

export const generateRandomIP = () => {
    const randomByte = () => Math.floor(Math.random() * 256)
    return `${randomByte()}.${randomByte()}.${randomByte()}.${randomByte()}`
}

export const findCriteria = (criteria, map) => {
    const exchanges = Array.from(map.values())
    return exchanges.find((exchange) => {
        return Object.keys(criteria).every((key) => exchange[key] === criteria[key])
    })
}

export const extractNumbers = (content) => {
    const search = content.match(/(-\d+|\d+)/g)
    if (search !== null) {
        const result = search.map((string) => parseInt(string))
        for (let i = 0; i < result.length; i++) {
            if (result[i] > 0) continue
            result[i] = 0
        }
        return result
    }
    return []
}

export const getRandomInt = (min, max) => {
    return Math.floor(Math.random() * (max - min + 1)) + min
}

export const randomString = (maxLength = 8) => [...Array(maxLength)].map(() => Math.random().toString(36)[2]).join('')

export const getRandomFloat = (min, max) => {
    return Math.random() * (max - min) + min
}

export const getRandomItem = (array) => array[getRandomInt(0, array.length - 1)]

export const getRandomItems = (array, count) => {
    return new Array(count).fill(0).map(() => getRandomItem(array))
}

export const getUrls = (url) => {
    const urls = new Set()
    const regex = /(https?:\/\/[^\s]+)/g
    let match
    while ((match = regex.exec(url)) !== null) {
        urls.add(match[1])
    }
    return urls
}

export const parseTime = (str) => {
    const num = parseInt(str)

    if (str.endsWith('m')) {
        return num * 60 * 1000
    }
    if (str.endsWith('h')) {
        return num * 60 * 60 * 1000
    }
    if (str.endsWith('d')) {
        return num * 24 * 60 * 60 * 1000
    }

    return num * 1000
}

export const getBuffer = async (url, special = false, retries = 3) => {
    if (!url || typeof url !== 'string') {
        throw new Error('Invalid URL')
    }

    let lastError

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const res = await axios.get(url, {
                responseType: 'arraybuffer',
                timeout: 30000, // shorter but safer
                maxRedirects: 5,
                validateStatus: (s) => s >= 200 && s < 300,
                headers: special
                    ? {
                          'User-Agent': generateRandomUserAgent(),
                          'X-Forwarded-For': generateRandomIP(),
                          Accept: '*/*'
                          // ❌ removed Host override (can cause resets)
                      }
                    : {}
            })

            const buffer = Buffer.from(res.data)

            if (!buffer.length) {
                throw new Error('Empty buffer')
            }

            return buffer
        } catch (err) {
            lastError = err

            // retry only on network errors
            const retryable =
                err.code === 'ECONNRESET' ||
                err.code === 'ETIMEDOUT' ||
                err.code === 'EAI_AGAIN' ||
                err.message?.includes('timeout')

            if (!retryable || attempt === retries) {
                break
            }

            // small backoff
            await new Promise((r) => setTimeout(r, 500 * attempt))
        }
    }

    throw lastError
}
