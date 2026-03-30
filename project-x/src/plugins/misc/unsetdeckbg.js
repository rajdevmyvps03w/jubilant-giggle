import { plugin } from '../../utils/plugin.js'
import { findUser, editUser } from '../../database/db.js'

const MS_PER_DAY = 24 * 60 * 60 * 1000

plugin(
    {
        name: 'unsetdeckbg',
        aliases: ['removedeckbg', 'cleardeckbg', 'deldeckbg'],
        category: 'misc',
        description: {
            content: 'Remove your active custom deck background. No refunds will be issued.'
        }
    },
    async (_, M) => {
        const prefix = global.config.prefix

        try {
            const user = await findUser(M.sender.id)

            const deckBg = user.customDeck
            if (!deckBg?.url) {
                return M.reply(
                    `ℹ️ *You don't have a custom deck background set.*\n\n` +
                        `Use *${prefix}setdeckbg* (replying to an image) to create one.`
                )
            }

            // Already expired — just clean up
            if (deckBg.expiresAt && Date.now() > deckBg.expiresAt) {
                await editUser(M.sender.id, { customDeck: null })
                return M.reply(`ℹ️ *Your custom deck background had already expired.* It has been cleaned up.`)
            }

            const daysLeft = Math.ceil((deckBg.expiresAt - Date.now()) / MS_PER_DAY)

            await editUser(M.sender.id, { customDeck: null })

            return M.reply(
                `🗑️ *Custom Deck Background Removed*\n\n` +
                    `Your custom deck background has been deleted.\n\n` +
                    `⏳ *Had ${daysLeft} day${daysLeft !== 1 ? 's' : ''} remaining*\n\n` +
                    `⚠️ _No refund is issued for early removal._\n\n` +
                    `Use *${prefix}setdeckbg* to set a new one anytime.`
            )
        } catch (err) {
            console.error('[UNSETDECKBG ERROR]', err)
            return M.reply('❌ An error occurred. Please try again.')
        }
    }
)
