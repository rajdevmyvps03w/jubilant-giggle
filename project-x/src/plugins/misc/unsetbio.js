import { plugin } from '../../utils/plugin.js'
import { findUser, editUser } from '../../database/db.js'

const MS_PER_DAY = 24 * 60 * 60 * 1000
const MS_PER_MONTH = 30 * MS_PER_DAY

plugin(
    {
        name: 'unsetbio',
        aliases: ['removebio', 'clearbio', 'delbio'],
        category: 'misc',
        description: {
            content: 'Remove your active profile bio. No refunds will be issued.'
        }
    },
    async (_, M) => {
        const prefix = global.config.prefix

        try {
            const user = await findUser(M.sender.id)

            const bio = user.customBio
            if (!bio?.text) {
                return M.reply(`ℹ️ *You don't have a custom bio set.*\n\nUse *${prefix}setbio* to create one.`)
            }

            // Check if already expired
            const isExpired = bio.expiresAt && Date.now() > bio.expiresAt
            if (isExpired) {
                // Just clean it up silently
                await editUser(M.sender.id, { customBio: null })
                return M.reply(`ℹ️ *Your bio had already expired.* It has been cleaned up.`)
            }

            const daysLeft = Math.ceil((bio.expiresAt - Date.now()) / MS_PER_DAY)

            // ── Clear bio ────────────────────────────────────────────────────
            await editUser(M.sender.id, { customBio: null })

            return M.reply(
                `🗑️ *Bio Removed*\n\n` +
                    `Your custom bio has been deleted.\n\n` +
                    `📝 *Was:* ${bio.text}\n` +
                    `⏳ *Had ${daysLeft} day(s) remaining*\n\n` +
                    `⚠️ _No refund is issued for early removal._\n\n` +
                    `Use *${prefix}setbio* to set a new bio anytime.`
            )
        } catch (err) {
            console.error('[UNSETBIO ERROR]', err)
            return M.reply('❌ An error occurred. Please try again.')
        }
    }
)
