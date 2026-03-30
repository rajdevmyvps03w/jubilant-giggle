import { plugin } from '../../utils/plugin.js'
import { findUser, addUserExp } from '../../database/db.js'
import { getRank } from '../../functions/stats.js'

plugin(
    {
        name: 'addexp',
        aliases: ['giveexp', 'addxp'],
        category: 'dev',
        isDev: true,
        description: {
            content: 'Dev: Add XP/EXP to a mentioned or quoted user.',
            usage: '<@user | reply> <amount>',
            example: '@917003213983 1000'
        }
    },
    async (_, M, { text }) => {
        try {
            // 1. Resolve target user
            let targetJid = M.mentioned?.[0] || (M.isQuoted ? M.quotedMessage?.participant : null)
            if (!targetJid) {
                return M.reply('❌ Please mention or reply to the user you want to give EXP to.')
            }

            // 2. Parse amount
            const cleanText = text.replace(/@\d+/g, '').trim()
            const amount = Number(cleanText)

            if (isNaN(amount) || amount === 0) {
                return M.reply(
                    `❌ Please provide a valid EXP amount (can be negative to deduct).\nUsage: *${global.config.prefix}addexp @user <amount>*`
                )
            }

            // 3. Check target is registered
            const targetUser = await findUser(targetJid, 'name exp')
            if (!targetUser) {
                return M.reply('❌ That user is not registered in the bot.')
            }

            const oldExp = targetUser.exp || 0
            const oldRank = getRank(oldExp)
            const newExp = Math.max(0, oldExp + amount) // prevent going below 0
            const newRank = getRank(newExp)

            // 4. Apply EXP change
            await addUserExp(targetJid, amount)

            const action = amount >= 0 ? 'Added ✨' : 'Deducted 📉'
            const sign = amount >= 0 ? '+' : ''
            const rankChanged = oldRank.name !== newRank.name

            return M.reply(
                `✅ *EXP UPDATED*\n\n` +
                    `👤 *User:* ${targetUser.name}\n` +
                    `⚡ *Action:* ${action}\n` +
                    `📊 *Change:* ${sign}${Math.abs(amount).toLocaleString()} XP\n` +
                    `🔢 *Old EXP:* ${oldExp.toLocaleString()} (${oldRank.name})\n` +
                    `🔢 *New EXP:* ${newExp.toLocaleString()} (${newRank.name})\n` +
                    (rankChanged ? `\n🏆 *Rank Changed:* ${oldRank.name} → ${newRank.name}\n` : '') +
                    `\n_Modified by dev: @${M.sender.id.split('@')[0]}_`
            )
        } catch (err) {
            console.error('[ADDEXP ERROR]', err)
            return M.reply('❌ An error occurred while updating EXP.')
        }
    }
)
