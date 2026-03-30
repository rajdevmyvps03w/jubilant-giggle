// src/plugins/group/setcooldown.js

import { plugin, plugins } from '../../utils/plugin.js'
import { setCommandCooldown } from '../../database/db.js'
import { parseTime } from '../../functions/helpler.js'
import { getFloorCooldown, HIGH_CD_COMMANDS, DEFAULT_CD_HIGH, DEFAULT_CD_LOW } from '../../functions/cooldowns.js'

plugin(
    {
        name: 'setcooldown',
        aliases: ['scd', 'setcd'],
        category: 'group',
        isGroup: true,
        isAdmin: true,
        description: {
            content: 'Set a custom command cooldown for this group. Cannot go below the default floor.',
            usage: '<command> [--time=10s/1m/1h/1d]',
            example: 'gamble --time=20s'
        }
    },
    async (_, M, { args, flags }) => {
        const p = global.config.prefix
        const cmdName = args[0]?.toLowerCase()

        if (!cmdName) {
            return M.reply(
                `❌ Please specify the command name you want to limit.\n\n` +
                    `Usage: *${p}setcooldown <command> --time=<duration>*\n` +
                    `Example: *${p}setcooldown gamble --time=20s*\n\n` +
                    `📌 *Default floors (minimum allowed):*\n` +
                    `• Gamble / Slot / Open Lootbox → *${DEFAULT_CD_HIGH / 1000}s*\n` +
                    `• All other commands → *${DEFAULT_CD_LOW / 1000}s*`
            )
        }

        // Resolve command
        const cmd = plugins.find((p) => p.name === cmdName || p.aliases?.includes(cmdName))

        if (!cmd) {
            return M.reply(`❌ *Command not found: "${cmdName}"*\n\n` + `Use *${p}help* to see all available commands.`)
        }

        const rawTime = flags.time ?? flags.t ?? null

        if (!rawTime) {
            const floor = getFloorCooldown(cmd.name)
            const isHigh = HIGH_CD_COMMANDS.has(cmd.name)
            return M.reply(
                `ℹ️ *Cooldown info for ${p}${cmd.name}*\n\n` +
                    `🔒 *Default floor:* ${floor / 1000}s ${isHigh ? '_(economy command)_' : ''}\n` +
                    `You cannot set a cooldown below this value.\n\n` +
                    `To set a custom cooldown:\n` +
                    `*${p}setcooldown ${cmd.name} --time=30s*`
            )
        }

        if (!/^\d+[smhd]$/.test(rawTime)) {
            return M.reply(`❌ Invalid duration format: *"${rawTime}"*\n\n` + `Valid formats: *10s*, *2m*, *1h*, *1d*`)
        }

        const ms = parseTime(rawTime)
        const floor = getFloorCooldown(cmd.name)
        const isHighCmd = HIGH_CD_COMMANDS.has(cmd.name)

        if (ms < floor) {
            return M.reply(
                `❌ *Cannot set cooldown below the default floor!*\n\n` +
                    `🎯 *Command:* ${p}${cmd.name}` +
                    (isHighCmd ? ` _(economy/spin command)_` : '') +
                    `\n` +
                    `⏱️ *You tried to set:* ${rawTime} (${ms / 1000}s)\n` +
                    `🔒 *Minimum allowed:* ${floor / 1000}s\n\n` +
                    `_The default floor exists to prevent spam. ` +
                    (isHighCmd
                        ? `Gamble, slot, and lootbox commands have a ${DEFAULT_CD_HIGH / 1000}s floor.`
                        : `All other commands have a ${DEFAULT_CD_LOW / 1000}s floor.`) +
                    `_\n\n` +
                    `Set a value of *${floor / 1000}s or higher*:\n` +
                    `*${p}setcooldown ${cmd.name} --time=${floor / 1000}s*`
            )
        }

        const success = await setCommandCooldown(M.from, cmd.name, ms)

        if (!success) {
            return M.reply('❌ Failed to update cooldown. Please try again.')
        }

        return M.reply(
            `✅ *COOLDOWN UPDATED*\n\n` +
                `🎯 *Command:* ${p}${cmd.name}\n` +
                `⏱️ *New cooldown:* ${rawTime} (${ms / 1000}s)\n` +
                `🔒 *Floor:* ${floor / 1000}s\n` +
                `🛡️ *Status:* Custom limit applied to this group.\n\n` +
                `_Use *${p}resetcooldown ${cmd.name}* to revert to the default._`
        )
    }
)
