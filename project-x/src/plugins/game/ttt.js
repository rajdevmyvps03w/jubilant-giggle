// src/plugins/game/ttt.js  — FULL PATCHED VERSION
// Changes from original:
//   • Imports incrementChallengeProgress from db.js
//   • When a real (non-bot) player wins the full match, fires tttWins increment
//   • Notifies the winner if their challenge just completed

import { plugin } from '../../utils/plugin.js'
import nodeHtmlToImage from 'node-html-to-image'
import {
    addToWallet,
    findUser,
    removeFromWallet,
    saveState,
    getState,
    deleteState,
    incrementChallengeProgress
} from '../../database/db.js'

const winPatterns = [
    [0, 1, 2, 'h', 0],
    [3, 4, 5, 'h', 1],
    [6, 7, 8, 'h', 2],
    [0, 3, 6, 'v', 0],
    [1, 4, 7, 'v', 1],
    [2, 5, 8, 'v', 2],
    [0, 4, 8, 'd', 0],
    [2, 4, 6, 'd', 1]
]

const getWin = (board) => {
    for (const [a, b, c, type, pos] of winPatterns) {
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return { type, pos }
        }
    }
    return null
}

const generateBoard = async (boardArray) => {
    const CELL = 110
    const GAP = 12
    const PADDING = 10
    const STEP = CELL + GAP
    const BOARD_SIZE = CELL * 3 + GAP * 2
    const CENTER_OFFSET = CELL / 2
    const LINE_THICK = 8

    const win = getWin(boardArray)

    const cellsHTML = boardArray
        .map((cell) => {
            const content =
                cell === 'X' ? '<span class="x-text">X</span>' : cell === 'O' ? '<span class="o-text">0</span>' : ''
            return `<div class="cell">${content}</div>`
        })
        .join('')

    let winLineHTML = ''
    if (win) {
        let style = `height: ${LINE_THICK}px; border-radius: 10px;`
        if (win.type === 'h') {
            style += `width: ${BOARD_SIZE}px; left: ${PADDING}px; top: ${PADDING + win.pos * STEP + CENTER_OFFSET - LINE_THICK / 2}px;`
        } else if (win.type === 'v') {
            style += `width: ${LINE_THICK}px; height: ${BOARD_SIZE}px; top: ${PADDING}px; left: ${PADDING + win.pos * STEP + CENTER_OFFSET - LINE_THICK / 2}px;`
        } else if (win.type === 'd') {
            const DIAG = Math.sqrt(Math.pow(BOARD_SIZE, 2) + Math.pow(BOARD_SIZE, 2))
            style += `width: ${DIAG}px; transform-origin: top left;`
            const offset = (LINE_THICK / 2) * Math.sin(Math.PI / 4)
            if (win.pos === 0) {
                style += `top: ${PADDING}px; left: ${PADDING}px; transform: translate(${offset}px, -${offset}px) rotate(45deg);`
            } else {
                style += `top: ${PADDING}px; left: ${PADDING + BOARD_SIZE}px; transform: translate(${offset}px, ${offset}px) rotate(135deg);`
            }
        }
        winLineHTML = `<div class="win-line" style="${style}"></div>`
    }

    return await nodeHtmlToImage({
        transparent: false,
        puppeteerArgs:
            process.env.PREFIX?.includes('com.termux') ||
            process.env.HOME?.includes('/data/data/com.termux') ||
            process.platform === 'android'
                ? {
                      executablePath: '/data/data/com.termux/files/home/chrome',
                      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
                  }
                : { args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'] },
        content: { cellsHTML, winLineHTML },
        html: `
            <html>
                <head>
                    <style>
                        body { width: ${BOARD_SIZE + PADDING * 2}px; height: ${BOARD_SIZE + PADDING * 2}px; background: #0f111a; margin: 0; display: flex; align-items: center; justify-content: center; font-family: 'Courier New', Courier, monospace; }
                        #board { position: relative; display: grid; grid-template-columns: repeat(3, 110px); gap: 12px; padding: 10px; }
                        .cell { width: 110px; height: 110px; background: #1a1d29; display: flex; align-items: center; justify-content: center; font-size: 60px; font-weight: bold; border-radius: 12px; border: 1px solid #2e3440; box-sizing: border-box; }
                        .x-text { color: #ff4757; text-shadow: 0 0 10px rgba(255,71,87,0.4); }
                        .o-text { color: #2ed573; text-shadow: 0 0 10px rgba(46,213,115,0.4); }
                        .win-line { position: absolute; background: #ffd32a; box-shadow: 0 0 15px #ffd32a; z-index: 10; }
                    </style>
                </head>
                <body><div id="board">{{{cellsHTML}}}{{{winLineHTML}}}</div></body>
            </html>
        `
    })
}

const wins = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6]
]
const checkWinner = (board, sym) => wins.some(([a, b, c]) => board[a] === sym && board[b] === sym && board[c] === sym)
const isDraw = (board) => board.every((v) => v !== '')

