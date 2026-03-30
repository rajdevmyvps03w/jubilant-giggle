import { plugin } from '../../utils/plugin.js'
import { getWarns, cleanExpiredWarns } from '../../database/db.js'

plugin(
    {
        name: 'warnsonme',
        aliases: ['mywarns', 'wsme'],
        category: 'group',
        isGroup: true,
        description: {
            content: 'Display your active warnings and associated penalties.'
        }
    },
    async (_, M) => {
        await cleanExpiredWarns(M.sender.id, M.from)
        const warns = await getWarns(M.sender.id, M.from)

        if (warns.level === 0) {
            return M.reply('✅ You currently have no active warnings in this group. Keep up the good behavior!')
        }

        const penalties = {
            1: 'Standard Warning: No mechanical restriction.',
            2: 'Sluggish Status: Daily & Lootbox cooldowns are doubled.',
            3: 'Command Instability: 30% chance for the bot to ignore you.',
            4: 'Command Throttle: Forced 5-second delay between all actions.',
            5: 'Economy Tax: 50–90% of earnings redirected to Group Funds.',
            6: 'Claim Restricted: Cards you claim are gifted to random members.'
        }

        let text = `⚠️ *YOUR WARNING REPORT*\n\n`
        // BUG 6 FIX: was /5, system supports 6 types
        text += `📊 *Current Level:* ${warns.level}/6\n\n`
        text += `📜 *Active Penalties:*\n`

        warns.types.forEach((t) => {
            const expiry = t.isPermanent ? 'Permanent' : new Date(t.expiresAt).toLocaleDateString()
            text += `• *Type ${t.typeId}:* ${penalties[t.typeId] || 'Unknown'}\n`
            text += `  └ 📝 *Reason:* ${t.reason || 'Not specified'}\n`
            text += `  └ ⏳ *Expiry:* ${expiry}\n`
        })

        return M.reply(text)
    }
)
