// src/plugins/misc/rfreject.js

import { plugin } from '../../utils/plugin.js'
import { findUser, editUser } from '../../database/db.js'

plugin(
    {
        name: 'rfreject',
        aliases: ['reject', 'rfno'],
        category: 'misc',
        isGroup: true,
        description: {
            usage: '<code>',
            content: 'Reject a relationship request using a valid RF code.',
            example: 'y3mpwdqea3en'
        }
    },
    async (client, M, { args }) => {
        try {
            const code = args[0]
            if (!code) {
                return M.reply('⚙️ Please provide a valid RF code to reject.')
            }

            const receiver = await findUser(M.sender.id)
            const rflist = receiver.rflist || []
            const request = rflist.find((r) => r.rfcode === code)

            if (!request) {
                return M.reply('❌ No pending RF request found with that code.')
            }

            const updatedList = rflist.filter((r) => r.rfcode !== code)
            const success = await editUser(M.sender.id, { rflist: updatedList })

            if (!success) {
                return M.reply('❌ Failed to update your request list. Please try again.')
            }

            /* NOTIFY SENDER ─────────────────────────────────────────────── */
            const sender = await findUser(request.jid)
            const notifyJid = sender?.jid || request.jid // use resolved jid, not raw request.jid
            const senderName = sender?.name || 'the user'

            client
                .sendMessage(notifyJid, {
                    text:
                        `💔 Your RF request has been *rejected* by *${receiver.name}*.\n` +
                        `You cannot request this user again for 3 weeks.`
                })
                .catch(() => console.log(`[RFREJECT] Could not notify ${notifyJid}`))

            return M.reply(`🚫 You have rejected the RF request from *${senderName}*.`)
        } catch (err) {
            console.error('[RFREJECT ERROR]', err)
            return M.reply('❌ An error occurred while processing the rejection.')
        }
    }
)
