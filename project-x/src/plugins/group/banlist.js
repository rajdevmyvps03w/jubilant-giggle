import { plugin } from '../../utils/plugin.js'
import { getAllBans, getUserBan, getContact } from '../../database/db.js'

plugin(
    {
        name: 'banlist',
        aliases: ['cmdbans', 'listbans'],
        category: 'group',
        isGroup: true,
        isAdmin: true,
        description: {
            content: 'View all command bans in this group, or check the full ban details for a specific user.',
            usage: '<@user | reply>',
            example: '@user'
        }
    },
    async (_, M) => {
        // ── A. Single user detail view ────────────────────────────────────────
        const target =
            (M.mentioned?.[0] ?? (M.isQuoted ? M.quotedMessage?.participant : null)) &&
            !(M.isQuoted && M.sender.id !== M.quotedMessage.participant && M.sender.jid !== M.quotedMessage.participant)
                ? (M.mentioned?.[0] ?? M.quotedMessage?.participant)
                : null

        if (target) {
            const ban = await getUserBan(M.from, target)
            const name = await getContact(target)

            if (!ban) {
                return M.reply(`✅ *${name}* has no active command bans in this group.`)
            }

            const date = new Date(ban.bannedAt).toLocaleString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            })

            let msg = `🚫 *BAN PROFILE: ${name}*\n\n`
            msg += `📝 *Reason:* ${ban.reason || 'Not specified'}\n`
            msg += `📅 *Since:* ${date}\n\n`

            if (ban.categories?.length > 0) {
                msg += `📂 *Banned Categories:*\n`
                for (const cat of ban.categories) {
                    msg += `  • ${cat}\n`
                }
                msg += '\n'
            }

            if (ban.commands?.length > 0) {
                msg += `🎯 *Banned Commands (${ban.commands.length}):*\n`
                // Show all in rows of 4 for readability
                const rows = []
                for (let i = 0; i < ban.commands.length; i += 4) {
                    rows.push(ban.commands.slice(i, i + 4).join(', '))
                }
                msg += rows.map((r) => `  ${r}`).join('\n')
            }

            msg += `\n\n_Use ${global.config.prefix}cmdunban @${target.split('@')[0]} --all to fully pardon._`
            return M.reply(msg)
        }

        // ── B. Group-wide ban list ────────────────────────────────────────────
        const bans = await getAllBans(M.from)

        if (!bans || bans.length === 0) {
            return M.reply('✅ No active command bans in this group.')
        }

        let msg = `🚫 *COMMAND BAN LIST*\n`
        msg += `📊 *Total:* ${bans.length} user(s)\n\n`

        for (let i = 0; i < bans.length; i++) {
            const b = bans[i]
            const uname = await getContact(b.jid)
            msg += `*${i + 1}. ${uname}*\n`

            if (b.categories?.length > 0) {
                msg += `   📂 Categories: ${b.categories.join(', ')}\n`
            }

            const cmdCount = b.commands?.length ?? 0
            msg += `   🎯 Commands: ${cmdCount} blocked\n`

            if (b.reason) {
                msg += `   📝 Reason: ${b.reason}\n`
            }
            msg += '\n'
        }

        msg += `_For details on a user: ${global.config.prefix}banlist @user_`
        return M.reply(msg.trim())
    }
)
