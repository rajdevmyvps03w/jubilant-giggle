import { plugin } from '../../utils/plugin.js'
import { findUser, editUser } from '../../database/db.js'

const MS_PER_DAY = 24 * 60 * 60 * 1000
const MS_PER_MONTH = 30 * MS_PER_DAY

plugin(
    {
        name: 'unsetpfp',
        aliases: ['removepfp', 'clearpfp', 'delpfp'],
        category: 'misc',
        description: {
            content: 'Remove your active custom profile picture. No refunds will be issued.'
        }
    },
    async (_, M) => {
        const prefix = global.config.prefix

        try {
            const user = await findUser(M.sender.id)

            const pfp = user.customPfp
            if (!pfp?.url) {
                return M.reply(
                    `ℹ️ *You don't have a custom PFP set.*\n\n` +
                        `Use *${prefix}setpfp* (replying to media) to create one.`
                )
            }

            // Already expired — just clean up
            if (pfp.expiresAt && Date.now() > pfp.expiresAt) {
                await editUser(M.sender.id, { customPfp: null })
                return M.reply(`ℹ️ *Your custom PFP had already expired.* It has been cleaned up.`)
            }

            const daysLeft = Math.ceil((pfp.expiresAt - Date.now()) / MS_PER_DAY)

            await editUser(M.sender.id, { customPfp: null })

            return M.reply(
                `🗑️ *Custom PFP Removed*\n\n` +
                    `Your custom profile picture has been deleted.\n\n` +
                    `⏳ *Had ${daysLeft} day${daysLeft !== 1 ? 's' : ''} remaining*\n\n` +
                    `⚠️ _No refund is issued for early removal._\n\n` +
                    `Use *${prefix}setpfp* to set a new one anytime.`
            )
        } catch (err) {
            console.error('[UNSETPFP ERROR]', err)
            return M.reply('❌ An error occurred. Please try again.')
        }
    }
)
