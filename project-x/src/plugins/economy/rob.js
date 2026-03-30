import { plugin } from '../../utils/plugin.js'
import { findUser, removeFromWallet, addToWallet, isPotionValid, getState, saveState } from '../../database/db.js'
import { getRandomInt, getRandomItem } from '../../functions/helpler.js'

const ROB_COOLDOWN_MS = 2 * 60 * 60 * 1000 // 2 hours

const fmtMs = (ms) => {
    const h = Math.floor(ms / 3600000)
    const m = Math.floor((ms % 3600000) / 60000)
    if (h > 0 && m > 0) {
        return `${h}h ${m}m`
    }
    if (h > 0) {
        return `${h}h`
    }
    return `${m}m`
}

plugin(
    {
        name: 'rob',
        aliases: ['steal'],
        category: 'economy',
        isGroup: true,
        description: {
            content: 'Attempt to rob another user. Be careful you can get caught!',
            usage: '<@mention>',
            example: '@user'
        }
    },
    async (_, M) => {
        try {
            /* ---------- COOLDOWN CHECK ---------- */
            const cooldownKey = `rob:cd:${M.sender.id}`
            const lastRob = await getState(cooldownKey)

            if (lastRob) {
                const elapsed = Date.now() - lastRob
                const remaining = ROB_COOLDOWN_MS - elapsed
                if (remaining > 0) {
                    return M.reply(
                        `⏳ *Robbery Cooldown*\n\n` +
                            `You need to lay low for a while.\n` +
                            `Try again in *${fmtMs(remaining)}*.`
                    )
                }
            }

            const opponent = M.mentioned?.[0] || (M.isQuoted ? M.quotedMessage?.participant : null)

            if (!opponent) {
                return M.reply('⚠️ Please tag or reply to someone you want to rob.')
            }
            if (opponent === M.sender.id || opponent === M.sender.jid) {
                return M.reply("😂 You can't rob yourself.")
            }

            const target = await findUser(opponent)
            if (!target) {
                return M.reply(
                    `❌ @${opponent.split('@')[0]} is not registered.\nYou can only rob registered users.`,
                    'text',
                    null,
                    null,
                    [opponent]
                )
            }

            if (global.config.mods.includes(target.jid)) {
                return
            }

            const robber = await findUser(M.sender.id)

            if ((robber.wallet || 0) < 500) {
                return M.reply('💰 You need at least *₹500* in your bank to attempt a robbery.')
            }

            if (target.wallet <= 0) {
                return M.reply('😅 The target has nothing in their wallet. No point robbing them!')
            }

            if (target.wallet < robber.wallet) {
                return M.reply('😅 The target seems poorer than you. Robbery failed before it began!')
            }

            const [hasRobProtection, hasLuckyPotion, hasMoneyPotion] = await Promise.all([
                isPotionValid(opponent, 'robprotection'),
                isPotionValid(M.sender.id, 'luckpotion'),
                isPotionValid(M.sender.id, 'moneypotion')
            ])

            if (hasRobProtection) {
                let bypassSuccess = false
                const roll = Math.random()

                if (hasLuckyPotion && hasMoneyPotion) {
                    bypassSuccess = roll < 0.6
                } else if (hasLuckyPotion) {
                    bypassSuccess = roll < 0.25
                }

                if (!bypassSuccess) {
                    await saveState(cooldownKey, Date.now(), ROB_COOLDOWN_MS)
                    await removeFromWallet(M.sender.id, 500)
                    await addToWallet(opponent, 250)
                    return M.reply(
                        `🛡️ @${opponent.split('@')[0]} has *Rob Protection*!\n` +
                            `Your attempt failed. You lost ₹500 (₹250 given to target).`,
                        'text',
                        null,
                        null,
                        [opponent]
                    )
                }
            }

            const outcomes = ['success', 'caught', 'fail', 'escape']
            const outcome = getRandomItem(outcomes)
            let message = ''

            switch (outcome) {
                case 'escape':
                    message = '🏃 The target ran away before you could rob them!'
                    break

                case 'caught':
                    await removeFromWallet(M.sender.id, 500)
                    await addToWallet(opponent, 250)
                    message = '🚨 You got *caught*! You lost ₹500 (₹250 given to the target).'
                    break

                case 'success': {
                    const percent = getRandomInt(3, 100)
                    const stealAmount = Math.min(Math.floor((target.wallet * percent) / 100), target.wallet)

                    if (stealAmount <= 0) {
                        message = '😞 Target has no money to steal.'
                    } else {
                        await removeFromWallet(opponent, stealAmount)
                        await addToWallet(M.sender.id, stealAmount)
                        message =
                            `🎯 *Robbery successful!*\n` +
                            `You stole *₹${stealAmount.toLocaleString()}* (${percent}% of target's wallet).`
                    }
                    break
                }

                default:
                    message = '😞 Robbery failed! Better luck next time.'
                    break
            }

            await saveState(cooldownKey, Date.now(), ROB_COOLDOWN_MS)

            return M.reply(
                `👤 @${M.sender.id.split('@')[0]} → 💸 @${opponent.split('@')[0]}\n\n${message}`,
                'text',
                null,
                null,
                [M.sender.id, opponent]
            )
        } catch (err) {
            console.error('[ROB ERROR]', err)
            return M.reply('❌ An error occurred during the robbery attempt.')
        }
    }
)
