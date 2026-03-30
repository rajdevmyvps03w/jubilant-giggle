import { plugin, plugins } from '../../utils/plugin.js'
import { toSmallCaps } from '../../functions/helpler.js'
import axios from 'axios'

// Helper: get greeting based on hour (UTC+7)
const getGreeting = (hour) => {
    if (hour >= 5 && hour < 12) return 'Good Morning'
    if (hour >= 12 && hour < 17) return 'Good Afternoon'
    if (hour >= 17 && hour < 21) return 'Good Evening'
    return 'Good Night'
}

// Helper: get day name
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

// Javanese Pasaran cycle (reference epoch)
const PASARAN = ['Legi', 'Pahing', 'Pon', 'Wage', 'Kliwon']
const getPasaran = (date) => {
    const epoch = new Date('2000-01-01') // Known Legi date
    const diff = Math.floor((date - epoch) / 86400000)
    return PASARAN[((diff % 5) + 5) % 5]
}

// Helper: format time as HH:MM:SS from a UTC timestamp + offset hours
const formatTime = (utcMs, offsetHours) => {
    const d = new Date(utcMs + offsetHours * 3600000)
    const h = String(d.getUTCHours()).padStart(2, '0')
    const m = String(d.getUTCMinutes()).padStart(2, '0')
    const s = String(d.getUTCSeconds()).padStart(2, '0')
    return `${h}:${m}:${s}`
}

// Helper: format full date string
const formatDate = (utcMs, offsetHours) => {
    const d = new Date(utcMs + offsetHours * 3600000)
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const dayName = DAYS[d.getUTCDay()]
    const pasaran = getPasaran(d)
    const day = d.getUTCDate()
    const month = months[d.getUTCMonth()]
    const year = d.getUTCFullYear()
    return { dayName, pasaran, full: `${dayName}, ${month} ${day}, ${year}` }
}

// Category config: emoji + display label + order
// 'dev' is intentionally excluded here — it's injected separately for devs only
const CATEGORIES = [
    { key: 'cards', emoji: '🃏', label: 'Cards & Collection' },
    { key: 'economy', emoji: '💰', label: 'Economy' },
    { key: 'stocks', emoji: '📈', label: 'Stocks & Market' },
    { key: 'pet', emoji: '🐾', label: 'Pets' },
    { key: 'game', emoji: '🎮', label: 'Games' },
    { key: 'fun', emoji: '🎉', label: 'Fun' },
    { key: 'weeb', emoji: '🌸', label: 'Weeb & Anime' },
    { key: 'image', emoji: '🖼️', label: 'Image & Memes' },
    { key: 'sticker', emoji: '✨', label: 'Stickers' },
    { key: 'downloader', emoji: '📥', label: 'Media Downloader' },
    { key: 'search', emoji: '🔎', label: 'Search & Info' },
    { key: 'utils', emoji: '🛠️', label: 'Tools & Utils' },
    { key: 'group', emoji: '👥', label: 'Group Management' },
    { key: 'misc', emoji: '📦', label: 'Misc' }
]

// Dev category config (shown only to mods/devs)
const DEV_CATEGORY = { key: 'dev', emoji: '⚙️', label: 'Dev Tools' }

