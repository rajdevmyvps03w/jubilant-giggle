import { plugin } from '../../utils/plugin.js'

plugin(
    {
        name: 'setname',
        aliases: ['gname', 'changename'],
        isGroup: true,
        isAdmin: true,
        isBotAdmin: true,
        category: 'group',
        description: {
            content: 'Change the group name.',
            usage: '<new name>',
            example: 'Tech Innovators'
        }
    },
    async (client, M, { text }) => {
        let response = text.trim()
        if (M.isQuoted) {
            response = M.quotedMessage.text
        }

        if (!response) {
            return M.reply(
                `✏️ Please provide a new *group name*.\n\nExample: ${global.config.prefix}setname Tech Enthusiasts`
            )
        }

        if (response.length > 100) {
            return M.reply('⚠️ The name is too long! Please keep it under *100 characters.*')
        }

        await client.groupUpdateSubject(M.from, response)
        await M.reply('✅ Group name has been successfully *updated!*')
    }
)
