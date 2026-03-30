import { plugin } from '../../utils/plugin.js'
import { findUser, editUser } from '../../database/db.js'

plugin(
    {
        name: 'release',
        aliases: ['releasepet', 'abandon'],
        category: 'pet',
        description: {
            content: 'Set your pet free or clear a deceased pet from your profile.'
        }
    },
    async (_, M) => {
        try {
            const user = await findUser(M.sender.id)

            // Check if the user even has a pet in the schema
            if (!user?.pet || !user.pet.type) {
                return M.reply("❌ You don't have a pet to release.")
            }

            const petName = user.pet.name || user.pet.type
            const isDead = !user.pet.isAlive

            // Database Update: Set the pet field back to null as per your schema
            const success = await editUser(M.sender.id, { pet: null })

            if (!success) {
                return M.reply('❌ Database Error: Failed to release the pet.')
            }

            if (isDead) {
                return M.reply(
                    `🕊️ You have said your final goodbyes to the spirit of *${petName}*. You can now adopt a new companion.`
                )
            }

            return M.reply(`👋 You watched *${petName}* run off into the wild. You are now free to adopt a new pet!`)
        } catch (err) {
            console.error('[RELEASE COMMAND ERROR]', err)
            return M.reply('❌ An error occurred while trying to release the pet.')
        }
    }
)
