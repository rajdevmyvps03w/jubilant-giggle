import { plugin } from '../../utils/plugin.js'
import { getRandomInt } from '../../functions/helpler.js'

plugin(
    {
        name: 'pick',
        category: 'fun',
        isGroup: true,
        description: {
            usage: '<text>',
            content: 'Randomly pick a user from the group.',
            example: 'who is gay'
        }
    },
    async (_, M, { text }) => {
        try {
            const participants = M.participants?.map((p) => p.id).filter(Boolean)

            if (!participants || participants.length === 0) {
                return M.reply('❌ Failed to get group members.')
            }

            const randomIndex = getRandomInt(0, participants.length - 1)
            const picked = participants[randomIndex]

            const caption = `😛 ${text ? `*${text}:*` : '*Random Pick:*'} ` + `@${picked.split('@')[0]}`

            return M.replyRaw({
                text: caption,
                mentions: [picked]
            })
        } catch (err) {
            console.error('[PICK COMMAND ERROR]', err)
            return M.reply('❌ Failed to pick a random user.')
        }
    }
)
