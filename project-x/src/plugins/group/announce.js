import { plugin } from '../../utils/plugin.js'

plugin(
    {
        name: 'announce',
        aliases: ['gc'],
        isGroup: true,
        isAdmin: true,
        isBotAdmin: true,
        category: 'group',
        description: {
            content: 'Open or close the group for messages.',
            usage: '<open | close>',
            example: 'open'
        }
    },
    async (client, M, { args }) => {
        const mode = args[0]?.toLowerCase()

        if (!mode || !['open', 'close'].includes(mode)) {
            return M.reply(
                `📢 Please specify a valid mode: *open* or *close*.\n\nExample: ${global.config.prefix}announce open`
            )
        }

        if (mode === 'open') {
            if (!M.groupMetadata.announce) {
                return M.reply('✅ The group is already *open* for all members to chat.')
            }
            await client.groupSettingUpdate(M.from, 'not_announcement')
            return M.reply('🔓 The group has been *opened*. Members can now send messages.')
        }

        if (mode === 'close') {
            if (M.groupMetadata.announce) {
                return M.reply('✅ The group is already *closed* for members.')
            }
            await client.groupSettingUpdate(M.from, 'announcement')
            return M.reply('🔒 The group has been *closed*. Only admins can send messages now.')
        }
    }
)
