import { plugin } from '../../utils/plugin.js'
// Updated to your new MongoDB database path
import { findUser, editUser } from '../../database/db.js'

plugin(
    {
        name: 'rfrequestlist',
        aliases: ['rflistreq', 'pendingrf', 'rfreq'],
        category: 'misc',
        isGroup: true,
        description: {
            content: 'Show all pending RF requests you have received within the last 3 weeks.'
        }
    },
    async (_, M) => {
        try {
            /* ---------- REGISTRATION CHECK ---------- */
            const { rflist } = await findUser(M.sender.id)

            /* ---------- AUTOMATIC EXPIRY PRUNING ---------- */
            const now = new Date()
            const validRequests = rflist.filter((req) => {
                const diffTime = now - new Date(req.date)
                const diffWeeks = diffTime / (1000 * 60 * 60 * 24 * 7)
                return diffWeeks < 3 // Keep only those under 3 weeks old
            })

            // If some requests have expired, update the database silently
            if (validRequests.length !== rflist.length) {
                await editUser(M.sender.id, { rflist: validRequests })
            }

            if (validRequests.length === 0) {
                return M.reply('📭 Your inbox is empty. You have no pending RF requests.')
            }

            /* ---------- LIST FORMATTING ---------- */
            const list = validRequests
                .map((r, i) => {
                    const reqDate = new Date(r.date).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                    })

                    return (
                        `${i + 1}. *${r.name || 'Anonymous'}* (${r.rfcode || 'No Code'})\n` +
                        `🎂 Age: ${r.age || 'N/A'}\n` +
                        `🚻 Gender: ${r.gender?.toUpperCase() || 'N/A'}\n` +
                        `📅 Sent: ${reqDate}`
                    )
                })
                .join('\n\n---\n\n')

            const message = `
💌 *PENDING RF REQUESTS (${validRequests.length})*

${list}

💡 *To respond:*
• Accept: *${global.config.prefix}rfaccept <code>*
• Reject: *${global.config.prefix}rfreject <code>*
`.trim()

            return M.reply(message)
        } catch (err) {
            console.error('[RFREQUESTLIST ERROR]', err)
            return M.reply('❌ An error occurred while fetching your request list.')
        }
    }
)