const minimax = (board, depth, isMax) => {
    if (checkWinner(board, 'O')) return 10 - depth
    if (checkWinner(board, 'X')) return depth - 10
    if (isDraw(board)) return 0
    let best = isMax ? -Infinity : Infinity
    for (let i = 0; i < 9; i++) {
        if (!board[i]) {
            board[i] = isMax ? 'O' : 'X'
            const score = minimax(board, depth + 1, !isMax)
            board[i] = ''
            best = isMax ? Math.max(best, score) : Math.min(best, score)
        }
    }
    return best
}

const getBestMove = (board) => {
    let bestVal = -Infinity,
        move = -1
    for (let i = 0; i < 9; i++) {
        if (!board[i]) {
            board[i] = 'O'
            const val = minimax(board, 0, false)
            board[i] = ''
            if (val > bestVal) {
                bestVal = val
                move = i
            }
        }
    }
    return move
}

const cells = ['a1', 'a2', 'a3', 'b1', 'b2', 'b3', 'c1', 'c2', 'c3']

// ── Helper: is this JID the bot? ─────────────────────────────────────────────
const isBot = (client, jid) => {
    const botLid = client.user?.lid?.split(':')[0] + '@lid'
    const botJid = client.user?.id?.split(':')[0] + '@s.whatsapp.net'
    return jid === botLid || jid === botJid
}

