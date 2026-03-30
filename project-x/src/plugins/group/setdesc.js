import { plugin } from '../../utils/plugin.js'

plugin(
    {
        name: 'setdesc',
        aliases: ['gdesc', 'changedesc'],
        isGroup: true,
        isAdmin: true,
        isBotAdmin: true,
        category: 'group',
        description: {
            content: 'Change the group description.',
            usage: '<new description>',
            example: 'Welcome to our new tech group!'
        }
    },
    async (client, M, { text }) => {
        let description = text.trim()
        if (M.isQuoted) {
            description = M.quotedMessage.text
        }

        if (!description) {
            return M.reply(
                `✏️ Please provide a new *group description*.\n\nExample: ${global.config.prefix}setdesc Welcome to the family!`
            )
        }

        if (description.length > 700) {
            return M.reply('⚠️ The description is too long! Please keep it under *700 characters.*')
        }

        await client.groupUpdateDescription(M.from, description)
        await M.reply('✅ Group description has been successfully *updated!*')
    }
)
