import { plugin, plugins } from '../../utils/plugin.js'
import { addCommandBan, getContact } from '../../database/db.js'

// ─── helpers ─────────────────────────────────────────────────────────────────

/**
 * Build a map of { category -> [cmdName, ...] } from the live plugin list.
 * This is the single source of truth — no hardcoded lists.
 */
const getCategoryMap = () => {
    const map = {}
    for (const p of plugins) {
        const cat = p.category?.toLowerCase()
        if (!cat) continue
        if (!map[cat]) map[cat] = []
        map[cat].push(p.name)
    }
    return map
}

// ─── plugin ──────────────────────────────────────────────────────────────────

plugin(
    {
        name: 'cmdban',
        aliases: ['banfrom', 'bcmd'],
        category: 'group',
        isGroup: true,
        isAdmin: true,
        description: {
            content:
                'Ban a user from using specific commands or entire categories in this group.\n' +
                'You can combine --cmd and --category in one call.\n' +
                'When a category is banned, every command in that category is also blocked.',
            usage: '<@user | reply> [--cmd=name1,name2] [--category=cat1,cat2] [--reason=text]',
            example: '@user --cmd=gamble,slot --reason=abusing economy\n' + '@user --category=economy --reason=cheating'
        }
    },
    async (_, M, { flags }) => {
        // ── 1. Resolve target ────────────────────────────────────────────────
        const target =
            (M.mentioned?.[0] ?? (M.isQuoted ? M.quotedMessage?.participant : null)) &&
            !(M.isQuoted && M.sender.id !== M.quotedMessage.participant && M.sender.jid !== M.quotedMessage.participant)
                ? (M.mentioned?.[0] ?? M.quotedMessage?.participant)
                : null
        if (!target) {
            return M.reply('❌ Please mention or reply to the user you want to ban from commands.')
        }

        if (target === M.sender.id) {
            return M.reply("❌ You can't ban yourself.")
        }

        // ── 2. Parse flags ───────────────────────────────────────────────────
        const rawCmds =
            'cmd' in flags
                ? flags.cmd
                      .split(',')
                      .map((s) => s.trim().toLowerCase())
                      .filter(Boolean)
                : []
        const rawCats =
            'category' in flags
                ? flags.category
                      .split(',')
                      .map((s) => s.trim().toLowerCase())
                      .filter(Boolean)
                : []
        const reason = 'reason' in flags ? flags.reason : 'No reason specified'

        if (rawCmds.length === 0 && rawCats.length === 0) {
            return M.reply(
                `❌ You must specify at least one command or category.\n\n` +
                    `*Usage:*\n` +
                    `  ${global.config.prefix}cmdban @user --cmd=gamble\n` +
                    `  ${global.config.prefix}cmdban @user --category=economy\n` +
                    `  ${global.config.prefix}cmdban @user --cmd=slot --category=game --reason=abusing`
            )
        }

        // ── 3. Validate and resolve ──────────────────────────────────────────
        const catMap = getCategoryMap()
        const allCategories = Object.keys(catMap)

        // Validate categories
        const invalidCats = rawCats.filter((c) => !allCategories.includes(c))
        if (invalidCats.length > 0) {
            return M.reply(
                `❌ Unknown categories: *${invalidCats.join(', ')}*\n\n` + `Available: ${allCategories.join(', ')}`
            )
        }

        // Validate individual commands
        const invalidCmds = rawCmds.filter((c) => !plugins.some((p) => p.name === c || p.aliases?.includes(c)))
        if (invalidCmds.length > 0) {
            return M.reply(
                `❌ Unknown commands: *${invalidCmds.join(', ')}*\n` +
                    `Use ${global.config.prefix}help to see all commands.`
            )
        }

        // Resolve command names (aliases → canonical name)
        const resolvedCmds = rawCmds.map((c) => {
            const p = plugins.find((p) => p.name === c || p.aliases?.includes(c))
            return p ? p.name : c
        })

        // Expand categories into their commands and merge with explicit cmds
        const cmdsFromCats = rawCats.flatMap((cat) => catMap[cat] ?? [])
        const allBannedCmds = [...new Set([...resolvedCmds, ...cmdsFromCats])]

        // ── 4. Save to DB ────────────────────────────────────────────────────
        const result = await addCommandBan(M.from, target, allBannedCmds, rawCats, reason)
        if (!result.ok) {
            return M.reply('❌ Database error. Please try again.')
        }

        const name = await getContact(target)

        // ── 5. Build confirmation ────────────────────────────────────────────
        const isUpdate = result.action === 'updated'
        let msg = `🚫 *COMMAND BAN ${isUpdate ? 'UPDATED' : 'APPLIED'}*\n\n`
        msg += `👤 *User:* ${name}\n`
        msg += `📝 *Reason:* ${reason}\n\n`

        if (rawCats.length > 0) {
            msg += `📂 *Banned Categories:*\n`
            for (const cat of rawCats) {
                const cmdsInCat = catMap[cat] ?? []
                msg += `  • ${cat} (${cmdsInCat.length} commands)\n`
            }
            msg += '\n'
        }

        if (resolvedCmds.length > 0) {
            msg += `🎯 *Banned Commands:* ${resolvedCmds.join(', ')}\n\n`
        }

        msg += `📊 *Total Blocked:* ${allBannedCmds.length} command(s)\n`
        msg += `\n_Use ${global.config.prefix}cmdunban to remove restrictions._`

        return M.reply(msg)
    }
)
