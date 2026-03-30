import { plugin } from '../../utils/plugin.js'
import { findUser, editUser } from '../../database/db.js'
import { PET_BACKGROUNDS, getAllPetBackgrounds } from '../../functions/pets.js'

plugin(
    {
        name: 'setpetbg',
        aliases: ['petbg', 'background'],
        category: 'pet',
        description: {
            content: 'View available backgrounds or set a custom one for your pet status card using index numbers.',
            usage: '<bg_index> <variant_index>',
            example: '1 2'
        }
    },
    async (_, M, { args }) => {
        try {
            // 1. Initial Validation
            // We fetch the user first to ensure they actually own a pet before allowing any changes.
            const user = await findUser(M.sender.id)
            if (!user?.pet || !user.pet.type) {
                return M.reply(
                    '❌ Action Denied: You do not currently own a pet. Please adopt one first to customize its profile.'
                )
            }

            const allBackgrounds = getAllPetBackgrounds() // Returns ['autumn', 'beach', 'forest', 'winter']

            // 2. Menu Display Logic
            // If the user provides fewer than two arguments, we display the catalog of indices.
            if (args.length < 2) {
                let listText = '🖼️ *PET CARD BACKGROUND CATALOG*\n\n'

                allBackgrounds.forEach((bgName, bgIdx) => {
                    listText += `*${bgIdx + 1}. ${bgName.toUpperCase()}*\n`

                    // Retrieve specific variants (light, dark, default) for each background category
                    const variants = Object.keys(PET_BACKGROUNDS[bgName])
                    variants.forEach((variantName, varIdx) => {
                        listText += `   #${varIdx + 1} ${variantName}\n`
                    })
                    listText += '\n'
                })

                listText += '\n'
                listText += `💡 *How to select:* Use ${global.config.prefix}setpetbg <category_no> <variant_no>\n`
                listText += `*Example:* ${global.config.prefix}setpetbg 1 2 for Autumn Dark.`

                return M.reply(listText)
            }

            // 3. Selection and Parsing Logic
            // We convert string arguments to zero-based indices for array/object access.
            const bgChoice = parseInt(args[0]) - 1
            const varChoice = parseInt(args[1]) - 1

            const selectedCategory = allBackgrounds[bgChoice]
            if (!selectedCategory) {
                return M.reply('❌ Invalid Category: The background index you provided does not exist in the catalog.')
            }

            const availableVariants = Object.keys(PET_BACKGROUNDS[selectedCategory])
            const selectedVariant = availableVariants[varChoice]
            if (!selectedVariant) {
                return M.reply(
                    `❌ Invalid Variant: The variant index for "${selectedCategory}" is incorrect. Please refer to the menu.`
                )
            }

            const updatedPet = user.pet
            if (!updatedPet.meta) updatedPet.meta = {}

            updatedPet.meta.bgName = selectedCategory
            updatedPet.meta.bgTheme = selectedVariant

            const isUpdated = await editUser(M.sender.id, { pet: updatedPet })

            if (!isUpdated) {
                return M.reply('❌ System Error: Could not save your background preference to the database.')
            }

            // 5. Final Confirmation
            return M.reply(
                `✅ *Background Configured!*\n\n` +
                    `Your pet profile card has been updated successfully.\n` +
                    `▫️ *Theme:* ${selectedCategory.toUpperCase()}\n` +
                    `▫️ *Variant:* ${selectedVariant}\n\n` +
                    `Use ${global.config.prefix}petstatus to see your new custom card!`
            )
        } catch (err) {
            console.error('[SET_PET_BG_ERROR]', err)
            return M.reply('❌ An unexpected error occurred while processing your background request.')
        }
    }
)
