import { plugin, plugins } from '../../utils/plugin.js'
import { removeCommandBan, clearCommandBan, getUserBan, getContact } from '../../database/db.js'

// ─── helpers ─────────────────────────────────────────────────────────────────

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
        name: 'cmdunban',
        aliases: ['unbanfrom', 'ubcmd'],
        category: 'group',
        isGroup: true,
        isAdmin: true,
        description: {
            content:
                'Remove command/category bans from a user.\n' +
                'Use --cmd or --category to remove specific restrictions, or --all to fully clear.\n' +
                'Removing a category also removes all commands that were banned through it.',
            usage: '<@user | reply> [--cmd=name1,name2] [--category=cat1,cat2] [--all]',
            example:
                '@user --cmd=gamble          (remove just gamble ban)\n' +
                '@user --category=economy    (remove all economy bans)\n' +
                '@user --all                 (full pardon)'
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
            return M.reply('❌ Please mention or reply to the user.')
        }

        const name = await getContact(target)

        // ── 2. --all: full clear ─────────────────────────────────────────────
        if ('all' in flags) {
            const cleared = await clearCommandBan(M.from, target)
            if (!cleared) {
                return M.reply(`ℹ️ *${name}* doesn't have any active command bans in this group.`)
            }
            return M.reply(
                `✅ *FULL PARDON*\n\n` +
                    `👤 *User:* ${name}\n` +
                    `📋 All command and category restrictions have been lifted.`
            )
        }

        // ── 3. Partial removal ───────────────────────────────────────────────
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

        if (rawCmds.length === 0 && rawCats.length === 0) {
            return M.reply(
                `❌ Specify what to remove or use --all for a full pardon.\n\n` +
                    `  ${global.config.prefix}cmdunban @user --cmd=gamble\n` +
                    `  ${global.config.prefix}cmdunban @user --category=economy\n` +
                    `  ${global.config.prefix}cmdunban @user --all`
            )
        }

        // Validate the user actually has a ban
        const banEntry = await getUserBan(M.from, target)
        if (!banEntry) {
            return M.reply(`ℹ️ *${name}* has no active command bans in this group.`)
        }

        // Resolve canonical names for commands
        const resolvedCmds = rawCmds.map((c) => {
            const p = plugins.find((p) => p.name === c || p.aliases?.includes(c))
            return p ? p.name : c
        })

        // Build category → commands map for resolving which cmds to also remove
        const catMap = getCategoryMap()

        const result = await removeCommandBan(M.from, target, resolvedCmds, rawCats, catMap)

        if (!result.ok) {
            if (result.error === 'NO_BAN') {
                return M.reply(`ℹ️ *${name}* has no active command bans in this group.`)
            }
            return M.reply('❌ Database error. Please try again.')
        }

        // ── 4. Build confirmation ────────────────────────────────────────────
        if (result.action === 'removed_all') {
            return M.reply(
                `✅ *BAN CLEARED*\n\n` + `👤 *User:* ${name}\n` + `📋 All restrictions removed (ban entry deleted).`
            )
        }

        let msg = `✅ *BAN UPDATED*\n\n`
        msg += `👤 *User:* ${name}\n\n`

        if (rawCats.length > 0) {
            msg += `🔓 *Categories Removed:* ${rawCats.join(', ')}\n`
            const freed = rawCats.flatMap((c) => catMap[c] ?? [])
            if (freed.length > 0) msg += `   ↳ Also freed ${freed.length} command(s) from those categories\n`
        }

        if (resolvedCmds.length > 0) {
            msg += `🔓 *Commands Removed:* ${resolvedCmds.join(', ')}\n`
        }

        msg += `\n📊 *Still Banned:* ${result.commands?.length ?? 0} command(s)`

        if (result.commands?.length > 0) {
            msg += `\n   (${result.commands.slice(0, 10).join(', ')}${result.commands.length > 10 ? '...' : ''})`
        }

        return M.reply(msg)
    }
)
