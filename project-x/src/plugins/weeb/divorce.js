import { plugin } from '../../utils/plugin.js'
// Importing from your new database file
import { findUser, editUser } from '../../database/db.js'

plugin(
    {
        name: 'divorce',
        aliases: ['dv'],
        category: 'weeb',
        description: {
            content: 'Divorce your current waifu or husbando.'
        }
    },
    async (_, M) => {
        try {
            const user = await findUser(M.sender.id)
            if (!user?.slug || !user.slug.isMarried || !user.slug.data?.name) {
                return M.reply('❌ You are not married to anyone.')
            }

            const partnerName = user.slug.data.name
            const newSlug = {
                isMarried: false,
                data: {}
            }

            const success = await editUser(M.sender.id, { slug: newSlug })

            if (!success) {
                return M.reply('❌ Failed to process the divorce in the database. Please try again.')
            }

            return M.reply(
                `💔 *Divorce Successful*\n\n` +
                    `You are now separated from *${partnerName}*.\n` +
                    `The paperwork is done. You are officially single again.`
            )
        } catch (err) {
            console.error('[DIVORCE COMMAND ERROR]', err)
            return M.reply('❌ An error occurred while processing your divorce.')
        }
    }
)
