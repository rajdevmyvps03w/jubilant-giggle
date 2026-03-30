import { plugin } from '../../utils/plugin.js'
import { setTimeoutUser, getContact } from '../../database/db.js'
import { parseTime } from '../../functions/helpler.js'

plugin(
    {
        name: 'timeout',
        aliases: ['mute', 'tm'],
        category: 'group',
        isGroup: true,
        isAdmin: true,
        description: {
            content: 'Set or extend a user timeout duration.',
            usage: '<@user> <reason> [--time=(e.g. 10m, 1h, 1d)]',
            example: '@user excessive spamming --time=30m'
        }
    },
    async (_, M, { text, flags }) => {
        const target =
            (M.mentioned?.[0] ?? (M.isQuoted ? M.quotedMessage?.participant : null)) &&
            !(M.isQuoted && M.sender.id !== M.quotedMessage.participant && M.sender.jid !== M.quotedMessage.participant)
                ? (M.mentioned?.[0] ?? M.quotedMessage?.participant)
                : null
        if (!target) {
            return M.reply('❌ Please mention or reply to a user to set a timeout.')
        }

        // Find the time argument (e.g., 10m)
        const rawTime = 'time' in flags ? flags.time : '30m'
        const isValidFormat = /^\d+[mhd]$/.test(rawTime)
        if (!isValidFormat) {
            return M.reply('❌ Please provide a valid duration (e.g., 10m, 1h, 1d).')
        }

        const durationMs = parseTime(rawTime)
        const name = await getContact(target)
        const reason = text || 'No reason specified'

        const result = await setTimeoutUser(target, M.from, durationMs, reason)

        const formatter = (ts) =>
            new Date(ts).toLocaleString('en-GB', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                day: '2-digit',
                month: 'short'
            })

        if (result.previousUntil) {
            // It was a stack/extension
            return M.reply(
                `⏳ *TIMEOUT EXTENDED: ${name}*\n\n` +
                    `⏪ *Previous End:* ${formatter(result.previousUntil)}\n` +
                    `➕ *Added:* ${rawTime}\n` +
                    `⏩ *New End:* ${formatter(result.newUntil)}\n` +
                    `📝 *Reason:* ${reason}`
            )
        } else {
            // New timeout
            return M.reply(
                `🚫 *USER TIMEOUT: ${name}*\n\n` +
                    `⏱️ *Duration:* ${rawTime}\n` +
                    `📅 *Until:* ${formatter(result.newUntil)}\n` +
                    `📝 *Reason:* ${reason}`
            )
        }
    }
)
