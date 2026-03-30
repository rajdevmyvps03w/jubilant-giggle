// src/functions/wcg.js

import { addToWallet, deleteState } from '../database/db.js'

// ─────────────────────────────────────────────────────────────────────────────
//  CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

// Base reward — multiplied per level reached
// easy → ₹3,000  |  medium → ₹5,000  |  hard → ₹8,000
export const LEVEL_REWARDS = {
    easy: 3000,
    medium: 5000,
    hard: 8000
}

export const MODES = {
    easy: { timeLimit: 55, minLength: 3 },
    medium: { timeLimit: 45, minLength: 5 },
    hard: { timeLimit: 35, minLength: 7 }
}

const MODE_ORDER = ['easy', 'medium', 'hard']

// Next mode after an elimination (hard stays hard)
const nextMode = (current) => {
    const idx = MODE_ORDER.indexOf(current)
    return MODE_ORDER[Math.min(idx + 1, MODE_ORDER.length - 1)]
}

// ─────────────────────────────────────────────────────────────────────────────
//  IN-MEMORY GAME STORE  — exported so the command plugin can use it
//
//  groupJid → {
//    startMode:      string       original mode the game was started with
//    currentMode:    string       current mode (upgrades on elimination)
//    phase:          string       'joining'|'running'|'ended'
//    joinedPlayers:  Set<string>
//    game:           object|null  createWcgGame() result
//    joinTimers:     Timeout[]
//  }
// ─────────────────────────────────────────────────────────────────────────────

export const _games = new Map()

// ─────────────────────────────────────────────────────────────────────────────
//  WORD VALIDATION  (Datamuse API)
// ─────────────────────────────────────────────────────────────────────────────

const isRealWord = async (word, minLength) => {
    if (word.length < minLength) {
        return false
    }
    try {
        const res = await fetch(`https://api.datamuse.com/words?sp=${word}&max=1`)
        const data = await res.json()
        return Array.isArray(data) && data.length > 0 && data[0].word === word
    } catch {
        return true // fail open — network error shouldn't eliminate a player
    }
}

// ─────────────────────────────────────────────────────────────────────────────
//  createWcgGame(initialMode)
//
//  Factory function — all state is private in the closure.
//
//  playWord() now returns an object:
//    { msg, eliminated: jid|null, gameOver: bool }
//  so the handler can decide whether to level up the game.
//
//  upgradeMode(newMode) — called by the handler after an elimination
//  to tighten the time limit and min word length for surviving players.
// ─────────────────────────────────────────────────────────────────────────────

