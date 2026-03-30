import { plugin } from '../../utils/plugin.js'
// Updated to your new database path
import { findGroup, editGroup, getContact } from '../../database/db.js'

plugin(
    {
        name: 'unmute',
        category: 'group',
        description: {
            content: 'Unmute one or more muted users in the group.',
            usage: '<mention | reply>',
            example: '@user'
        },
        isGroup: true,
        isAdmin: true,
        isBotAdmin: true
    },
    async (_, M) => {
        try {
            // 1. Await the group data (Mongoose is async)
            const group = await findGroup(M.from)

            const targets = new Set()

            // 2. Identify targets
            if (M.mentioned?.length) {
                M.mentioned.forEach((u) => targets.add(u))
            }

            if (M.quotedMessage?.participant && M.sender.id !== M.quotedMessage.participant) {
                targets.add(M.quotedMessage.participant)
            }

            if (!targets.size) {
                return M.reply('❌ Mention or reply to users you want to unmute.')
            }

            // 3. Process the mute list removal
            const muted = new Set(group.mute || [])
            const removed = []
            const skipped = []

            for (const id of targets) {
                if (!muted.has(id)) {
                    skipped.push(await getContact(id))
                    continue
                }

                muted.delete(id)
                removed.push(await getContact(id))
            }

            // 4. Await the database update
            if (removed.length) {
                const success = await editGroup(M.from, { mute: [...muted] })
                if (!success) return M.reply('❌ Failed to update the database.')
            }

            // 5. Response logic
            let msg = ''

            if (removed.length) {
                msg += `🔊 *Unmuted Users*\n\n`
                msg += removed.map((u) => `• ${u}`).join('\n')
            }

            if (skipped.length) {
                if (msg) msg += '\n\n'
                msg += `⚠️ *Not Muted (Skipped)*\n\n`
                msg += skipped.map((u) => `• ${u}`).join('\n')
            }

            return M.reply(msg || 'Nothing changed.')
        } catch (err) {
            console.error('[UNMUTE ERROR]', err)
            return M.reply('❌ Failed to unmute users.')
        }
    }
)
