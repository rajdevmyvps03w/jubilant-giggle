import { plugin } from '../../utils/plugin.js'
import { findUser, editUser, getState, deleteState } from '../../database/db.js'

plugin(
    {
        name: 'marry',
        aliases: ['m'],
        category: 'weeb',
        description: {
            content: 'Marry the currently rolled waifu or husbando in this group.'
        }
    },
    async (_, M) => {
        try {
            const char = await getState(`roll_${M.from}`)

            if (!char) {
                return M.reply('❌ No character available to marry. Use the random command first!')
            }

            const user = await findUser(M.sender.id)

            if (user.slug?.isMarried) {
                return M.reply(`❌ You are already married to *${user.slug.data.name}*.`)
            }

            const updates = {
                slug: {
                    isMarried: true,
                    data: {
                        id: char.id,
                        name: char.name,
                        image: char.display_picture,
                        origin: char.origin,
                        url: char.url,
                        type: char.husbando ? 'husbando' : 'waifu',
                        marriedAt: Date.now()
                    }
                }
            }

            const success = await editUser(M.sender.id, updates)

            if (!success) {
                return M.reply('❌ Failed to update your marriage status. Try again.')
            }

            await deleteState(`roll_${M.from}`)

            return M.reply(
                `💍 *Marriage Successful!*\n\n` +
                    `👤 Partner: *${char.name}*\n` +
                    `🌍 Origin: ${char.origin || 'Unknown'}\n` +
                    `💖 Type: ${char.husbando ? 'Husbando' : 'Waifu'}\n\n` +
                    `🎉 Congratulations! Use the profile command to see your partner.`
            )
        } catch (err) {
            console.error('[MARRY COMMAND ERROR]', err)
            return M.reply('❌ An error occurred during the marriage process.')
        }
    }
)