plugin(
    {
        name: 'help',
        aliases: ['menu', 'commands'],
        category: 'misc',
        description: {
            usage: '<command_name>',
            content: 'Show the help menu or detailed info for a specific command.',
            example: 'wallet'
        }
    },
    async (_, M, { args }) => {
        const prefix = global.config.prefix
        const query = args[0]?.toLowerCase()
        const isDev = global.config.mods.includes(M.sender.jid)

        // ── Detailed help for a single command ──────────────────────────────
        if (query) {
            const cmd = plugins.find(
                (c) => c.name.toLowerCase() === query || c.aliases.map((a) => a.toLowerCase()).includes(query)
            )

            if (!cmd) {
                return M.reply(
                    `❌ No command found with the name or alias *"${query}"*.\n\nTry *${prefix}help* to see all commands.`
                )
            }

            // Hide dev commands from non-devs even in detailed lookup
            if (cmd.category === 'dev' && !isDev) {
                return M.reply(
                    `❌ No command found with the name or alias *"${query}"*.\n\nTry *${prefix}help* to see all commands.`
                )
            }

            const isDevCmd = cmd.category === 'dev'
            const devBadge = isDevCmd ? '\n🔒 *Access:* Developers Only' : ''

            return M.reply(
                `⚙️ *Command Information*\n\n` +
                    `🔹 *Name:* ${prefix}${cmd.name}\n` +
                    `📂 *Category:* ${cmd.category || 'misc'}\n` +
                    `📝 *Aliases:* ${cmd.aliases.length ? cmd.aliases.map((a) => `${prefix}${a}`).join(', ') : 'None'}\n` +
                    `📘 *Usage:* ${prefix}${cmd.name}${cmd.usage ? ` ${cmd.usage}` : ''}\n` +
                    `💬 *Description:* ${cmd.content || 'No description.'}\n` +
                    `🔧 *Example:* ${prefix}${cmd.name}${cmd.example ? ` ${cmd.example}` : ''}` +
                    `${devBadge}\n\n` +
                    `_<> = required, [ ] = optional_`
            )
        }

        // ── Full menu ────────────────────────────────────────────────────────
        const now = Date.now()

        // Time strings
        const t7 = formatTime(now, 7)
        const t8 = formatTime(now, 8)
        const t9 = formatTime(now, 9)

        // Date info (use UTC+7 as base)
        const { dayName, pasaran, full: fullDate } = formatDate(now, 7)

        // Greeting uses UTC+7 hour
        const hour7 = new Date(now + 7 * 3600000).getUTCHours()
        const greeting = getGreeting(hour7)

        // Group plugins by category
        // If not a dev, completely exclude 'dev' category commands from grouping
        const grouped = {}
        for (const cmd of plugins) {
            const cat = (cmd.category || 'misc').toLowerCase()
            if (cat === 'dev' && !isDev) continue // ← hide dev cmds from regular users
            if (!grouped[cat]) grouped[cat] = []
            grouped[cat].push(cmd)
        }

        // Build header
        let text = `👋🏻 (❤️ω❤️) Konnichiwa, and ${greeting} senpai ${M.sender.name}! this is Shirakami Fubuki\n\n🎋 *Support us by following us on instagram:*
https://www.instagram.com/das_abae
                                    
This help menu is designed to help you get started with the bot.

💡 My Prefix is *( ${global.config.prefix} )*\n\n`
        text += `*Time:*\n`
        text += `UTC+7: ${t7}\n`
        text += `UTC+8: ${t8}\n`
        text += `UTC+9: ${t9}\n`
        text += `Day: ${dayName} ${pasaran}\n`
        text += `Date: ${fullDate}\n`

        // If dev, add a special banner before the dev section
        if (isDev) {
            text += `\n🔐 *Developer Mode Active* — showing all categories including dev tools.\n`
        }

        // Build category blocks in defined order
        // Known public categories first, then any unknown extras, then dev (if applicable)
        const orderedPublicKeys = CATEGORIES.map((c) => c.key)
        const extraKeys = Object.keys(grouped).filter((k) => !orderedPublicKeys.includes(k) && k !== 'dev')
        const allKeys = [...orderedPublicKeys, ...extraKeys]

        // Render all non-dev categories
        for (const key of allKeys) {
            if (!grouped[key] || grouped[key].length === 0) continue

            const catConfig = CATEGORIES.find((c) => c.key === key)
            const emoji = catConfig?.emoji || '📁'
            const label = catConfig?.label || key.charAt(0).toUpperCase() + key.slice(1)
            const cmds = grouped[key]

            text += `\n┌─「 ${emoji} ${label} ${emoji} 」\n`
            for (const cmd of cmds) {
                text += `└  ${prefix}${toSmallCaps(cmd.name)}\n`
            }
            text += `\n`
        }

        // ── Dev category block — only rendered for devs ──────────────────────
        if (isDev && grouped['dev'] && grouped['dev'].length > 0) {
            text += `\n┌─「 ${DEV_CATEGORY.emoji} ${DEV_CATEGORY.label} ${DEV_CATEGORY.emoji} 」\n`
            for (const cmd of grouped['dev']) {
                text += `└  *${prefix}${toSmallCaps(cmd.name)}*\n`
            }
            text += `\n`
        }

        const buffer = Buffer.from(
            (
                await axios.get('https://qu.ax/x/ocbQT.mp4', {
                    responseType: 'arraybuffer',
                    headers: {
                        'User-Agent':
                            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
                        Referer: 'https://qu.ax/',
                        Accept: '*/*'
                    }
                })
            ).data
        )

        text += `\n📇 *Notes:*
➪ Use ${prefix}help <command> to view details.
➪ Example: ${prefix}help profile
➪ <> = required, [ ] = optional (omit brackets when typing).`

        return M.replyRaw({
            video: buffer,
            mimetype: 'video/mp4',
            gifPlayback: true,
            caption: text.trim()
        })
    }
)
