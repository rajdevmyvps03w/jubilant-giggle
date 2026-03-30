// src/plugins/game/wcg.js

import { plugin } from '../../utils/plugin.js'
import { saveState } from '../../database/db.js'
import { _games, createWcgGame, endWcgGame, startNextTurnTimer, MODES, LEVEL_REWARDS } from '../../functions/wcg.js'

plugin(
    {
        name: 'wcg',
        aliases: ['wordchain', 'wordgame'],
        category: 'game',
        isGroup: true,
        description: {
            content: 'Start a Word Chain Game. Each word must start with the last letter of the previous one.',
            usage: '<easy|medium|hard|end|status>',
            example: 'easy'
        }
    },
    async (client, M, { args }) => {
        try {
            const p = global.config.prefix
            const sub = args[0]?.toLowerCase()

            // ── NO ARG — help ─────────────────────────────────────────────────
            if (!sub) {
                return M.reply(
                    `🔤 *Word Chain Game*\n\n` +
                        `Each player says a word that starts with the *last letter* of the previous word.\n\n` +
                        `❌ Wrong word, wrong starting letter, repeated or too short → *eliminated* 💀\n` +
                        `⏰ Run out of time → *eliminated*\n\n` +
                        `*When a player is eliminated (3+ players):*\n` +
                        `• Game *levels up* — harder rules, bigger reward!\n` +
                        `• The game continues without them\n\n` +
                        `*When only 2 players remain and one loses:*\n` +
                        `• The survivor *wins immediately*\n\n` +
                        `*Modes & Rewards:*\n` +
                        `┌ 🟢 *easy*   — 3+ letters, 55s/turn → ₹${LEVEL_REWARDS.easy.toLocaleString()}\n` +
                        `├ 🟡 *medium* — 5+ letters, 45s/turn → ₹${LEVEL_REWARDS.medium.toLocaleString()}\n` +
                        `└ 🔴 *hard*   — 7+ letters, 35s/turn → ₹${LEVEL_REWARDS.hard.toLocaleString()}\n\n` +
                        `*Commands:*\n` +
                        `▸ \`${p}wcg easy\` — start a game\n` +
                        `▸ \`${p}wcg end\` — cancel game (admin only)\n` +
                        `▸ \`${p}wcg status\` — check current game\n\n` +
                        `_During join phase: type_ *join* _to enter_\n` +
                        `_During the game: just type your word when it's your turn_`
                )
            }

            // ── STATUS ────────────────────────────────────────────────────────
            if (sub === 'status') {
                const state = _games.get(M.from)
                if (!state) {
                    return M.reply(`❌ No active Word Chain Game here.\n\nStart one with *${p}wcg easy*`)
                }

                if (state.phase === 'joining') {
                    const list =
                        state.joinedPlayers.size > 0
                            ? [...state.joinedPlayers].map((j) => `• @${j.split('@')[0]}`).join('\n')
                            : '_Nobody yet_'
                    return M.reply(
                        `⏳ *Joining phase* — ${state.joinedPlayers.size} player(s)\n\n` +
                            `${list}\n\nType *join* to enter!`
                    )
                }

                if (state.game) {
                    const modeEmoji = { easy: '🟢', medium: '🟡', hard: '🔴' }[state.currentMode]
                    const allJids = state.game.players.map((p) => p.name)
                    return M.reply(
                        `🔤 *WCG — ${modeEmoji} ${state.currentMode.toUpperCase()}*\n` +
                            `_(started as ${state.startMode.toUpperCase()})_\n\n` +
                            `📝 *Last word:* ${state.game.currentWord || '_none yet_'}\n` +
                            `🔡 *Next letter:* ${state.game.currentWord?.slice(-1).toUpperCase() || '?'}\n` +
                            `💰 *Current reward:* ₹${LEVEL_REWARDS[state.currentMode].toLocaleString()}\n\n` +
                            `📊 *Scoreboard:*\n${state.game.scoreboard()}\n\n` +
                            state.game.statusText(),
                        'text',
                        undefined,
                        undefined,
                        allJids
                    )
                }

                return M.reply(`⚠️ Game in inconsistent state. Use *${p}wcg end* to reset.`)
            }

            // ── END ───────────────────────────────────────────────────────────
            if (sub === 'end') {
                if (!global.config.mods.includes(M.sender.id) && !M.isAdmin) {
                    return M.reply(`❌ Only group admins or developers can end the game.`)
                }
                if (!_games.has(M.from)) {
                    return M.reply(`❌ No active Word Chain Game to end.`)
                }
                await endWcgGame(client, M.from, null)
                return M.reply(
                    `🛑 *Word Chain Game cancelled* by @${M.sender.id.split('@')[0]}.`,
                    'text',
                    undefined,
                    undefined,
                    [M.sender.id]
                )
            }

            // ── INVALID ───────────────────────────────────────────────────────
            if (!MODES[sub]) {
                return M.reply(
                    `❌ Unknown option *"${sub}"*.\n\n` +
                        `Choose: *easy*, *medium*, *hard*, *status*, *end*\n` +
                        `Example: *${p}wcg easy*`
                )
            }

            // ── ALREADY RUNNING ───────────────────────────────────────────────
            if (_games.has(M.from)) {
                return M.reply(
                    `⚠️ A Word Chain Game is already running!\n\n` +
                        `▸ *${p}wcg status* — check it\n` +
                        `▸ *${p}wcg end* — cancel it (admin only)`
                )
            }

            // ── START ─────────────────────────────────────────────────────────
            const mode = sub
            const state = {
                startMode: mode, // original mode — never changes
                currentMode: mode, // current mode — upgrades on eliminations
                phase: 'joining',
                joinedPlayers: new Set(),
                game: null,
                joinTimers: []
            }
            _games.set(M.from, state)
            await saveState(`wcg:${M.from}`, { mode, phase: 'joining' })

            const modeEmoji = { easy: '🟢', medium: '🟡', hard: '🔴' }[mode]

            await M.reply(
                `🔤 *Word Chain Game — ${modeEmoji} ${mode.toUpperCase()} mode!*\n\n` +
                    `📋 Min word length: *${MODES[mode].minLength}+ letters*\n` +
                    `⏱️ Time per turn: *${MODES[mode].timeLimit} seconds*\n` +
                    `💰 Starting reward: *₹${LEVEL_REWARDS[mode].toLocaleString()}*\n` +
                    (mode !== 'hard' ? `📈 _Reward increases as players are eliminated!_\n` : '') +
                    `\nType *join* to join!\n` +
                    `⏳ *30 seconds to join...*`
            )

            // ── Countdown ─────────────────────────────────────────────────────
            state.joinTimers.push(
                setTimeout(() => {
                    if (_games.get(M.from)?.phase === 'joining') {
                        client.sendMessage(M.from, { text: `⏳ *20 seconds left* to join! Type *join*` })
                    }
                }, 10000),

                setTimeout(() => {
                    if (_games.get(M.from)?.phase === 'joining') {
                        client.sendMessage(M.from, { text: `⏳ *10 seconds left!*` })
                    }
                }, 20000),

                // ── Start game ────────────────────────────────────────────────
                setTimeout(async () => {
                    const s = _games.get(M.from)
                    if (!s || s.phase !== 'joining') {
                        return
                    }

                    if (s.joinedPlayers.size === 0) {
                        await client.sendMessage(M.from, {
                            text: `❌ *Nobody joined.* Word Chain Game cancelled.`
                        })
                        await endWcgGame(client, M.from, null)
                        return
                    }

                    if (s.joinedPlayers.size === 1) {
                        await client.sendMessage(M.from, {
                            text: `❌ *Only 1 player joined.* Need at least 2. Game cancelled.`
                        })
                        await endWcgGame(client, M.from, null)
                        return
                    }

                    const playerNames = [...s.joinedPlayers].sort(() => Math.random() - 0.5)
                    s.phase = 'running'
                    s.game = createWcgGame(mode)

                    await saveState(`wcg:${M.from}`, { mode, phase: 'running' })

                    const startMsg = s.game.startGame(playerNames)

                    await client.sendMessage(M.from, {
                        text:
                            `*━━━━━━━━━━━━━━━━━━*\n` +
                            `🔤 *WORD CHAIN — ${modeEmoji} ${mode.toUpperCase()} — START!*\n` +
                            `*━━━━━━━━━━━━━━━━━━*\n\n` +
                            startMsg +
                            `\n\n📌 *Rules:*\n` +
                            `• Each word starts with the last letter of the previous\n` +
                            `• Min *${MODES[mode].minLength}* letters per word\n` +
                            `• First word can start with *any letter*\n` +
                            (playerNames.length > 2
                                ? `• Eliminations *level up* the difficulty & reward!`
                                : `• First to make the other lose wins!`),
                        mentions: playerNames
                    })

                    startNextTurnTimer(client, M.from)
                }, 30000)
            )
        } catch (err) {
            console.error('[WCG ERROR]', err)
            return M.reply('❌ An error occurred. Please try again.')
        }
    }
)
