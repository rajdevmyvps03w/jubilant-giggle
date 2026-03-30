import { plugin } from '../../utils/plugin.js'
import { findUser, getRfEnabledUsers } from '../../database/db.js'

plugin(
    {
        name: 'rflist',
        aliases: ['relationlist', 'rfusers'],
        category: 'misc',
        isGroup: true,
        description: {
            content: 'Show RF-enabled users of the opposite gender who are looking for a relationship.'
        }
    },
    async (_, M) => {
        try {
            const sender = await findUser(M.sender.id)

            if (!sender) {
                return M.reply('❌ You are not registered. Please register first.')
            }

            // If gender is unknown we can't determine opposite gender
            if (!sender.gender || sender.gender === 'unknown') {
                return M.reply(
                    `⚠️ Your gender is not set.\n` +
                        `Please update it using *${global.config.prefix}editreg* before using RF.`
                )
            }

            const oppositeGender = sender.gender.toLowerCase() === 'male' ? 'female' : 'male'

            const filteredUsers = await getRfEnabledUsers({
                gender: oppositeGender,
                excludeId: M.sender.id
            })

            // Filter out users already in a relationship
            const available = filteredUsers.filter((u) => !u.relationship?.status)

            if (!available || available.length === 0) {
                return M.reply(`⚠️ No *${oppositeGender}* users currently have their RF status enabled.`)
            }

            const list = available
                .map((u, i) => {
                    const ageText = u.age ? ` | Age: ${u.age}` : ''
                    return `${i + 1}. *${u.name || 'Anonymous'}*${ageText}\n   🔑 Code: \`${u.rfcode || 'N/A'}\``
                })
                .join('\n\n')

            return M.reply(
                `📋 *RF AVAILABLE: ${oppositeGender.toUpperCase()}* 📋\n` +
                    `_Total found: ${available.length}_\n\n` +
                    `${list}\n\n` +
                    `💡 Use *${global.config.prefix}rfrequest <code>* to send a request.\n` +
                    `_There is a 3-week cooldown if rejected._`
            )
        } catch (err) {
            console.error('[RFLIST ERROR]', err)
            return M.reply('❌ An error occurred while fetching the RF list.')
        }
    }
)
