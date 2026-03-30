import { plugin } from '../../utils/plugin.js'
// Importing from your new database path
import { findGroup, editGroup, getContact } from '../../database/db.js'

plugin(
    {
        name: 'mute',
        category: 'group',
        description: {
            content: 'Mute one or more users in the group.',
            usage: '<mention | reply>',
            example: '@user'
        },
        isGroup: true,
        isAdmin: true,
        isBotAdmin: true
    },
    async (_, M) => {
        try {
            // 1. Await the group data from MongoDB
            const group = await findGroup(M.from)

            const targets = new Set()

            // 2. Identify targets from mentions or replies
            if (M.mentioned?.length) {
                M.mentioned.forEach((u) => targets.add(u))
            }

            if (M.quotedMessage?.participant && M.sender.id !== M.quotedMessage.participant) {
                targets.add(M.quotedMessage.participant)
            }

            if (!targets.size) {
                return M.reply('❌ Mention or reply to users you want to mute.')
            }

            // 3. Process the mute list
            const muted = new Set(group.mute || [])
            const newlyMuted = []
            const skipped = []

            for (const id of targets) {
                if (muted.has(id)) {
                    skipped.push(await getContact(id))
                    continue
                }

                muted.add(id)
                newlyMuted.push(await getContact(id))
            }

            // 4. Update MongoDB only if changes occurred
            if (newlyMuted.length) {
                const success = await editGroup(group.id, { mute: [...muted] })
                if (!success) {
                    return M.reply('❌ Failed to update the mute list in the database.')
                }
            }

            // 5. Build the response message
            let msg = ''

            if (newlyMuted.length) {
                msg += `🔇 *Muted Users*\n\n`
                msg += newlyMuted.map((u) => `• ${u}`).join('\n')
            }

            if (skipped.length) {
                if (msg) msg += '\n\n'
                msg += `⚠️ *Already Muted (Skipped)*\n\n`
                msg += skipped.map((u) => `• ${u}`).join('\n')
            }

            return M.reply(msg || 'Nothing changed.')
        } catch (err) {
            console.error('[MUTE ERROR]', err)
            return M.reply('❌ Failed to process the mute command.')
        }
    }
)
