import { plugin } from '../../utils/plugin.js'
import { addWarn, getContact, hasWarnType } from '../../database/db.js'

plugin(
    {
        name: 'warn',
        category: 'group',
        isGroup: true,
        isAdmin: true,
        description: {
            content: 'Issue a warning to a group member.',
            usage: '<@user> [--type=1-6] [--ispermanent=true|false] <reason>',
            example: '@user --type=5 --ispermanent=true spamming economy'
        }
    },
    async (client, M, { text, flags }) => {
        // ── Resolve target ────────────────────────────────────────────────
        const target =
            (M.mentioned?.[0] ?? (M.isQuoted ? M.quotedMessage?.participant : null)) &&
            !(M.isQuoted && M.sender.id !== M.quotedMessage.participant && M.sender.jid !== M.quotedMessage.participant)
                ? (M.mentioned?.[0] ?? M.quotedMessage?.participant)
                : null
        if (!target) {
            return M.reply('❌ Please identify the user by mentioning them or replying to their message.')
        }

        const isTargetAdmin = M.groupMetadata.participants.find((p) => p.id === target)?.admin
        if (isTargetAdmin || target === client.user.id) {
            return M.reply('🛡️ Safety Protocol: You cannot issue warnings to group administrators or the bot.')
        }

        // ── Parse flags ───────────────────────────────────────────────────
        const isPermanent = flags.ispermanent === 'true' || flags.ispamament === 'true'

        // BUG 3 FIX: validate typeId is 1–6
        let typeId = null
        if ('type' in flags) {
            const parsed = parseInt(flags.type)
            if (isNaN(parsed) || parsed < 1 || parsed > 6) {
                return M.reply('❌ Invalid warn type. Must be a number between *1 and 6*.')
            }
            typeId = parsed
        }

        const reason = text?.trim() || 'No reason specified'

        // BUG 1 FIX: check TARGET for duplicate, not M.sender.id
        const alreadyHasType = typeId ? await hasWarnType(target, M.from, typeId) : false
        if (alreadyHasType) {
            return M.reply(`⚠️ This user already has a *Type ${typeId}* warning active.`)
        }

        // ── Apply warn ────────────────────────────────────────────────────
        const res = await addWarn(target, M.from, typeId, isPermanent, reason)
        const name = await getContact(target)

        // BUG 2 FIX: null-check res before accessing res.level
        if (!res) {
            return M.reply('❌ Failed to issue warning. Please try again.')
        }

        // Auto-kick at level 6
        if (res.level >= 6) {
            await M.reply(`🚨 *CRITICAL LIMIT:* ${name} has accumulated 6 warnings. Removing from group...`)
            return client.groupParticipantsUpdate(M.from, [target], 'remove')
        }

        return M.reply(
            `⚠️ *WARNING ISSUED* ⚠️\n\n` +
                `👤 *User:* ${name}\n` +
                `📉 *Warning Level:* ${res.level}/6\n` +
                `🛡️ *Penalty Type:* ${typeId ? `Type ${typeId}` : 'Sequential (auto)'}\n` +
                `📝 *Reason:* ${reason}\n` +
                `⏳ *Status:* ${isPermanent ? 'Permanent' : 'Temporary (7 Days)'}`
        )
    }
)