export const createWcgGame = (initialMode) => {
    let _mode = initialMode
    let _timeLimit = MODES[initialMode].timeLimit
    let _minLength = MODES[initialMode].minLength
    let _currentWord = ''
    let _usedWords = new Set()
    let _isOver = false
    let _players = []
    let _currentIndex = 0
    let _timeoutId = null

    const _active = () => _players.filter((p) => p.isActive)

    const _clearTimer = () => {
        if (_timeoutId) {
            clearTimeout(_timeoutId)
            _timeoutId = null
        }
    }

    const _advanceTurn = () => {
        const len = _players.length
        do {
            _currentIndex = (_currentIndex + 1) % len
        } while (!_players[_currentIndex].isActive && _active().length > 0)
    }

    const _removePlayer = () => {
        _players[_currentIndex].isActive = false
        if (_active().length === 0) {
            _isOver = true
        } else {
            _advanceTurn()
        }
    }

    const _turnPrompt = () => {
        const active = _active()
        if (active.length === 0) {
            return '💀 Game over! No players left.'
        }
        const next = _players[_currentIndex].name
        const nextLetter = _currentWord ? _currentWord.slice(-1).toUpperCase() : 'any letter'
        return (
            `@${next.split('@')[0]}'s turn!\n` +
            `📝 Word must be *${_minLength}+ letters* and start with *"${nextLetter}"*\n` +
            `⏳ *${_timeLimit} seconds*`
        )
    }

    // ── Public ────────────────────────────────────────────────────────────────

    const startGame = (playerNames) => {
        _players = playerNames.map((name) => ({ name, score: 0, isActive: true }))
        _currentIndex = 0
        const list = _players.map((p) => `@${p.name.split('@')[0]}`).join('\n')
        return `✅ *Game Started!*\n\n👥 *Players:*\n${list}\n\n${_turnPrompt()}`
    }

    // Returns { msg, eliminated, gameOver }
    // eliminated = jid of the player that was eliminated, or null if valid move
    const playWord = async (word) => {
        if (_isOver || _active().length < 1) {
            _isOver = true
            return { msg: `💀 *Game over!* No players left.`, eliminated: null, gameOver: true }
        }

        _clearTimer()
        word = word.toLowerCase().trim()
        const player = _players[_currentIndex]

        // 1. Real word + min length
        if (!(await isRealWord(word, _minLength))) {
            _removePlayer()
            return {
                msg: `❌ *"${word}"* is not a valid word or is too short (min *${_minLength}* letters).\n\n💀 @${player.name.split('@')[0]} is eliminated!`,
                eliminated: player.name,
                gameOver: _isOver
            }
        }

        // 2. Already used
        if (_usedWords.has(word)) {
            _removePlayer()
            return {
                msg: `❌ *"${word}"* has already been used!\n\n💀 @${player.name.split('@')[0]} is eliminated!`,
                eliminated: player.name,
                gameOver: _isOver
            }
        }

        // 3. Must start with last letter of previous word
        if (_currentWord && _currentWord.slice(-1) !== word[0]) {
            const needed = _currentWord.slice(-1).toUpperCase()
            _removePlayer()
            return {
                msg: `❌ *"${word}"* must start with *"${needed}"*!\n\n💀 @${player.name.split('@')[0]} is eliminated!`,
                eliminated: player.name,
                gameOver: _isOver
            }
        }

        // ── Valid move ─────────────────────────────────────────────────────────
        _usedWords.add(word)
        _currentWord = word
        player.score += word.length
        _advanceTurn()

        return {
            msg: `✅ *"${word}"* ✔️`,
            eliminated: null,
            gameOver: false
        }
    }

    // upgradeMode — called by the handler after an elimination when >2 players remain
    const upgradeMode = (newMode) => {
        _mode = newMode
        _timeLimit = MODES[newMode].timeLimit
        _minLength = MODES[newMode].minLength
    }

    // onTimeout(eliminatedJid, gameOver, activePlayers)
    const startTurnTimer = (onTimeout) => {
        _clearTimer()
        _timeoutId = setTimeout(() => {
            const player = _players[_currentIndex]
            _removePlayer()
            onTimeout(player.name, _isOver, _active())
        }, _timeLimit * 1000)
    }

    const stopTimer = () => _clearTimer()
    const getCurrentPlayerJid = () => _players[_currentIndex]?.name ?? null
    const getActivePlayers = () => _active()
    const isOver = () => _isOver
    const getMode = () => _mode
    const getTurnPrompt = () => _turnPrompt()

    const statusText = () => {
        const active = _active()
        if (active.length === 0) {
            return '💀 Game over! No players left.'
        }
        if (active.length === 1) {
            return `🏆 *@${active[0].name.split('@')[0]} is the last survivor!*\n` + `Score: *${active[0].score}*`
        }
        return `👥 *${active.length} active players*\n\n${_turnPrompt()}`
    }

    const scoreboard = () =>
        _players
            .map((p, i) => `${i + 1}. @${p.name.split('@')[0]} — ${p.score} pts ${p.isActive ? '✅' : '❌'}`)
            .join('\n')

    return {
        startGame,
        playWord,
        upgradeMode,
        startTurnTimer,
        stopTimer,
        getCurrentPlayerJid,
        getActivePlayers,
        isOver,
        getMode,
        getTurnPrompt,
        statusText,
        scoreboard,
        get currentWord() {
            return _currentWord
        },
        get players() {
            return _players
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
//  endWcgGame
// ─────────────────────────────────────────────────────────────────────────────

export const endWcgGame = async (client, groupJid, winnerJid) => {
    const state = _games.get(groupJid)
    if (state) {
        state.game?.stopTimer()
        state.joinTimers?.forEach((t) => clearTimeout(t))
        state.phase = 'ended'
    }
    _games.delete(groupJid)
    await deleteState(`wcg:${groupJid}`)
    if (winnerJid) {
        const reward = LEVEL_REWARDS[state?.currentMode ?? 'easy']
        await addToWallet(winnerJid, reward).catch(() => {})
    }
}

// ─────────────────────────────────────────────────────────────────────────────
//  _handleElimination
//  Central logic called after every elimination (timeout or bad word).
//  Decides: game over, level up, or just continue.
// ─────────────────────────────────────────────────────────────────────────────

const _handleElimination = async (client, groupJid, eliminatedJid, gameOverFlag) => {
    const state = _games.get(groupJid)
    if (!state) {
        return
    }

    const active = state.game.getActivePlayers()
    const allJids = state.game.players.map((p) => p.name)
    const reward = LEVEL_REWARDS[state.currentMode]

    // ── Game over: 0 survivors ─────────────────────────────────────────────────
    if (gameOverFlag || active.length === 0) {
        await client.sendMessage(groupJid, {
            text: `💀 *Everyone has been eliminated! No winner.*`,
            mentions: allJids
        })
        await endWcgGame(client, groupJid, null)
        return
    }

    // ── Only 1 survivor — they win ─────────────────────────────────────────────
    if (active.length === 1) {
        const winner = active[0].name
        const finalReward = LEVEL_REWARDS[state.currentMode]
        await client.sendMessage(groupJid, {
            text:
                `🏆 *@${winner.split('@')[0]} is the last one standing!*\n\n` +
                `📊 *Final score:* ${active[0].score} pts\n` +
                `💰 *+₹${finalReward.toLocaleString()}* added to wallet!\n\n` +
                `🎉 Thanks everyone for playing!`,
            mentions: allJids
        })
        await endWcgGame(client, groupJid, winner)
        return
    }

    // ── 2+ survivors — level up if possible ────────────────────────────────────
    const oldMode = state.currentMode
    const newMode = nextMode(oldMode)
    const upgraded = newMode !== oldMode

    if (upgraded) {
        state.currentMode = newMode
        state.game.upgradeMode(newMode)
    }

    const newReward = LEVEL_REWARDS[state.currentMode]
    const modeEmoji = { easy: '🟢', medium: '🟡', hard: '🔴' }[state.currentMode]

    const remainingList = active.map((p) => `• @${p.name.split('@')[0]}`).join('\n')

    let continuationMsg =
        `⚠️ *@${eliminatedJid.split('@')[0]} has been eliminated!*\n` +
        `_We will be continuing without them._\n\n` +
        `👥 *Remaining players (${active.length}):*\n${remainingList}\n\n`

    if (upgraded) {
        continuationMsg +=
            `📈 *Level Up!* ${modeEmoji}\n` +
            `Mode: *${oldMode.toUpperCase()}* → *${newMode.toUpperCase()}*\n` +
            `• Min word length: *${MODES[newMode].minLength}+ letters*\n` +
            `• Time per turn: *${MODES[newMode].timeLimit} seconds*\n` +
            `• Win reward: *₹${newReward.toLocaleString()}*\n\n`
    }

    continuationMsg += state.game.getTurnPrompt()

    await client.sendMessage(groupJid, { text: continuationMsg, mentions: allJids })

    startNextTurnTimer(client, groupJid)
}

// ─────────────────────────────────────────────────────────────────────────────
//  startNextTurnTimer
// ─────────────────────────────────────────────────────────────────────────────

export const startNextTurnTimer = (client, groupJid) => {
    const state = _games.get(groupJid)
    if (!state || state.phase !== 'running' || !state.game) {
        return
    }

    state.game.startTurnTimer(async (eliminatedJid, gameOver, activePlayers) => {
        if (!_games.has(groupJid)) {
            return
        } // manually ended while timer ran
        await _handleElimination(client, groupJid, eliminatedJid, gameOver)
    })
}

export const handleWcgMessage = async (client, M) => {
    const state = _games.get(M.from)
    if (!state || state.phase === 'ended') {
        return false
    }

    const text = M.body?.trim()
    const sender = M.sender.id
    if (!text || !sender) {
        return false
    }

    // ── JOIN PHASE ────────────────────────────────────────────────────────────
    if (state.phase === 'joining') {
        if (text.toLowerCase() !== 'join') {
            return false
        }

        if (state.joinedPlayers.has(sender)) {
            await M.reply(`⚠️ You have already joined!`)
            return true
        }

        state.joinedPlayers.add(sender)
        await M.reply(
            `✅ *@${sender.split('@')[0]} has joined!*\n` + `👥 ${state.joinedPlayers.size} player(s) so far`,
            'text',
            undefined,
            undefined,
            [sender]
        )
        return true
    }

    // ── RUNNING PHASE ─────────────────────────────────────────────────────────
    if (state.phase !== 'running' || !state.game) {
        return false
    }

    if (!state.joinedPlayers.has(sender)) {
        return false
    }
    if (text.trim().split(/\s+/).length !== 1) {
        return false
    }
    if (sender !== state.game.getCurrentPlayerJid()) {
        return false
    }

    // Player responded — stop the turn timer
    state.game.stopTimer()

    const allJids = state.game.players.map((p) => p.name)
    const { msg, eliminated, gameOver } = await state.game.playWord(text)

    if (eliminated) {
        // Send the bad-word/timeout message first
        await client.sendMessage(M.from, { text: msg, mentions: allJids })
        // Then handle the elimination (level up / win / continue)
        await _handleElimination(client, M.from, eliminated, gameOver)
        return true
    }

    // Valid word — just confirm it and prompt next player
    const active = state.game.getActivePlayers()
    await client.sendMessage(M.from, {
        text: `${msg}\n\n${state.game.getTurnPrompt()}`,
        mentions: allJids
    })

    startNextTurnTimer(client, M.from)
    return true
}
