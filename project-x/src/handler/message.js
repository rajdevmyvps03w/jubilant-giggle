import { parseArgs, getClosestCommand, getRandomInt } from '../functions/helpler.js'
import { plugins } from '../utils/plugin.js'
import {
    isRegUser,
    addUserExp,
    findUser,
    getLeaderboardPosition,
    findGroup,
    addToWallet,
    getAfk,
    clearAfk,
    isForeignUser,
    isCommandBanned,
    incrementAfkPing,
    processPetDecay,
    isGroupFeatureActive,
    trackGroupActivity,
    isPotionValid,
    getActiveBotState,
    updateGroupExp,
    incrementChallengeProgress,
    incrementUserStat,
    checkLiveChallenge,
    getCommandCooldown,
    isUserTimedOut,
    isChatbotEnabled,
    getDisabledCommand,
    hasWarnType,
    isSupportGroup,
    getState,
    saveState
} from '../database/db.js'
import { getRank } from '../functions/stats.js'
import { sendToCharacterAI } from '../functions/cai.js'
import { enqueue } from '../utils/queue.js'
import { effectiveCooldown } from '../functions/cooldowns.js'
import chalk from 'chalk'
import { handleWcgMessage } from '../functions/wcg.js'
const _alertedKeys = new Map()
const _throttleMap = new Map()

const logAction = (type, color, M, args = '') => {
    const time = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    const target = M.chat === 'group' ? M.groupName || 'Unknown Group' : 'DM'
    console.log(
        `${chalk[color](`~${type}`)} ${chalk.white(args)} ${chalk.white('from')} ${chalk.green(M.sender.name)} ` +
            `in ${chalk.magenta(target)} [${chalk.blue(M.body?.length || 0)}] ${chalk.gray(`[${time}]`)}`
    )
}

export const preProcessMessage = async (client, M) => {
    // Basic validation
    if (!M?.body) {
        return { shouldReturn: true }
    }

    const body = M.body.trim()
    const prefix = global.config.prefix
    const isCmd = body.startsWith(prefix)

    const isRestricted = await handleGroupProtections(client, M)
    if (isRestricted) {
        return { shouldReturn: true }
    }

    const parsedArgs = parseArgs(body)

    return {
        shouldReturn: false,
        body,
        prefix,
        isCmd,
        parsedArgs,
        requestTimestamp: Date.now()
    }
}

