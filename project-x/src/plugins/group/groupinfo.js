import { plugin } from '../../utils/plugin.js'
import { User } from '../../database/models/index.js'
import { findGroup, getGroupWealth } from '../../database/db.js'
import { getBuffer } from '../../functions/helpler.js'
import { getGroupLevel } from '../../functions/stats.js'

plugin(
    {
        name: 'groupinfo',
        aliases: ['ginfo', 'groupstats'],
        isGroup: true,
        category: 'group',
        description: {
            content: 'View detailed information about this group.',
            example: 'groupinfo'
        }
    },
    async (client, M) => {
        // Added client to parameters for profilePic fetch
        try {
            // 1. Await Group Data
            const group = await findGroup(M.from)

            // 2. Await Wealth & Home Member Stats
            const totalWealth = await getGroupWealth(M.from)

            // Efficient MongoDB filter instead of loading all users
            const homeUsers = await User.find({ 'bank.id': M.from })
            const homeBankWealth = homeUsers.reduce((sum, u) => sum + (u.bank?.value || 0), 0)

            // 3. Level & Metadata logic
            const { level, currentExp, nextLevelExp, remaining } = getGroupLevel(group.exp)
            const admins = M.groupMetadata.participants.filter((p) => p.admin)
            const adminCount = admins.length

            // 4. Feature List Rendering
            const featureList =
                group.features?.length > 0
                    ? group.features
                          .map((f) => {
                              const status = f.active ? '🟢 Active' : '🔴 Paused'
                              // Check for expiry or frozen time
                              let timeInfo = ''
                              if (f.active && f.expiresAt) {
                                  timeInfo = ` | ⏳ ${new Date(f.expiresAt).toLocaleDateString()}`
                              } else if (!f.active && f.timeLeft) {
                                  timeInfo = ` | ❄️ Frozen`
                              }
                              return `• ${f.name} (_${status}${timeInfo}_)`
                          })
                          .join('\n')
                    : 'No features unlocked.'

            // 5. Metadata & Profile Picture
            const createdAt = new Date(M.groupMetadata.creation * 1000).toLocaleDateString()
            const descTime = M.groupMetadata.descTime
                ? new Date(M.groupMetadata.descTime * 1000).toLocaleDateString()
                : 'N/A'

            let profilePic
            try {
                profilePic = await client.profilePictureUrl(M.from, 'image')
            } catch {
                profilePic = 'https://topics.studyjapan.jp/images_upload/2018/01/01/notice_404.png'
            }

            const buffer = await getBuffer(profilePic)

            const message =
                `📊 *Group Information*\n\n` +
                `🏷️ *Name:* ${M.groupMetadata.subject}\n\n` +
                `🆔 *ID:* ${M.groupMetadata.id}\n\n` +
                `📅 *Created On:* ${createdAt}\n\n` +
                `👑 *Owner:* ${M.groupMetadata.ownerPn || 'Unknown'}\n\n` +
                `🕒 Updated On: ${descTime}\n\n` +
                `👥 *Members:* ${M.groupMetadata.size}\n\n` +
                `🛡️ *Admins:* ${adminCount}\n\n` +
                `📢 *Announcements:* ${M.groupMetadata.announce ? 'Yes' : 'No'}\n\n` +
                `⚔️ *MMO Mode:* ${group.mmo ? 'Enabled' : 'Disabled'}\n\n` +
                `⭐ *Level:* ${level}\n\n` +
                `✨ *EXP:* ${currentExp.toLocaleString()} / ${nextLevelExp.toLocaleString()}\n\n` +
                `⬆️ *Next Level In:* ${remaining.toLocaleString()} EXP\n\n` +
                `🏦 *Group Funds:* ₹${(group.funds || 0).toLocaleString()}\n\n` +
                `🏠 *Home Members:* ${homeUsers.length}\n\n` +
                `💰 *Home Bank Wealth:* ₹${homeBankWealth.toLocaleString()}\n\n` +
                `💎 *Total Group Wealth:* ₹${totalWealth.toLocaleString()}\n\n` +
                `📝 *Description:*\n${M.groupMetadata.desc || 'No description'}\n\n` +
                `🧩 *Unlocked Features:*\n${featureList}`

            return M.reply(buffer, 'image', undefined, message.trim())
        } catch (err) {
            console.error('[GROUP INFO ERROR]', err)
            return M.reply('❌ Error fetching group details.')
        }
    }
)
