// src/plugins/misc/breakup.js

import { plugin } from '../../utils/plugin.js'
import { findUser, editUser } from '../../database/db.js'

plugin(
    {
        name: 'breakup',
        aliases: ['rfbreak', 'endrf'],
        category: 'misc',
        isGroup: true,
        description: {
            content: 'End your current relationship if you are in one.'
        }
    },
    async (client, M) => {
        try {
            const sender = await findUser(M.sender.id)

            if (!sender.relationship?.status) {
                return M.reply('💔 You are not in a relationship currently.')
            }

            const partnerJid = sender.relationship.jid || sender.relationship.lid
            const partner = await findUser(partnerJid)

            const resetStatus = {
                relationship: {
                    name: '',
                    status: false,
                    jid: '',
                    lid: '',
                    date: 0
                }
            }

            // Run both resets in parallel
            await Promise.all([
                editUser(M.sender.id, resetStatus),
                partner ? editUser(partnerJid, resetStatus) : Promise.resolve()
            ])

            if (partner) {
                const notifyJid = partner.jid || partnerJid
                client
                    .sendMessage(notifyJid, {
                        text: `💔 *${sender.name || 'Your partner'}* has ended the relationship with you. Take care 💭`
                    })
                    .catch((e) => console.log('[BREAKUP NOTIFY ERROR]', e.message))
            }

            return M.reply('💔 Relationship ended successfully. You are now single again.')
        } catch (err) {
            console.error('[BREAKUP COMMAND ERROR]', err)
            return M.reply('❌ An error occurred while processing your breakup.')
        }
    }
)