export const processMessageHandler = async (client, M, preResult) => {
    const { body, prefix, isCmd, parsedArgs } = preResult

    try {
        if (M.chat === 'group' && client._sessionId) {
            const ALWAYS_ALLOWED = ['alive', 'stop', 'activate', 'botswitch', 'botoff', 'silencebot']

            if (!ALWAYS_ALLOWED.includes(parsedArgs.cmd)) {
                const activeBot = await getActiveBotState(M.from)

                if (activeBot === 'none') {
                    return
                }

                if (activeBot && activeBot !== client._sessionId) {
                    return
                }
            }
        }

        if (M.chat === 'group' && !isCmd) {
            const wcgHandled = await handleWcgMessage(client, M)
            if (wcgHandled) {
                return
            }

            const enabled = await isChatbotEnabled()
            if (enabled) {
                const botQuoted = M.isQuoted && M.quotedMessage?.participant === M.botNumber

                if (M.isBotMentioned || botQuoted) {
                    const text = body.replace(/@\d+/g, '').trim()
                    if (text) {
                        sendToCharacterAI(text, M)
                    }
                }
            }
            return
        }

        logAction('RECV', 'green', M, 'Message')

        if (M.chat === 'group') {
            const senderAfk = await getAfk(M.sender.id)
            if (senderAfk) {
                const oldAfk = await clearAfk(M.sender.id)
                if (oldAfk) {
                    const duration = Date.now() - oldAfk.since
                    const mins = Math.floor(duration / 60000)
                    const hours = Math.floor(mins / 60)
                    const days = Math.floor(hours / 24)

                    let timeStr
                    if (days > 0) {
                        timeStr = `${days}d ${hours % 24}h`
                    } else if (hours > 0) {
                        timeStr = `${hours}h ${mins % 60}m`
                    } else if (mins > 0) {
                        timeStr = `${mins}m`
                    } else {
                        timeStr = 'less than a minute'
                    }

                    await M.reply(
                        `👋 *Welcome back!*\n\n` +
                            `You were AFK for *${timeStr}*.\n` +
                            (oldAfk.pingCount > 0
                                ? `📬 You were mentioned *${oldAfk.pingCount}* time(s) while away.`
                                : `📭 Nobody mentioned you while you were away.`)
                    )
                }
            }

            const mentionedJids = [...(M.mentioned || [])]
            if (M.isQuoted && M.quotedMessage?.participant) {
                const qp = M.quotedMessage.participant
                if (!mentionedJids.includes(qp)) {
                    mentionedJids.push(qp)
                }
            }

            const otherJids = mentionedJids.filter((jid) => jid !== M.sender.id)
            if (otherJids.length > 0) {
                const afkResults = await Promise.all(otherJids.map((jid) => getAfk(jid)))

                for (let i = 0; i < otherJids.length; i++) {
                    const jid = otherJids[i]
                    const afk = afkResults[i]
                    if (!afk) {
                        continue
                    }

                    const duration = Date.now() - afk.since
                    const mins = Math.floor(duration / 60000)
                    const hours = Math.floor(mins / 60)
                    const days = Math.floor(hours / 24)

                    let timeStr
                    if (days > 0) {
                        timeStr = `${days}d ${hours % 24}h`
                    } else if (hours > 0) {
                        timeStr = `${hours}h ${mins % 60}m`
                    } else if (mins > 0) {
                        timeStr = `${mins}m`
                    } else {
                        timeStr = 'just now'
                    }

                    await M.reply(
                        `💤 *@${jid.split('@')[0]} is currently AFK*\n\n` +
                            `📝 *Reason:* ${afk.reason}\n` +
                            `⏱️ *Since:* ${timeStr} ago`,
                        'text',
                        undefined,
                        undefined,
                        [jid]
                    )
                    incrementAfkPing(jid).catch(() => {})
                }
            }
        }

        if (!isCmd) {
            return
        }

        if (M.chat === 'group' && !M.isAdmin) {
            const timeoutData = await isUserTimedOut(M.sender.id, M.from)

            if (timeoutData) {
                const lockKey = `timeout_notified:${M.sender.id}`
                const alreadyNotified = await getState(lockKey)

                if (!alreadyNotified) {
                    const remainingMs = timeoutData.until - Date.now()
                    const minutes = Math.ceil(remainingMs / (1000 * 60))

                    await M.reply(
                        `🚫 *Access Denied*\n\n` +
                            `You are currently in timeout and cannot use commands.\n` +
                            `⏳ *Remaining:* ~${minutes} minute(s)\n` +
                            `📝 *Reason:* ${timeoutData.reason}`
                    )

                    await saveState(lockKey, true)
                    setTimeout(
                        async () => {
                            await saveState(lockKey, null)
                        },
                        2 * 60 * 1000
                    )
                }
                return
            }
        }

        if (body === prefix) {
            return M.reply(`*Did You Mean ${prefix}help*`)
        }

        const economyCmd = ['gamble', 'bet', 'g', 'slot', 'casino', 'openlootbox', 'openlb', 'lootboxopen']
        const noRegNeeded = ['getreg', 'regcode', 'register', 'signup']

        const isNoRegCommand = noRegNeeded.includes(parsedArgs.cmd)
        const isEcoCommand = economyCmd.includes(parsedArgs.cmd)

        const [user, isReg] = await Promise.all([findUser(M.sender.id, 'pet jid lid ban'), isRegUser(M.sender.id)])

        if (user?.ban?.status === true && !global.config.mods.includes(M.sender.id)) {
            const bannedAt = user.ban.dateOfLogin
                ? new Date(user.ban.dateOfLogin).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
                : 'Unknown'
            return M.reply(
                `🚫 *You are banned from using this bot.*\n\n` +
                    `📝 *Reason:* ${user.ban.reason || 'No reason provided.'}\n` +
                    `🕐 *Banned At:* ${bannedAt} (IST)\n\n` +
                    `Contact a developer if you believe this is a mistake.`
            )
        }

        const petUpdate = await processPetDecay(user)

        if (petUpdate) {
            let text = ''

            if (petUpdate?.died) {
                if (petUpdate.reason === 'starved') {
                    text = `💀 *${user.pet.name} has died!*\n\nYour pet starved to death. 🍖\n\n_Use *${prefix}releasepet* to clear the profile._`
                } else if (petUpdate.reason === 'lonely') {
                    text = `💀 *${user.pet.name} has died!*\n\nYour pet died from loneliness. Nobody played with it for over 24 hours. 💔\n\n_Use *${prefix}releasepet* to clear the profile._`
                }
            } else if (Array.isArray(petUpdate)) {
                const lines = []
                if (petUpdate.includes('hungry')) {
                    lines.push(`🍖 *Starving*, hunger below 20%! Feed it before it dies.`)
                }
                if (petUpdate.includes('lonely')) {
                    lines.push(`💔 *Lonely*, happiness at 0%! Play with it or it will die in 24h.`)
                }
                if (petUpdate.includes('sad')) {
                    lines.push(`😢 *Sad*, happiness is getting low. Play with it soon.`)
                }
                if (petUpdate.includes('sleepy')) {
                    lines.push(`😴 *Exhausted*, energy at 0%! Let it sleep with *${prefix}sleeppet*.`)
                }
                text = `⚠️ *${user.pet.name} needs your attention!*\n\n${lines.join('\n')}`
            }

            if (text) {
                await client.sendMessage(M.sender.id, { text }).catch(() => {})
            }
        }

        if (!isReg && !isNoRegCommand) {
            return M.reply(`❌ You are not registered. Use *${prefix}getreg* first.`)
        }

        if (M.chat === 'group' && isEcoCommand) {
            const isActive = await isGroupFeatureActive(M.from, 'eco_game')
            if (!isActive) {
                return M.reply(
                    `Looks like these commands haven't been activated yet! Please tell an admin to use: *${prefix}active 2* to enable the Economy System.`
                )
            }
        }

        logAction('EXEC', 'red', M, `${prefix}${parsedArgs.cmd}`)

        const cmd = plugins.find((p) => p.name === parsedArgs.cmd || p.aliases.includes(parsedArgs.cmd))

        if (cmd && !global.config.mods.includes(M.sender.id)) {
            const disabledData = await getDisabledCommand(cmd.name)
            if (disabledData) {
                const disabledAt = new Date(disabledData.disabledAt).toLocaleString('en-IN', {
                    timeZone: 'Asia/Kolkata'
                })
                return M.reply(
                    `🔴 *Command Disabled*\n\n` +
                        `*${prefix}${cmd.name}* is currently unavailable.\n` +
                        `📝 *Reason:* ${disabledData.reason}\n` +
                        `🕐 *Since:* ${disabledAt} (IST)\n\n` +
                        `_Please check back later or contact a developer._`
                )
            }
        }

        if (!cmd) {
            const suggestion = getClosestCommand(parsedArgs.cmd)
            return M.reply(`❌ Command not found. Did you mean ${prefix}${suggestion}?`)
        }

        if (M.chat === 'group') {
            if (!M.isAdmin) {
                const [banResult, isUnstable, isThrottled] = await Promise.all([
                    isReg ? isCommandBanned(M.from, M.sender.id, cmd.name) : Promise.resolve({ banned: false }),
                    isReg ? hasWarnType(M.sender.id, M.from, 3) : Promise.resolve(false),
                    isReg ? hasWarnType(M.sender.id, M.from, 4) : Promise.resolve(false)
                ])

                const now = Date.now()

                if (banResult.banned) {
                    let banMsg = `🚫 *Command Restricted*\n\nYou are not allowed to use *${prefix}${cmd.name}* in this group.\n`
                    if (banResult.categories?.length > 0) {
                        banMsg += `📂 *Banned from category:* ${banResult.categories.join(', ')}\n`
                    }
                    if (banResult.reason) {
                        banMsg += `📝 *Reason:* ${banResult.reason}\n`
                    }
                    banMsg += `\n_Contact a group admin if you believe this is a mistake._`
                    return M.reply(banMsg)
                }

                if (isUnstable && Math.random() < 0.3) {
                    return M.reply('👻')
                }

                if (isThrottled) {
                    const throttleCD = 5000
                    const lastThrottleTime = _throttleMap.get(M.sender.id)
                    if (lastThrottleTime && now - lastThrottleTime < throttleCD) {
                        const rem = ((throttleCD - (now - lastThrottleTime)) / 1000).toFixed(1)
                        return M.reply(`⏳ *Throttle Active:* Type 4 Warning requires a 5s delay. Wait *${rem}s*.`)
                    }
                    _throttleMap.set(M.sender.id, now)
                }
            }

            const cdKey = `cooldown:${M.sender.id}:${cmd.name}:${M.from}`

            const [groupCooldownMs, lastUsed] = await Promise.all([
                getCommandCooldown(M.from, cmd.name),
                getState(cdKey)
            ])

            const now = Date.now()
            const cooldownMs = effectiveCooldown(cmd.name, groupCooldownMs)

            if (lastUsed != null && now - lastUsed < cooldownMs) {
                const remaining = cooldownMs - (now - lastUsed)
                const alertKey = `${M.sender.id}:${cmd.name}:${M.from}`
                const alertExpiry = _alertedKeys.get(alertKey)

                if (alertExpiry && now < alertExpiry) {
                    return
                } // already alerted

                _alertedKeys.set(alertKey, now + remaining)
                return M.reply(
                    `⏳ *Cooldown Active*\n\n` +
                        `*${prefix}${cmd.name}* is on cooldown.\n` +
                        `⏱️ Try again in *${(remaining / 1000).toFixed(1)}s*.\n\n` +
                        `_The bot won't respond until the cooldown ends._`
                )
            }

            _alertedKeys.delete(`${M.sender.id}:${cmd.name}:${M.from}`)
            await saveState(cdKey, now, cooldownMs)
        }

        if (cmd.isPrivate && M.chat !== 'dm') {
            return M.reply('❌ This command can only be used in private chat.')
        }
        if (cmd.isGroup && M.chat !== 'group') {
            return M.reply('❌ This command can only be used in groups.')
        }
        if (cmd.isDev && !global.config.mods.includes(M.sender.jid)) {
            return M.reply('🔒 Restricted to bot developers.')
        }
        if (cmd.isAdmin && !M.isAdmin && !M.isGroupOwner) {
            return M.reply('🚫 Only group admins can use this command.')
        }
        if (cmd.isBotAdmin && !M.isBotAdmin) {
            return M.reply('⚠️ The bot needs admin privileges.')
        }

        await cmd.run(client, M, parsedArgs)
    } catch (error) {
        console.error(error)
        M.reply('⚠️ An error occurred while executing the command.')
    } finally {
        handlePostProcess(M).catch((err) => console.error('[POST_PROCESS_ERROR]', err))
    }
}

