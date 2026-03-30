import { plugin } from '../../utils/plugin.js'
import { getGroupActivityReport } from '../../database/db.js'

const fmtDate = (date) => {
    if (!date) {
        return 'Never'
    }
    const diff = Date.now() - new Date(date).getTime()
    const mins = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    if (mins < 1) {
        return 'Just now'
    }
    if (mins < 60) {
        return `${mins}m ago`
    }
    if (hours < 24) {
        return `${hours}h ago`
    }
    if (days === 1) {
        return 'Yesterday'
    }
    return `${days}d ago`
}

// ── Half-active threshold ─────────────────────────────────────────────────────
// A user is "half active" if they sent messages in the window but their count
// is in the bottom third of all active users.
// e.g. if top sender has 60 msgs, threshold = 20. Anyone with 1–19 = half active.
const splitActive = (active) => {
    if (active.length === 0) {
        return { full: [], half: [] }
    }
    if (active.length === 1) {
        return { full: active, half: [] }
    }

    const max = active[0].windowMsgs // already sorted desc
    const threshold = Math.max(1, Math.ceil(max / 3)) // bottom third cutoff

    const full = active.filter((u) => u.windowMsgs >= threshold)
    const half = active.filter((u) => u.windowMsgs > 0 && u.windowMsgs < threshold)

    // Edge case: everyone is above threshold → put nobody in half
    return { full, half }
}

plugin(
    {
        name: 'activity',
        aliases: ['active', 'inactive', 'groupactivity', 'who'],
        category: 'group',
        isGroup: true,
        isAdmin: true,
        description: {
            content: 'Shows and tags active, half-active, and inactive members.',
            usage: '[--days=N] [--top=N]',
            example: '--days=7 --top=20'
        }
    },
    async (client, M, { flags }) => {
        try {
            const windowDays = Math.min(Math.max(parseInt(flags.days) || 5, 1), 30)
            const topN = Math.min(Math.max(parseInt(flags.top) || 999, 1), 200)
            const p = global.config.prefix

            await M.reply(`⏳ Analysing group activity for the last *${windowDays} day${windowDays > 1 ? 's' : ''}*...`)

            const allMembers = M.groupMetadata.participants.map((p) => p.id)
            const { active, inactive } = await getGroupActivityReport(M.from, allMembers, windowDays)

            const { full: fullActive, half: halfActive } = splitActive(active)

            const displayFull = fullActive.slice(0, topN)
            const allJids = {
                full: fullActive.map((u) => u.jid),
                half: halfActive.map((u) => u.jid),
                inactive: inactive.map((u) => u.jid)
            }

            // ── SUMMARY ───────────────────────────────────────────────────────
            let msg =
                `📊 *GROUP ACTIVITY REPORT*\n` +
                `📅 *Window:* Last ${windowDays} day${windowDays > 1 ? 's' : ''}\n` +
                `👥 *Members:* ${allMembers.length} total\n` +
                `🟢 *Active:* ${fullActive.length}  ` +
                `🟡 *Half-active:* ${halfActive.length}  ` +
                `🔴 *Inactive:* ${inactive.length}\n\n`

            // ── FULLY ACTIVE ──────────────────────────────────────────────────
            if (fullActive.length === 0) {
                msg += `🟢 *ACTIVE (0)*\n_No one has been fully active in the last ${windowDays} days._\n\n`
            } else {
                msg += `🟢 *ACTIVE — ${fullActive.length} member${fullActive.length > 1 ? 's' : ''}*\n\n`
                displayFull.forEach((u, i) => {
                    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`
                    msg += `${medal} @${u.jid.split('@')[0]}\n`
                    msg += `   💬 ${u.windowMsgs} msg${u.windowMsgs !== 1 ? 's' : ''} this window · 📦 ${u.totalMsgs} total\n`
                    msg += `   🕐 Last seen: ${fmtDate(u.lastSeen)}\n\n`
                })
                if (fullActive.length > topN) {
                    msg += `_...and ${fullActive.length - topN} more active members._\n\n`
                }
            }

            // ── HALF ACTIVE ───────────────────────────────────────────────────
            if (halfActive.length === 0) {
                msg += `🟡 *HALF-ACTIVE (0)*\n_No one falls in the half-active range._\n\n`
            } else {
                msg += `🟡 *HALF-ACTIVE — ${halfActive.length} member${halfActive.length > 1 ? 's' : ''}*\n`
                msg += `_(messaged but less than ⅓ of the most active member)_\n\n`
                halfActive.forEach((u, i) => {
                    msg += `${i + 1}. @${u.jid.split('@')[0]}\n`
                    msg += `   💬 ${u.windowMsgs} msg${u.windowMsgs !== 1 ? 's' : ''} · 🕐 ${fmtDate(u.lastSeen)}\n\n`
                })
            }

            // ── INACTIVE ──────────────────────────────────────────────────────
            if (inactive.length === 0) {
                msg += `🔴 *INACTIVE (0)*\n_Everyone has been active! 🎉_\n`
            } else {
                msg += `🔴 *INACTIVE — ${inactive.length} member${inactive.length > 1 ? 's' : ''}*\n`
                msg += `_(no messages in the last ${windowDays} days)_\n\n`

                const wentSilent = inactive.filter((u) => u.tracked)
                const neverSeen = inactive.filter((u) => !u.tracked)

                if (wentSilent.length > 0) {
                    msg += `🔇 *Gone silent:*\n`
                    wentSilent.forEach((u) => {
                        msg += `• @${u.jid.split('@')[0]}`
                        if (u.lastSeen) msg += ` — last seen ${fmtDate(u.lastSeen)}`
                        msg += ` (${u.totalMsgs} total msgs)\n`
                    })
                    msg += '\n'
                }

                if (neverSeen.length > 0) {
                    msg += `👻 *Never messaged:*\n`
                    neverSeen.forEach((u) => {
                        msg += `• @${u.jid.split('@')[0]}\n`
                    })
                }
            }

            msg += `\n_Tracking started from the first message after the bot joined._`

            const allMentions = [...allJids.full, ...allJids.half, ...allJids.inactive]

            await client.sendMessage(M.from, {
                text: msg.trim(),
                mentions: allMentions
            })

            if (allJids.full.length > 0) {
                const tagFull =
                    `🟢 *ACTIVE MEMBERS* — you're doing great, keep it up! 💪\n\n` +
                    allJids.full.map((j) => `@${j.split('@')[0]}`).join(' ')
                await client.sendMessage(M.from, {
                    text: tagFull,
                    mentions: allJids.full
                })
            }

            if (allJids.half.length > 0) {
                const tagHalf =
                    `🟡 *HALF-ACTIVE MEMBERS* — you've been a little quiet lately! 👀\n\n` +
                    allJids.half.map((j) => `@${j.split('@')[0]}`).join(' ')
                await client.sendMessage(M.from, {
                    text: tagHalf,
                    mentions: allJids.half
                })
            }

            if (allJids.inactive.length > 0) {
                const tagInactive =
                    `🔴 *INACTIVE MEMBERS* — where have you been? We miss you! 👋\n\n` +
                    allJids.inactive.map((j) => `@${j.split('@')[0]}`).join(' ')
                await client.sendMessage(M.from, {
                    text: tagInactive,
                    mentions: allJids.inactive
                })
            }
        } catch (err) {
            console.error('[ACTIVITY ERROR]', err)
            return M.reply('❌ Failed to generate activity report.')
        }
    }
)
