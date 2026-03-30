import { plugin } from '../../utils/plugin.js'
// Updated to your new MongoDB database path
import { editUser, findUser } from '../../database/db.js'

plugin(
    {
        name: 'editreg',
        aliases: ['update'],
        isPrivate: true,
        category: 'misc',
        description: {
            usage: '<field> <new_value>',
            content: 'Edit your registered information such as name or age.',
            example: 'name Debanjan'
        }
    },
    async (_, M, { args }) => {
        try {
            if (args.length < 2) {
                return M.reply(
                    `⚠️ Please use the correct format:\n` +
                        `*${global.config.prefix}editreg <field> <new_value>*\n\n` +
                        `Example:\n` +
                        `• ${global.config.prefix}editreg name Debanjan\n` +
                        `• ${global.config.prefix}editreg age 20`
                )
            }

            const field = args[0].toLowerCase()
            const value = args.slice(1).join(' ')

            if (!['name', 'age', 'gender'].includes(field)) {
                return M.reply(`❌ Invalid field. You can only edit *name*, *age*, or *gender*.`)
            }

            const updates = {}

            /* ---------- VALIDATION LOGIC ---------- */
            if (field === 'name') {
                if (value.length < 3 || value.length > 20 || /[^a-zA-Z\s]/.test(value)) {
                    return M.reply(`🤨 "${value}" doesn't look like a proper name (3-20 letters only).`)
                }
                updates.name = value
            }

            if (field === 'age') {
                const numAge = parseInt(value)
                if (isNaN(numAge) || numAge < 10 || numAge > 40) {
                    return M.reply(`😤 "${value}" is invalid. Age must be between 10 and 40.`)
                }
                updates.age = numAge
            }

            if (field === 'gender') {
                const normalizedGender = value.toLowerCase()
                if (!['male', 'female'].includes(normalizedGender)) {
                    return M.reply(`🤔 Gender "${value}"? Please choose from "male" or "female".`)
                }
                updates.gender = normalizedGender
            }

            /* ---------- APPLY CHANGES (ASYNC) ---------- */
            // Using await for the MongoDB update
            const success = await editUser(M.sender.id, updates)

            if (!success) {
                return M.reply(`❌ Could not update your information. Database error.`)
            }

            // Fetching updated user for the confirmation message
            const user = await findUser(M.sender.id)

            return M.reply(
                `✅ *Profile Updated Successfully!*\n\n` +
                    `👤 *Name:* ${user.name}\n` +
                    `🎂 *Age:* ${user.age}\n` +
                    `🚻 *Gender:* ${user.gender.toUpperCase()}`
            )
        } catch (err) {
            console.error('[EDITREG ERROR]', err)
            return M.reply('❌ An error occurred while updating your profile.')
        }
    }
)
