import { plugin } from '../../utils/plugin.js'
import { updateSupportGroupInvite } from '../../database/db.js'

const CATEGORY_LABELS = {
    economy: '💰 Economy Support',
    cards: '🃏 Cards Support',
    common: '💬 General Support'
}

plugin(
    {
        name: 'support',
        aliases: ['supportlinks', 'groups', 'helpgroups'],
        category: 'misc',
        description: {
            content: 'Get all support group invite links sent to your DM.'
        }
    },
    async (client, M) => {
        try {
            const groups = global.config.supportGroups ?? []

            if (groups.length === 0) {
                return M.reply('❌ No support groups have been set up yet.')
            }

            // Group by category
            const byCategory = {}
            for (const g of groups) {
                const cat = g.category || 'common'
                if (!byCategory[cat]) {
                    byCategory[cat] = []
                }
                byCategory[cat].push(g)
            }

            let msg = `🆘 *Project-X Support Groups*\n\n`
            msg += `Here are all our support groups. Tap a link to join!\n\n`

            for (const [cat, catGroups] of Object.entries(byCategory)) {
                const label = CATEGORY_LABELS[cat] || `📌 ${cat}`
                msg += `*${label}*\n`

                for (const g of catGroups) {
                    // Refresh invite link if bot is still in the group
                    const freshCode = await client.groupInviteCode(g.jid).catch(() => null)
                    if (freshCode) {
                        const freshInvite = `https://chat.whatsapp.com/${freshCode}`
                        if (freshInvite !== g.invite) {
                            await updateSupportGroupInvite(g.jid, freshInvite)
                            g.invite = freshInvite
                        }
                    }

                    msg += `• *${g.label}*\n`
                    msg += `  ${g.invite}\n\n`
                }
            }

            msg += `_Links are invite-only. Please follow group rules once you join._`

            // Send to DM, fallback to current chat
            try {
                await client.sendMessage(M.sender.id, { text: msg })
                if (M.chat === 'group') {
                    return M.reply('📬 Support group links have been sent to your DM!')
                }
            } catch {
                return M.reply(msg)
            }
        } catch (err) {
            console.error('[SUPPORT COMMAND ERROR]', err)
            return M.reply('❌ An error occurred while fetching support links.')
        }
    }
)
