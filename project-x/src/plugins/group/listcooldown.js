// src/plugins/group/listcooldown.js

import { plugin } from '../../utils/plugin.js'
import { Group } from '../../database/models/index.js'
import { HIGH_CD_COMMANDS, DEFAULT_CD_HIGH, DEFAULT_CD_LOW } from '../../functions/cooldowns.js'

plugin(
    {
        name: 'listcooldown',
        aliases: ['lcd', 'cds', 'cooldowns'],
        category: 'group',
        isGroup: true,
        description: {
            content: 'View all active custom command cooldowns and the default floors.',
            example: 'listcooldown'
        }
    },
    async (_, M) => {
        try {
            const group = await Group.findOne({ id: M.from }).select('cooldowns').lean()
            let customCDs = group?.cooldowns?.commands || {}
            if (customCDs instanceof Map) {
                customCDs = Object.fromEntries(customCDs)
            }
            const keys = Object.keys(customCDs).filter((k) => customCDs[k] > 0)

            let msg =
                `🏆 *GROUP COOLDOWN REGISTRY*\n\n` +
                `🔒 *Floors (always enforced, cannot go below):*\n` +
                `• Gamble / Slot / Open Lootbox → *${DEFAULT_CD_HIGH / 1000}s*\n` +
                `• All other commands → *${DEFAULT_CD_LOW / 1000}s*\n\n`

            if (keys.length === 0) {
                msg += `✨ _No custom cooldowns set — all commands use the floors above._`
            } else {
                msg += `⚙️ *Custom cooldowns (this group):*\n`
                keys.forEach((cmd, i) => {
                    const ms = customCDs[cmd]
                    const floor = HIGH_CD_COMMANDS.has(cmd) ? DEFAULT_CD_HIGH : DEFAULT_CD_LOW
                    msg += `*${i + 1}.* \`${cmd}\` → *${ms / 1000}s* _(floor: ${floor / 1000}s)_\n`
                })
                msg += `\n💡 _Custom timers override the floor but can never go below it._`
            }

            return M.reply(msg.trim())
        } catch (err) {
            console.error('[LISTCD ERROR]', err)
            return M.reply('❌ Error fetching cooldown registry.')
        }
    }
)
