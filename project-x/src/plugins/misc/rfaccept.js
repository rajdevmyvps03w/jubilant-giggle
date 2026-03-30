// src/plugins/misc/rfaccept.js

import { plugin } from '../../utils/plugin.js'
import { findUser, editUser } from '../../database/db.js'

plugin(
    {
        name: 'rfaccept',
        aliases: ['accept', 'rfok'],
        category: 'misc',
        description: {
            usage: '<code>',
            content: 'Accept a relationship request using a valid RF code.',
            example: 'y3mpwdqea3en'
        }
    },
    async (client, M, { args }) => {
        try {
            const code = args[0]
            if (!code) return M.reply('❗ Please provide a valid RF code to accept.')

            /* 1. RECEIVER VALIDATION ─────────────────────────────────────── */
            const receiver = await findUser(M.sender.id)

            if (!receiver.rf) {
                return M.reply('⚠️ Your RF flag is currently *disabled*.')
            }

            if (receiver.relationship?.status) {
                return M.reply('💔 You are already in a relationship.')
            }

            /* 2. REQUEST LOOKUP ──────────────────────────────────────────── */
            const rflist = receiver.rflist || []
            const request = rflist.find((r) => r.rfcode === code)

            if (!request) {
                return M.reply('⚠️ No pending request found with this RF code.')
            }

            const updatedRfList = rflist.filter((r) => r.rfcode !== code)

            // Expiry — 3 weeks
            const diffWeeks = (Date.now() - new Date(request.date).getTime()) / (1000 * 60 * 60 * 24 * 7)
            if (diffWeeks > 3) {
                await editUser(M.sender.id, { rflist: updatedRfList })
                return M.reply(`⚠️ The RF request from *${request.name}* has expired (older than 3 weeks).`)
            }

            /* 3. SENDER VALIDATION ───────────────────────────────────────── */
            const senderId = request.jid
            const sender = await findUser(senderId)

            if (!sender) {
                await editUser(M.sender.id, { rflist: updatedRfList })
                return M.reply('❌ The user who sent this request is no longer in the database.')
            }

            if (sender.relationship?.status) {
                await editUser(M.sender.id, { rflist: updatedRfList })
                return M.reply('💔 The sender is already in a relationship with someone else.')
            }

            if (!sender.rf) {
                await editUser(M.sender.id, { rflist: updatedRfList })
                return M.reply("⚠️ The sender's RF flag is now disabled.")
            }

            const timestamp = Date.now()

            const receiverJid = receiver.jid || M.sender.id
            const receiverLid = receiver.lid || receiverJid // fallback to jid, not sender.id
            const senderJid = sender.jid || senderId
            const senderLid = sender.lid || senderJid

            const [senderSaved, receiverSaved] = await Promise.all([
                editUser(senderId, {
                    rf: false,
                    relationship: {
                        name: receiver.name,
                        status: true,
                        jid: receiverJid,
                        lid: receiverLid,
                        date: timestamp
                    }
                }),
                editUser(M.sender.id, {
                    rflist: [],
                    rf: false,
                    relationship: {
                        name: sender.name,
                        status: true,
                        jid: senderJid,
                        lid: senderLid,
                        date: timestamp
                    }
                })
            ])

            if (!senderSaved || !receiverSaved) {
                return M.reply('❌ Failed to save the relationship. Please try again.')
            }

            /* 5. NOTIFY SENDER ───────────────────────────────────────────── */
            try {
                await client.sendMessage(senderJid, {
                    text:
                        `💞 Your RF request has been accepted by *${receiver.name}*! ❤️\n` +
                        `Check your *${global.config.prefix}profile*!`
                })
            } catch {
                console.log('[RFACCEPT] Could not DM sender:', senderJid)
            }

            return M.reply(`🎉 Congratulations! You are now in a relationship with *${sender.name}*! 💖`)
        } catch (err) {
            console.error('[RFACCEPT ERROR]', err)
            return M.reply('❌ An error occurred while processing the relationship request.')
        }
    }
)
