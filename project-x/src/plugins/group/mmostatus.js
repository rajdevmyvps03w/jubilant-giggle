import { plugin } from '../../utils/plugin.js'
// Updated to your new database path
import { findGroup, editGroup } from '../../database/db.js'

plugin(
    {
        name: 'mmo',
        aliases: ['mmostatus', 'setmmo'],
        category: 'group',
        isGroup: true,
        isAdmin: true,
        description: {
            usage: '<on | off>',
            content: 'Enable or disable the mmo flag for your group.',
            example: 'on'
        }
    },
    async (_, M, { args }) => {
        try {
            const group = await findGroup(M.from)

            if (!args[0]) {
                return M.reply('⚙️ Please specify an option: *on* or *off*.')
            }

            const option = args[0].toLowerCase()
            if (option !== 'on' && option !== 'off') {
                return M.reply('❌ Invalid option. Use *on* to enable or *off* to disable.')
            }

            const newStatus = option === 'on'

            // 2. Check if the status is already what they requested
            if (group.mmo === newStatus) {
                return M.reply(`⚠️ The mmo flag is already *${newStatus ? 'enabled' : 'disabled'}*.`)
            }

            let bonusAmount = 0
            let updateData = { mmo: newStatus }

            if (newStatus && (group.funds === 0 || !group.mmo)) {
                bonusAmount = 10000
                updateData.funds = (group.funds || 0) + bonusAmount
            }

            const success = await editGroup(M.from, updateData)

            if (!success) {
                return M.reply('❌ Failed to update the database.')
            }

            await M.reply(
                `✅ The mmo flag has been *${newStatus ? 'enabled' : 'disabled'}* successfully in *${M.groupMetadata.subject}*.`
            )

            if (bonusAmount > 0) {
                return M.reply(
                    `💸 *Bonus:* This group received *₹${bonusAmount.toLocaleString()}* credits for enabling MMO mode!`
                )
            }
        } catch (err) {
            console.error('[MMO COMMAND ERROR]', err)
            return M.reply('❌ An error occurred while updating MMO status.')
        }
    }
)
