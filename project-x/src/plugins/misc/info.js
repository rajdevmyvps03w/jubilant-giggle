import { plugin, plugins } from '../../utils/plugin.js'
import os from 'os'
import { User, Group, Contact } from '../../database/models/index.js'

plugin(
    {
        name: 'info',
        aliases: ['botinfo', 'stats'],
        category: 'misc',
        description: {
            content: 'Show bot statistics, usage info, and system status.'
        }
    },
    async (_, M) => {
        try {
            /* ---------- SYSTEM DATA ---------- */
            const totalRam = os.totalmem()
            const freeRam = os.freemem()
            const usedRam = totalRam - freeRam
            const format = (bytes) => (bytes / (1024 * 1024)).toFixed(2) + ' MB'

            /* ---------- MONGODB COUNTS (ASYNC) ---------- */
            // We use Promise.all to fetch all counts simultaneously for speed
            const [userCount, groupCount, contactCount] = await Promise.all([
                User.countDocuments(),
                Group.countDocuments(),
                Contact.countDocuments()
            ])

            /* ---------- UPTIME CALCULATION ---------- */
            const uptime = process.uptime()
            const hours = Math.floor(uptime / 3600)
            const minutes = Math.floor((uptime % 3600) / 60)
            const uptimeString = `${hours}h ${minutes}m`

            /* ---------- MESSAGE CONSTRUCTION ---------- */
            const message = `🤖 *BOT INFORMATION & STATUS*

👤 *Registered Users:* ${userCount.toLocaleString()}

👨‍👩‍👧‍👦 *Active Groups:* ${groupCount.toLocaleString()}

📇 *Total Contacts:* ${contactCount.toLocaleString()}

⚙️ *Total Commands:* ${plugins.size || plugins.length}

🛡 *Mods / Owners:* ${global.config.mods.length}

🔑 *Bot Prefix:* [ ${global.config.prefix} ]

 🔋 *RAM:* ${format(usedRam)} / ${format(totalRam)}

🖥 *Platform:* ${os.platform()} (${os.arch()})

⏱ *Uptime:* ${uptimeString}

🚀 *Project-X.inc by ryzen达斯*`

            return M.reply(message.trim())
        } catch (err) {
            console.error('[INFO COMMAND ERROR]', err)
            return M.reply('❌ Failed to fetch bot information. Check console for details.')
        }
    }
)
