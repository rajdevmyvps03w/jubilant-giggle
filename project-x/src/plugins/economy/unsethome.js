import { plugin } from '../../utils/plugin.js'
import { findUser } from '../../database/db.js'
import { User, Group } from '../../database/models/index.js'

plugin(
    {
        name: 'unsethome',
        aliases: ['removehome', 'leavehome', 'uh'],
        category: 'economy',
        description: {
            content:
                'Remove your current home group. You will be treated as a foreign user everywhere until you set a new home.'
        }
    },
    async (_, M) => {
        try {
            const user = await findUser(M.sender.id, 'name jid lid bank')

            if (!user) {
                return M.reply('❌ You are not registered in the bot.')
            }

            // No home set
            if (!user.bank?.id) {
                return M.reply(
                    `🏠 *No Home Set*\n\n` +
                        `You don't have a home group set.\n` +
                        `Use *${global.config.prefix}sethome* inside a group to set one.`
                )
            }

            const oldHomeId = user.bank.id

            // Clear bank.id on user
            await User.updateOne({ $or: [{ jid: user.jid }, { lid: user.lid }] }, { $set: { 'bank.id': null } })

            // Remove user from the old group's users array
            await Group.updateOne({ id: oldHomeId }, { $pull: { users: user.jid } })

            return M.reply(
                `🏚️ *HOME REMOVED*\n\n` +
                    `✅ *${user.name}*, your home group has been cleared.\n\n` +
                    `⚠️ *Note:* You will now be treated as a *foreign user* in every group.\n` +
                    `Foreign tax will apply wherever it is enabled.\n\n` +
                    `_Use *${global.config.prefix}sethome* inside any group to set a new home._`
            )
        } catch (err) {
            console.error('[UNSETHOME ERROR]', err)
            return M.reply('❌ An error occurred while removing your home. Please try again.')
        }
    }
)