plugin(
    {
        name: 'tictactoe',
        aliases: ['ttt'],
        category: 'game',
        description: {
            usage: 'challenge <mention | reply> <bet> | accept | mark <cell> | forfeit',
            content: 'Play Tic-Tac-Toe with betting. The match lasts 5 rounds and the final winner receives the bet.',
            example: 'challenge @user 1000 | mark a1'
        }
    },
    async (client, M, { args }) => {
        try {
            const gameKey = `ttt_game_${M.from}`
            const challengeKey = `ttt_chall_${M.from}`

            /* ---------- MENU ---------- */
            if (!args[0]) {
                return M.reply(
                    `🎮 *TIC TAC TOE MATCH*\n\nStart a competitive Tic‑Tac‑Toe match and wager coins against another player or the bot.\n\n*Commands*\n${global.config.prefix}ttt challenge @user 100\n${global.config.prefix}ttt accept\n${global.config.prefix}ttt mark a1\n${global.config.prefix}ttt forfeit\n\n*Board Positions*\na1 a2 a3\nb1 b2 b3\nc1 c2 c3`
                )
            }

            /* ---------- CHALLENGE ---------- */
            if (['challenge', 'c'].includes(args[0])) {
                const existingGame = await getState(gameKey)
                if (existingGame) {
                    return M.reply(
                        '⚠️ A Tic‑Tac‑Toe match is already active in this chat. Finish it before starting a new one.'
                    )
                }

                const opponent =
                    (M.mentioned?.[0] ?? (M.isQuoted ? M.quotedMessage?.participant : null)) &&
                    !(
                        M.isQuoted &&
                        M.sender.id !== M.quotedMessage.participant &&
                        M.sender.jid !== M.quotedMessage.participant
                    )
                        ? (M.mentioned?.[0] ?? M.quotedMessage?.participant)
                        : null
                if (!opponent) return M.reply('❌ You must mention a valid player to start a challenge.')

                const bet = Math.abs(parseInt(args[1] || args[2]))
                if (isNaN(bet) || bet <= 0) {
                    return M.reply(`❌ Invalid bet amount. Example: ${global.config.prefix}ttt challenge @user 100`)
                }

                const user1 = await findUser(M.sender.id)
                const user2 = await findUser(opponent)

                if (!M.isBotMentioned && !user2) {
                    return M.reply('❌ Opponent is not registered in the economy system.')
                }
                if (user1.wallet - bet < 0) return M.reply('💰 You do not have enough coins to place this bet.')
                if (!M.isBotMentioned && user2.wallet - bet < 0) {
                    return M.reply('💰 The opponent does not have enough coins to accept this bet.')
                }

                if (isBot(client, opponent)) {
                    const gameData = {
                        players: [M.sender.id, opponent],
                        bet,
                        vsBot: true,
                        board: Array(9).fill(''),
                        turn: M.sender.id,
                        round: 1,
                        score: { [M.sender.id]: 0, [opponent]: 0 }
                    }
                    await removeFromWallet(M.sender.id, bet)
                    await saveState(gameKey, gameData)
                    const img = await generateBoard(gameData.board)
                    return M.replyRaw({
                        image: img,
                        caption: `🎮 *Match Started (vs Bot)*\n\nTotal Pot: 💰 ${bet * 2}\nRounds: Best of 5\n\nFirst Turn: @${M.sender.id.split('@')[0]} (❌)`,
                        mentions: [M.sender.id]
                    })
                }

                await saveState(challengeKey, {
                    challenger: M.sender.id,
                    challengee: opponent,
                    bet
                })
                return M.reply(
                    `⚔️ *TTT Challenge Sent!*\n\n@${M.sender.id.split('@')[0]} has challenged @${opponent.split('@')[0]} for ₹${bet.toLocaleString()}!\n\nOpponent: type *${global.config.prefix}ttt accept* to begin.`,
                    'text',
                    null,
                    null,
                    [M.sender.id, opponent]
                )
            }

            /* ---------- ACCEPT ---------- */
            if (args[0] === 'accept') {
                const ch = await getState(challengeKey)
                if (!ch || M.sender.id !== ch.challengee) {
                    return M.reply('❌ You do not have any pending Tic‑Tac‑Toe challenge to accept.')
                }

                await removeFromWallet(ch.challenger, ch.bet)
                await removeFromWallet(ch.challengee, ch.bet)

                const gameData = {
                    players: [ch.challenger, ch.challengee],
                    bet: ch.bet,
                    vsBot: false,
                    board: Array(9).fill(''),
                    turn: ch.challenger,
                    round: 1,
                    score: { [ch.challenger]: 0, [ch.challengee]: 0 }
                }

                await saveState(gameKey, gameData)
                await deleteState(challengeKey)

                const img = await generateBoard(gameData.board)
                return M.replyRaw({
                    image: img,
                    caption: `🎮 *Match Started*\n\nTotal Pot: 💰 ${ch.bet * 2}\nRounds: Best of 5\n\nFirst Turn: @${ch.challenger.split('@')[0]} (❌)`,
                    mentions: [ch.challenger]
                })
            }

            /* ---------- MARK ---------- */
            if (args[0] === 'mark') {
                const game = await getState(gameKey)
                if (!game || game.turn !== M.sender.id) {
                    return M.reply('⏳ It is not your turn right now. Wait for your move.')
                }

                const cellIdx = cells.indexOf(args[1]?.toLowerCase())
                if (cellIdx === -1 || game.board[cellIdx]) {
                    return M.reply('❌ Invalid board position or that cell is already occupied.')
                }

                // FIX: determine symbol by player index, not hardcoded to 'X'
                // players[0] is always X, players[1] is always O — same for every round
                const currentSym = M.sender.id === game.players[0] ? 'X' : 'O'
                game.board[cellIdx] = currentSym
                let winnerSym = checkWinner(game.board, currentSym) ? currentSym : null

                if (!winnerSym && !isDraw(game.board) && game.vsBot) {
                    const bMove = getBestMove(game.board)
                    if (bMove !== -1) game.board[bMove] = 'O'
                    if (checkWinner(game.board, 'O')) winnerSym = 'O'
                } else if (!winnerSym && !isDraw(game.board)) {
                    game.turn = game.players.find((p) => p !== M.sender.id)
                }

                const currentBoardImg = await generateBoard(game.board)
                const isGameOver = winnerSym || isDraw(game.board)

                /* ---------- ROUND END ---------- */
                if (isGameOver) {
                    if (winnerSym) {
                        const roundWinner = winnerSym === 'X' ? game.players[0] : game.players[1]
                        game.score[roundWinner]++
                    }

                    await M.replyRaw({
                        image: currentBoardImg,
                        caption: winnerSym
                            ? `🏆 *Round ${game.round} Complete*\n@${(winnerSym === 'X' ? game.players[0] : game.players[1]).split('@')[0]} wins this round.`
                            : `🤝 *Round ${game.round} Draw*\nNo winner this round.`,
                        mentions: game.players
                    })

                    /* ---------- FINAL RESULT ---------- */
                    if (game.round >= 5) {
                        const [p1, p2] = game.players
                        let caption = `🏁 *Final Match Result*\n\nScore:\n${game.score[p1]}  —  ${game.score[p2]}\n\nTotal Pot: 💰 ${game.bet * 2}\n`

                        let matchWinnerJid = null

                        if (game.score[p1] > game.score[p2]) {
                            await addToWallet(p1, game.bet * 2)
                            caption += `🏆 Winner: @${p1.split('@')[0]}`
                            matchWinnerJid = p1
                        } else if (game.score[p2] > game.score[p1]) {
                            if (!isBot(client, p2)) await addToWallet(p2, game.bet * 2)
                            caption += `🏆 Winner: @${p2.split('@')[0]}`
                            matchWinnerJid = p2
                        } else {
                            await addToWallet(p1, game.bet)
                            if (!isBot(client, p2)) await addToWallet(p2, game.bet)
                            caption += `🤝 The match ended in a draw. Bets have been refunded.`
                        }

                        await deleteState(gameKey)

                        // ── CHALLENGE: ttt_wins — only counts vs real players ──
                        if (matchWinnerJid && !isBot(client, matchWinnerJid) && !game.vsBot) {
                            try {
                                const chalResult = await incrementChallengeProgress(matchWinnerJid, 'tttWins', 1)
                                if (chalResult?.completed) {
                                    caption += `\n\n🎯 *Challenge Complete!* @${matchWinnerJid.split('@')[0]} finished the TTT challenge!\nUse *${global.config.prefix}claimchallenge* to collect your card!`
                                }
                            } catch (chalErr) {
                                console.error('[TTT] Challenge increment error:', chalErr)
                                // non-fatal — don't block the match result
                            }
                        }

                        return M.reply(caption, 'text', null, null, game.players)
                    }

                    /* ---------- NEXT ROUND ---------- */
                    game.round++
                    game.board = Array(9).fill('')
                    // FIX: alternate who starts each round (odd rounds = players[0], even = players[1])
                    game.turn = game.players[(game.round - 1) % 2]
                    await saveState(gameKey, game)

                    // Show correct symbol for whoever starts this round
                    const nextSym = game.turn === game.players[0] ? '❌' : '⭕'
                    const freshBoardImg = await generateBoard(game.board)
                    return M.replyRaw({
                        image: freshBoardImg,
                        caption: `📊 *Current Score*\n\n@${game.players[0].split('@')[0]}: ${game.score[game.players[0]]}\n@${game.players[1].split('@')[0]}: ${game.score[game.players[1]]}\n\n🔄 Starting Round ${game.round}...\nTurn: @${game.turn.split('@')[0]} (${nextSym})`,
                        mentions: game.players
                    })
                }

                /* ---------- CONTINUE ---------- */
                await saveState(gameKey, game)
                // Show the correct symbol for the next player
                const turnSym = game.turn === game.players[0] ? '❌' : '⭕'
                return M.replyRaw({
                    image: currentBoardImg,
                    caption: `➡️ Turn: @${game.turn.split('@')[0]} (${turnSym}) make your move.`,
                    mentions: [game.turn]
                })
            }

            /* ---------- FORFEIT ---------- */
            if (['forfeit', 'ff'].includes(args[0])) {
                const game = await getState(gameKey)
                if (!game) return M.reply('❌ There is no active match to forfeit.')

                const winner = game.players.find((p) => p !== M.sender.id)
                if (!isBot(client, winner)) await addToWallet(winner, game.bet * 2)
                await deleteState(gameKey)

                // ── CHALLENGE: ttt_wins on forfeit win (vs real player only) ──
                if (!isBot(client, winner) && !game.vsBot) {
                    try {
                        const chalResult = await incrementChallengeProgress(winner, 'tttWins', 1)
                        let bonusNote = ''
                        if (chalResult?.completed) {
                            bonusNote = `\n\n🎯 *Challenge Complete!* @${winner.split('@')[0]} finished the TTT challenge!\nUse *${global.config.prefix}claimchallenge* to collect your card!`
                        }
                        return M.reply(
                            `🏳️ @${M.sender.id.split('@')[0]} forfeited the match.\n\n🏆 Winner: @${winner.split('@')[0]} receives the full pot.${bonusNote}`,
                            'text',
                            null,
                            null,
                            [M.sender.id, winner]
                        )
                    } catch (chalErr) {
                        console.error('[TTT FORFEIT] Challenge error:', chalErr)
                    }
                }

                return M.reply(
                    `🏳️ @${M.sender.id.split('@')[0]} forfeited the match.\n\n🏆 Winner: @${winner.split('@')[0]} receives the full pot.`,
                    'text',
                    null,
                    null,
                    [M.sender.id, winner]
                )
            }

            return M.reply(`❌ Unknown TTT command. Use *${global.config.prefix}ttt* to see the menu.`)
        } catch (err) {
            console.error('[TTT ERROR]', err)
            return M.reply('❌ An unexpected error occurred while running the Tic‑Tac‑Toe match.')
        }
    }
)
