import { plugin } from '../../utils/plugin.js'
import { getAllWarnedUsers } from '../../database/db.js'

plugin(
    {
        name: 'warnlist',
        aliases: ['allwarns'],
        category: 'group',
        isGroup: true,
        description: {
            content: 'View a list of all group members with active warnings.'
        }
    },
    async (_, M) => {
        const warnedUsers = await getAllWarnedUsers(M.from)

        if (warnedUsers.length === 0) {
            return M.reply('✨ This group is currently clear! No members have active warnings.')
        }

        let text = `📝 *GROUP WARNING REGISTRY*\n\n`

        warnedUsers.forEach((u, index) => {
            const groupData = u.warnings.find((w) => w.groupId === M.from)
            const types = groupData.types.map((t) => t.typeId).join(', ')
            text += `${index + 1}. *${u.name || 'User'}*\n   └ 📊 Level: ${groupData.level}/6 | Types: [${types}]\n`
        })

        text += `\n_Use ${global.config.prefix}warnsonme to check your specific details._`
        return M.reply(text)
    }
)
