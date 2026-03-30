import { plugin } from '../../utils/plugin.js'

plugin(
    {
        name: 'remove',
        aliases: ['kick', 'rm'],
        isGroup: true,
        isAdmin: true,
        isBotAdmin: true,
        category: 'group',
        description: {
            content: 'Remove mentioned or quoted users from the group.',
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
            return M.reply('⚠️ You can only remove up to *5 users* at once.')
        }

        let msg = '🗑️ *Removal Process Initiated...*\n'
        for (const jid of M.mentioned) {
            const num = jid.split('@')[0]
            if (!M.participants.find((p) => p.id === jid)) {
                msg += `\n⚠️ *@${num}* is not in the group.`
            } else if (M.groupAdmins.includes(jid)) {
                msg += `\n🚫 Cannot remove *@${num}* they are an admin.`
            } else {
                await client.groupParticipantsUpdate(M.from, [jid], 'remove')
                msg += `\n✅ Removed *@${num}* from the group.`
            }
        }

        await M.reply(msg, undefined, undefined, undefined, M.mentioned)
    }
)
