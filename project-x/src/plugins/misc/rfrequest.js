import { plugin } from '../../utils/plugin.js'
import { findUser, editUser, getUserByRfCode } from '../../database/db.js'

plugin(
    {
        name: 'rfrequest',
        aliases: ['sendrf', 'relationrequest'],
        category: 'misc',
        isGroup: true,
        description: {
            usage: '<code>',
            content: 'Send an RF request to a user using their unique RF code.',
            example: 'y3mpwdqea3en'
        }
    },
    async (client, M, { args }) => {
        try {
            /* 1. SENDER VALIDATION ──────────────────────────────────────── */
            const sender = await findUser(M.sender.id)

            if (!sender.rf) {
                return M.reply('⚠️ Your RF flag is *disabled*. Enable it to send requests.')
            }

            if (sender.relationship?.status) {
                return M.reply('💔 You are already in a relationship.')
            }

            // BUG 5 FIX: make sure sender has an rfcode before proceeding
            if (!sender.rfcode) {
                return M.reply(
                    `⚠️ You don't have an RF code yet.\n` +
                        `Toggle RF off and on again with *${global.config.prefix}rf off* then *${global.config.prefix}rf on* to generate one.`
                )
            }

            const code = args[0]?.trim()
            if (!code) {
                return M.reply('⚙️ Please provide a valid RF code to send a request.')
            }

            /* 2. TARGET VALIDATION ──────────────────────────────────────── */
            const targetUser = await getUserByRfCode(code)

            if (!targetUser) {
                return M.reply('❌ No user found with that RF code.')
            }

            if (!targetUser.rf) {
                return M.reply('⚠️ This user has disabled their RF requests.')
            }

            if (targetUser.relationship?.status) {
                return M.reply('💔 This user is already in a relationship.')
            }

            // Can't request yourself
            const targetId = targetUser.jid || targetUser.lid
            if (targetId === M.sender.id || targetUser.lid === M.sender.id) {
                return M.reply('⚠️ You cannot send a request to yourself.')
            }

            /* 3. COOLDOWN CHECK ─────────────────────────────────────────── */
            const rflist = targetUser.rflist || []
            const existingRequest = rflist.find(
                (r) => r.jid === M.sender.id || r.jid === sender.jid || r.jid === sender.lid
            )

            if (existingRequest) {
                const diffTime = Date.now() - new Date(existingRequest.date).getTime()
                const diffWeeks = diffTime / (1000 * 60 * 60 * 24 * 7)

                if (diffWeeks < 3) {
                    const remainingDays = Math.ceil(21 - diffTime / (1000 * 60 * 60 * 24))
                    return M.reply(
                        `⚠️ Cooldown Active! You already requested *${targetUser.name}*.\n` +
                            `Wait *${remainingDays}* more day${remainingDays > 1 ? 's' : ''}.`
                    )
                }
            }

            /* 4. BUILD & SAVE REQUEST ───────────────────────────────────── */
            const newRequest = {
                name: sender.name,
                jid: M.sender.id,
                age: sender.age,
                gender: sender.gender,
                rfcode: sender.rfcode,
                date: new Date().toISOString()
            }

            const updatedList = rflist.filter(
                (r) => r.jid !== M.sender.id && r.jid !== sender.jid && r.jid !== sender.lid
            )
            updatedList.push(newRequest)

            // BUG 3 FIX: use the actual stored jid from the DB document, not targetUser.jid
            // which could be undefined if user was found by lid
            const success = await editUser(targetUser.jid || targetUser.lid, { rflist: updatedList })

            if (!success) {
                return M.reply('❌ System error: Failed to deliver the request.')
            }

            /* 5. NOTIFICATION ───────────────────────────────────────────── */
            const notifyText =
                `💌 *New RF Request Received!*\n\n` +
                `📛 *From:* ${sender.name}\n` +
                `🎂 *Age:* ${sender.age || 'N/A'}\n` +
                `🚻 *Gender:* ${(sender.gender || 'N/A').toUpperCase()}\n\n` +
                `Use *${global.config.prefix}rfaccept ${sender.rfcode}* to accept\n` +
                `or *${global.config.prefix}rfreject ${sender.rfcode}* to reject.`

            try {
                await client.sendMessage(targetUser.jid || targetUser.lid, { text: notifyText })
            } catch (e) {
                console.log(`[RF NOTIFY ERROR] Could not reach ${targetUser.jid || targetUser.lid}`)
            }

            return M.reply(`✅ RF request successfully sent to *${targetUser.name}*!`)
        } catch (err) {
            console.error('[RFREQUEST ERROR]', err)
            return M.reply('❌ An error occurred while sending your request.')
        }
    }
)