export default async (client, M) => {
    const preResult = await preProcessMessage(client, M)

    if (preResult.shouldReturn) {
        return
    }

    enqueue(preResult.parsedArgs.cmd, M.from, async () => {
        await processMessageHandler(client, M, preResult)
    })
}

const handlePostProcess = async (M) => {
    if (M.chat === 'group' && M.sender?.id && M.from) {
        trackGroupActivity(M.from, M.sender.id, M.sender.name || M.sender.id.split('@')[0])
    }

    const [user, group] = await Promise.all([
        findUser(M.sender.id, 'exp name jid lid'),
        M.chat === 'group' ? findGroup(M.from) : null
    ])

    const tasks = []

    if (user) {
        let gainedXp = getRandomInt(1, 10)
        const [hasMoneyPotion, hasExpPotion] = await Promise.all([
            isPotionValid(M.sender.id, 'moneypotion'),
            isPotionValid(M.sender.id, 'exppotion')
        ])
        const oldRank = getRank(user.exp).name
        const newRank = getRank(user.exp + gainedXp).name

        if (hasExpPotion) {
            gainedXp += getRandomInt(1, 10)
        }
        if (hasMoneyPotion) {
            tasks.push(addToWallet(user.jid, getRandomInt(10, 100)))
        }

        tasks.push(addUserExp(user.jid, gainedXp))

        // ── Rank up notification ──────────────────────────────────────────────
        if (oldRank !== newRank) {
            tasks.push(
                (async () => {
                    const position = await getLeaderboardPosition(M.sender.id)
                    await M.reply(
                        `🎉 *Congratulations ${user.name || 'Player'}!*\n` +
                            `You ranked up: *${oldRank}* → *${newRank}*! 🏅\n\n` +
                            `📊 Leaderboard Rank: *#${position}*`
                    )
                })()
            )
        }

        if (group?.mmo && M.chat === 'group') {
            const xpKey = `grp:xp:${M.from}`
            const ticked = await getState(xpKey)

            if (!ticked) {
                await saveState(xpKey, true, 5 * 60 * 1000)

                tasks.push(
                    (async () => {
                        try {
                            const isForeign = await isForeignUser(M.sender.id)
                            await updateGroupExp(M.from, { isForeign })
                        } catch (err) {
                            console.error('[GROUP XP ERROR]', err)
                        }
                    })()
                )
            }
        }

        if (M.chat === 'group' && isSupportGroup(M.from)) {
            tasks.push(
                (async () => {
                    try {
                        const [, chalResult] = await Promise.all([
                            incrementUserStat(M.sender.id, 'supportMsgs', 1),
                            incrementChallengeProgress(M.sender.id, 'supportMsgs', 1)
                        ])
                        if (chalResult?.completed) {
                            await M.reply(
                                `🎯 *Challenge Complete!* You've finished the Support Chatter challenge!\n` +
                                    `Use *${global.config.prefix}claimchallenge* to collect your card reward!`
                            )
                        }
                    } catch (err) {
                        console.error('[POST_PROCESS: supportMsgs]', err)
                    }
                })()
            )
        }

        tasks.push(
            (async () => {
                try {
                    const liveResult = await checkLiveChallenge(M.sender.id, M.from)
                    if (liveResult?.completed) {
                        await M.reply(
                            `🎯 *Challenge Complete!* Your *${liveResult.challengeId.replace(/_/g, ' ')}* challenge is done!\n` +
                                `Use *${global.config.prefix}claimchallenge* to collect your card reward!`
                        )
                    }
                } catch (err) {
                    console.error('[POST_PROCESS: checkLiveChallenge]', err)
                }
            })()
        )
    }

    await Promise.all(tasks)
}

