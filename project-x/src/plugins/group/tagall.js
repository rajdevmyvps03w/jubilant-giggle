import { plugin } from '../../utils/plugin.js'

plugin(
    {
        name: 'tagall',
        aliases: ['everyone', 'mentionall'],
        isGroup: true,
        isAdmin: true,
        category: 'group',
        description: {
            content: 'Tag everyone in the group with an optional message.',
            usage: '<message | quote message>',
            example: 'Good morning everyone!'
        }
    },
    async (_, M, { text }) => {
        let message = text?.trim() || ''
        if (M.isQuoted) {
            message = M.quotedMessage.text || message
        }

        const groupMembers = M.participants.map((p) => p.id)
        const info = `🏷️ *Group:* ${M.groupName}\n👑 *Admins:* ${M.groupAdmins.length}\n👥 *Participants:* ${groupMembers.length}\n\n`
        const mainText = message ? `💬 *Message:* ${message}\n\n` : ''
        const finalText = `${info}${mainText}📢 *Tagged by:* @${M.sender.id.split('@')[0]}`

        await M.reply(finalText, undefined, undefined, undefined, groupMembers)
    }
)
