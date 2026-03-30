import { plugin } from '../../utils/plugin.js'
// Updated to your new database path
import { findGroup, editGroup, isGroupFeatureActive } from '../../database/db.js'

plugin(
    {
        name: 'settax',
        aliases: ['tax'],
        isGroup: true,
        isAdmin: true,
        category: 'group',
        description: {
            content:
                'Set or disable tax percentage for home members or foreign members. ' +
                'Setting the tax value to 0 will completely disable tax for that category.',
            usage: '<home | foreign> <percentage>',
            example: 'settax home 5'
        }
    },
    async (_, M, { text }) => {
        try {
            if (!text) {
                return M.reply(
                    `❌ You must specify the tax type and percentage.\n\n` +
                        `Example:\n` +
                        `• ${global.config.prefix}settax home 5\n` +
                        `• ${global.config.prefix}settax foreign 10`
                )
            }

            const [type, value] = text.trim().split(/\s+/)
            const percent = Math.floor(Number(value))

            /* ------------------ BASIC VALIDATION ------------------ */
            if (!['home', 'foreign'].includes(type)) {
                return M.reply(`❌ Invalid tax type. Use *home* or *foreign*.`)
            }

            if (isNaN(percent) || percent < 0 || percent > 50) {
                return M.reply(`❌ Invalid tax percentage. Must be a whole number between 0 and 50.`)
            }

            // 1. Await group data
            const group = await findGroup(M.from)

            /* ------------------ MMO CHECK ------------------ */
            if (!group.mmo) {
                return M.reply(
                    `❌ MMO mode is currently disabled in this group.\nEnable it using *${global.config.prefix}mmo on*.`
                )
            }

            /* ------------------ FEATURE CHECK ------------------ */
            // 2. Await feature status checks (Triggers the auto-cleanup logic)
            if (type === 'home') {
                const isHomeTaxActive = await isGroupFeatureActive(M.from, 'basic_tax')
                if (!isHomeTaxActive) {
                    return M.reply(`❌ The *Basic Tax* feature is not active in this group.`)
                }
            }

            if (type === 'foreign') {
                const isForeignTaxActive = await isGroupFeatureActive(M.from, 'foreign_tax')
                if (!isForeignTaxActive) {
                    return M.reply(`❌ The *Foreign Tax* feature is not active in this group.`)
                }
            }

            // 3. Prepare Update Data
            // We ensure we don't lose the existing tax values for the other type
            const currentTax = group.tax || { home: 0, foreign: 0 }
            const updatedTax = {
                ...currentTax,
                [type]: percent
            }

            // 4. Await database update
            const success = await editGroup(M.from, { tax: updatedTax })

            if (!success) {
                return M.reply('❌ Failed to update the tax settings in the database.')
            }

            if (percent === 0) {
                return M.reply(
                    `🚫 *${type.toUpperCase()} TAX DISABLED*\n\n` +
                        `Tax for ${type} users has been completely turned off.`
                )
            }

            return M.reply(
                `💰 *${type.toUpperCase()} TAX UPDATED*\n\n` +
                    `The tax rate for ${type} users is now set to *${percent}%*.\n` +
                    `This will be applied to purchases made in this group.`
            )
        } catch (err) {
            console.error('[SET TAX ERROR]', err)
            return M.reply('❌ An error occurred while updating tax settings.')
        }
    }
)
