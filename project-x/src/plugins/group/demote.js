import { plugin } from '../../utils/plugin.js'

plugin(
    {
        name: 'demote',
        aliases: ['demo'],
        isGroup: true,
        isAdmin: true,
        isBotAdmin: true,
        category: 'group',
        description: {
            content: 'Demote mentioned users from admin role.',
            usage: '<mention user | quote user>',
            example: '@917003213983'
        }
    },
    async (client, M) => {
        // This reads: "If there are no mentions AND there is no quoted message..."
        if (!M.mentioned.length && !M.isQuoted) {
            return M.reply(
                `❌ Please mention or reply to at least one *user* to demote.\n\nExample: ${global.config.prefix}demote @ryaendas`
            )
        }

        if (M.isQuoted && M.sender.id !== M.quotedMessage.participant && M.sender.jid !== M.quotedMessage.participant) {
            M.mentioned.push(M.quotedMessage?.participant)
        }
        if (M.mentioned.length > 5) {
            return M.reply('⚠️ You can only demote up to *5 users* at once.')
        }

        let msg = '⏬ *Demotion Process Initiated...*\n'
        for (const id of M.mentioned) {
            const num = id.split('@')[0]
            if (!M.groupAdmins.includes(id)) {
                msg += `\n⚠️ *@${num}* is not an admin already.`
            } else {
                await client.groupParticipantsUpdate(M.from, [id], 'demote')
                msg += `\n✅ Successfully demoted *@${num}*.`
            }
        }

        await M.reply(msg, undefined, undefined, undefined, M.mentioned)
    }
)