const handleGroupProtections = async (client, M) => {
    if (M.chat !== 'group' || !M.body) {
        return false
    }

    try {
        const group = await findGroup(M.from)

        // 1. Mute & Antitag Check
        if (!M.isAdmin) {
            const isMuted = group.mute?.includes(M.sender.id)
            const mentioned = M.mentioned || []
            const quoted = M.quotedMessage?.participant
            const hasAniTag =
                (quoted && group.anitag?.includes(quoted)) || mentioned.some((id) => group.anitag?.includes(id))

            if (isMuted || hasAniTag) {
                if (M.isBotAdmin) {
                    await M.delete().catch(() => {})
                }
                return true // Triggered: Tell the handler to IGNORE
            }
        }

        // 2. Link Protection
        if (M.isBotAdmin && !M.isAdmin && (await isGroupFeatureActive(M.from, 'moderation_tools'))) {
            const linkMatch = M.body.match(/chat\.whatsapp\.com\/(?:invite\/)?([\w\d]+)/)
            if (linkMatch) {
                const currentCode = await client.groupInviteCode(M.from).catch(() => null)
                if (currentCode && linkMatch[1] !== currentCode) {
                    await M.delete().catch(() => {})
                    await client.groupParticipantsUpdate(M.from, [M.sender.id], 'remove').catch(() => {})
                    await M.reply('❤️ *Successfully removed an intruder!!!!*')
                    return true // Triggered: Ignore the message/command
                }
            }
        }

        return false // Safe: No protection triggered
    } catch (err) {
        console.error('[GROUP_PROTECTION_ERROR]', err)
        return false
    }
}
