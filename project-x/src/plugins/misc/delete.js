import { plugin } from '../../utils/plugin.js'

plugin(
    {
        name: 'delete',
        catagory: 'misc',
        description: {
            content: 'To delete a message',
            usage: '<quote_message>'
        }
    },
    async (_, M) => {
        if (!M.isQuoted) {
            return M.reply('❌ You have to quote a message to delete it.')
        }
        if (M.quotedMessage.participant !== M.botNumber && !M.isBotAdmin) {
            return M.reply('❌ You have make the bot admin to delete the message.')
        }

        await M.quotedMessage.delete()
    }
)
