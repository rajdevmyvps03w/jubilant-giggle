import { plugin } from '../../utils/plugin.js'
import { fetch } from '../../functions/helpler.js'
import Canvas from 'canvas'

// In-memory game storage: Map<chatJid, GameState>
const games = new Map()

// Timeout storage: Map<chatJid, NodeJS.Timeout>
const gameTimeouts = new Map()

// Game timeout duration (2 minutes in milliseconds)
const GAME_TIMEOUT_MS = 2 * 60 * 1000

// Hint settings - how many letters to reveal at start
const MIN_HINT_LETTERS = 1 // Minimum letters to reveal
const MAX_HINT_LETTERS = 3 // Maximum letters to reveal
const HINT_PERCENTAGE = 0.2 // Reveal 20% of unique letters (minimum 1)

/**
 * Generate hangman image using Canvas
 * @param state - Number of wrong guesses (0-6)
 * @returns Buffer of the PNG image
 */
const getHangman = (state = 0) => {
    const createLine = (ctx, fromX, fromY, toX, toY, color = '#000000') => {
        ctx.beginPath()
        ctx.strokeStyle = color
        ctx.moveTo(fromX, fromY)
        ctx.lineTo(toX, toY)
        ctx.stroke()
        ctx.closePath()
    }

    const canvas = Canvas.createCanvas(300, 350)
    const ctx = canvas.getContext('2d')
    ctx.lineWidth = 5

    // Draw gallows base
    createLine(ctx, 50, 330, 150, 330)
    createLine(ctx, 100, 330, 100, 50)
    createLine(ctx, 100, 50, 200, 50)
    createLine(ctx, 200, 50, 200, 80)

    // Draw head
    if (state >= 1) {
        ctx.strokeStyle = '#000000'
        ctx.beginPath()
        ctx.arc(200, 100, 20, 0, 2 * Math.PI)
        ctx.stroke()
        ctx.closePath()
    }

    // Draw body
    if (state >= 2) {
        createLine(ctx, 200, 120, 200, 200, '#000000')
    }

    // Draw left arm
    if (state >= 3) {
        createLine(ctx, 200, 150, 170, 130, state < 3 ? '#a3a3a3' : '#000000')
    }

    // Draw right arm
    if (state >= 4) {
        createLine(ctx, 200, 150, 230, 130, state < 4 ? '#a3a3a3' : '#000000')
    }

    // Draw left leg
    if (state >= 5) {
        createLine(ctx, 200, 200, 180, 230, state < 5 ? '#a3a3a3' : '#000000')
    }

    // Draw right leg
    if (state >= 6) {
        createLine(ctx, 200, 200, 220, 230, state < 6 ? '#a3a3a3' : '#000000')
    }

    return canvas.toBuffer()
}

/**
 * Get repeated letters in a word
 * @param str - The word to check
 * @returns Object with letters that appear more than once
 */
const getRepeatedWords = (str) => {
    const tmp = {}
    let c
    for (let i = str.length - 1; i >= 0; i--) {
        c = str.charAt(i)
        if (c in tmp) {
            tmp[c] += 1
        } else {
            tmp[c] = 1
        }
    }
    const result = {}
    for (c in tmp) {
        if (tmp.hasOwnProperty(c) && tmp[c] > 1) {
            result[c] = tmp[c]
        }
    }
    return result
}

/**
 * Get random letters to reveal as hints
 * @param word - The word
 * @returns Array of letters to reveal
 */
const getHintLetters = (word) => {
    // Get unique letters
    const uniqueLetters = [...new Set(word.toLowerCase().split(''))]

    // Calculate how many letters to reveal (20% of unique letters)
    const hintCount = Math.max(
        MIN_HINT_LETTERS,
        Math.min(MAX_HINT_LETTERS, Math.ceil(uniqueLetters.length * HINT_PERCENTAGE))
    )

    // Shuffle and pick random letters
    const shuffled = uniqueLetters.sort(() => Math.random() - 0.5)
    return shuffled.slice(0, hintCount)
}

/**
 * Fetch a random word from word list
 */
const getRandomWord = async () => {
    try {
        const words = await fetch('https://raw.githubusercontent.com/Natemo6348/xiao/master/assets/json/word-list.json')
        if (!Array.isArray(words)) {
            const fallbackWords = [
                'javascript',
                'python',
                'hangman',
                'developer',
                'keyboard',
                'computer',
                'programming',
                'database',
                'software',
                'algorithm',
                'typescript',
                'nodejs',
                'react',
                'angular',
                'mongodb'
            ]
            return fallbackWords[Math.floor(Math.random() * fallbackWords.length)]
        }
        return words[Math.floor(Math.random() * words.length)]
    } catch (error) {
        console.error('[HANGMAN] Failed to fetch words:', error)
        const fallbackWords = [
            'javascript',
            'python',
            'hangman',
            'developer',
            'keyboard',
            'computer',
            'programming',
            'database',
            'software',
            'algorithm',
            'typescript',
            'nodejs',
            'react',
            'angular',
            'mongodb'
        ]
        return fallbackWords[Math.floor(Math.random() * fallbackWords.length)]
    }
}

/**
 * Clear game timeout
 * @param chatJid - The chat JID
 */
const clearGameTimeout = (chatJid) => {
    const timeout = gameTimeouts.get(chatJid)
    if (timeout) {
        clearTimeout(timeout)
        gameTimeouts.delete(chatJid)
    }
}

/**
 * Set game timeout (2 minutes)
 * @param chatJid - The chat JID
 * @param client - The WhatsApp client
 * @param gameData - The game data
 */
const setGameTimeout = (chatJid, client) => {
    // Clear any existing timeout
    clearGameTimeout(chatJid)

    const timeout = setTimeout(async () => {
        // Check if game still exists
        const currentGame = games.get(chatJid)
        if (!currentGame) {
            return
        }

        // Delete the game
        games.delete(chatJid)
        gameTimeouts.delete(chatJid)

        // Send timeout notification
        const timeoutBuffer = getHangman(currentGame.wrong)
        const timeoutMsg = `⏰ *GAME TIMEOUT!*

You took too long to guess! The game has ended.

📝 *The word was:* **${currentGame.word.toUpperCase()}**
🎯 *Guesses made:* ${currentGame.guessed.length}
❤️ *Lives used:* ${currentGame.wrong}/6

_Start a new game with *${global.config.prefix}hangman start*_`

        try {
            await client.sendMessage(chatJid, {
                image: timeoutBuffer,
                caption: timeoutMsg,
                jpegThumbnail: timeoutBuffer.toString('base64')
            })
        } catch (err) {
            console.error('[HANGMAN TIMEOUT] Failed to send timeout message:', err)
        }
    }, GAME_TIMEOUT_MS)

    gameTimeouts.set(chatJid, timeout)
}

/**
 * End game and cleanup
 * @param chatJid - The chat JID
 */
const endGame = (chatJid) => {
    clearGameTimeout(chatJid)
    games.delete(chatJid)
}

/**
 * Send hangman image with caption
 */
const sendHangmanImage = async (M, buffer, caption, mentions = []) => {
    return await M.reply(buffer, 'image', 'image/png', caption, mentions)
}

plugin(
    {
        name: 'hangman',
        aliases: ['hm', 'hanged'],
        category: 'games',
        description: {
            content:
                'Play the classic Hangman word guessing game. Game auto-ends after 2 minutes of inactivity. Hints are revealed at the start!',
            usage: '<start | guess <letter> | hint | forfeit | status>',
            example: 'start | guess a | hint | forfeit'
        }
    },
    async (client, M, { text, args }) => {
        try {
            const subCmd = args[0]?.toLowerCase() || ''
            const gameData = games.get(M.from)

            // ========================================
            // SHOW HELP - No arguments provided
            // ========================================
            if (!text) {
                const helpBuffer = getHangman(6)
                const helpMsg = `🎮 *HANGMAN GAME* 🎮

*Commands:*
• *${global.config.prefix}hangman start* - Start a new game
• *${global.config.prefix}hangman guess <letter>* - Guess a letter
• *${global.config.prefix}hangman hint* - Get an extra hint (costs 1 life!)
• *${global.config.prefix}hangman status* - View current game
• *${global.config.prefix}hangman forfeit* - End your game

💡 *Hints:* Game starts with 1-3 letters revealed!
⏰ *Note:* Game auto-ends after *2 minutes* of inactivity.

_Only one game per chat. The person who starts owns the game._`

                return sendHangmanImage(M, helpBuffer, helpMsg)
            }

            // ========================================
            // START GAME
            // ========================================
            if (subCmd === 'start' || subCmd === 's') {
                // Check if game already exists
                if (gameData) {
                    if (gameData.player === M.sender.id) {
                        return M.reply(
                            `⚠️ You already have a game running here!\n\n` +
                                `Use *${global.config.prefix}hangman forfeit* to end it.`
                        )
                    }
                    return M.reply(
                        `🎮 Someone is already playing here!\n\n` +
                            `Wait for them to finish or play in DM with the bot.`
                    )
                }

                // Fetch random word
                const word = await getRandomWord()
                const wordLower = word.toLowerCase()

                // Initialize game state
                const shown = []
                const remaining = []

                for (let i = 0; i < wordLower.length; i++) {
                    shown.push('_')
                    if (!remaining.includes(wordLower[i])) {
                        remaining.push(wordLower[i])
                    }
                }

                // Get hint letters to reveal at start
                const hintLetters = getHintLetters(wordLower)
                const revealedLetters = []

                // Reveal hint letters
                for (const letter of hintLetters) {
                    for (let i = 0; i < wordLower.length; i++) {
                        if (wordLower[i] === letter) {
                            shown[i] = letter.toUpperCase()
                        }
                    }
                    // Remove from remaining
                    const idx = remaining.indexOf(letter)
                    if (idx > -1) {
                        remaining.splice(idx, 1)
                        revealedLetters.push(letter.toUpperCase())
                    }
                }

                // Calculate total revealed positions
                let revealedCount = 0
                for (let i = 0; i < wordLower.length; i++) {
                    if (shown[i] !== '_') revealedCount++
                }

                // Store game
                games.set(M.from, {
                    word: wordLower,
                    player: M.sender.id,
                    playerName: M.sender.name || M.sender.id.split('@')[0],
                    wrong: 0,
                    shown,
                    remaining,
                    guessed: [...hintLetters], // Add hint letters to guessed
                    hintsUsed: 0,
                    startedAt: Date.now(),
                    lastGuessAt: Date.now()
                })

                // Set 2 minute timeout
                setGameTimeout(M.from, client)

                // Calculate word length hint
                const uniqueLetters = remaining.length + hintLetters.length
                const wordHint =
                    wordLower.length <= 5 ? '📕 Short word' : wordLower.length <= 8 ? '📗 Medium word' : '📘 Long word'

                const startBuffer = getHangman(0)
                const startMsg = `🎮 *HANGMAN GAME STARTED!*

📝 *Word:* \`\`\`${shown.join(' ')}\`\`\`
📏 *Letters:* ${wordLower.length}
💡 *Category:* ${wordHint}
🎯 *Unique letters:* ${uniqueLetters}

🔓 *Hint revealed:* ${revealedLetters.join(', ')} (${revealedCount} positions)
👤 *Player:* @${M.sender.id.split('@')[0]}
❤️ *Lives:* 6
⏰ *Time limit:* 2 minutes per guess

💡 _Use *${global.config.prefix}hangman hint* to reveal more (costs 1 life!)_
🎯 _Use *${global.config.prefix}hangman guess <letter>* to guess!_`

                return sendHangmanImage(M, startBuffer, startMsg, [M.sender.id])
            }

            // ========================================
            // HINT - Reveal extra letter (costs 1 life)
            // ========================================
            if (subCmd === 'hint' || subCmd === 'h') {
                // Check if game exists
                if (!gameData) {
                    return M.reply(`❌ No game running here. Start one with *${global.config.prefix}hangman start*`)
                }

                // Check if it's the player's turn
                if (gameData.player !== M.sender.id) {
                    return M.reply(
                        `⚠️ This is *@${gameData.player.split('@')[0]}'s* game!`,
                        'text',
                        undefined,
                        undefined,
                        [gameData.player]
                    )
                }

                // Check if there are letters left to reveal
                if (gameData.remaining.length === 0) {
                    return M.reply(`✅ All letters are already revealed! Just guess the word.`)
                }

                // Check if player has lives to spare
                if (gameData.wrong >= 5) {
                    return M.reply(`❌ You only have 1 life left! Can't use hint.`)
                }

                // Get a random letter from remaining
                const randomIndex = Math.floor(Math.random() * gameData.remaining.length)
                const hintLetter = gameData.remaining[randomIndex]

                // Reveal the letter
                for (let i = 0; i < gameData.word.length; i++) {
                    if (gameData.word[i] === hintLetter) {
                        gameData.shown[i] = hintLetter.toUpperCase()
                    }
                }

                // Remove from remaining and add to guessed
                gameData.remaining.splice(randomIndex, 1)
                gameData.guessed.push(hintLetter)

                // Cost 1 life (but don't draw hangman part)
                gameData.wrong += 1
                gameData.hintsUsed += 1

                // Update game and reset timeout
                gameData.lastGuessAt = Date.now()
                games.set(M.from, gameData)
                setGameTimeout(M.from, client)

                const livesLeft = 6 - gameData.wrong
                const hintBuffer = getHangman(gameData.wrong)
                const hintMsg = `💡 *HINT USED!*

🔓 *Revealed:* **${hintLetter.toUpperCase()}**
📝 *Word:* \`\`\`${gameData.shown.join(' ')}\`\`\`
🎯 *Letters left:* ${gameData.remaining.length}
❤️ *Lives:* ${livesLeft}/6 ⚠️ (-1 for hint)
📊 *Hints used:* ${gameData.hintsUsed}

_Keep guessing!_`

                return sendHangmanImage(M, hintBuffer, hintMsg)
            }

            // ========================================
            // GUESS LETTER
            // ========================================
            if (subCmd === 'guess' || subCmd === 'g') {
                // Check if game exists
                if (!gameData) {
                    return M.reply(`❌ No game running here. Start one with *${global.config.prefix}hangman start*`)
                }

                // Check if it's the player's turn
                if (gameData.player !== M.sender.id) {
                    return M.reply(
                        `⚠️ This is *@${gameData.player.split('@')[0]}'s* game!\n\n` +
                            `Start your own game in another chat.`,
                        'text',
                        undefined,
                        undefined,
                        [gameData.player]
                    )
                }

                // Validate letter input
                const letter = args[1]?.toLowerCase()

                if (!letter) {
                    return M.reply(`❌ Please provide a letter!\n\nExample: *${global.config.prefix}hangman guess a*`)
                }

                if (letter.length > 1) {
                    return M.reply(`❌ Only one letter at a time!\n\nExample: *${global.config.prefix}hangman guess a*`)
                }

                if (!/^[a-z]$/.test(letter)) {
                    return M.reply(`❌ Invalid letter! Use only a-z.`)
                }

                // Check if already guessed
                if (gameData.guessed.includes(letter)) {
                    return M.reply(
                        `⚠️ You already guessed *"${letter}"*!\n\n` +
                            `Letters tried: ${gameData.guessed.map((l) => l.toUpperCase()).join(', ')}`
                    )
                }

                // Add to guessed
                gameData.guessed.push(letter)

                // ========================================
                // WRONG GUESS
                // ========================================
                if (!gameData.remaining.includes(letter)) {
                    gameData.wrong += 1
                    const livesLeft = 6 - gameData.wrong

                    // GAME OVER - Player loses
                    if (gameData.wrong >= 6) {
                        endGame(M.from)
                        const gameOverBuffer = getHangman(6)
                        const gameOverMsg = `💀 *GAME OVER!*

You've been hanged! 🪦

📝 *The word was:* **${gameData.word.toUpperCase()}**
🎯 *Letters guessed:* ${gameData.guessed.map((l) => l.toUpperCase()).join(', ')}
💡 *Hints used:* ${gameData.hintsUsed}

_Better luck next time! Start a new game with *${global.config.prefix}hangman start*_`

                        return sendHangmanImage(M, gameOverBuffer, gameOverMsg)
                    }

                    // Update game state and reset timeout
                    gameData.lastGuessAt = Date.now()
                    games.set(M.from, gameData)
                    setGameTimeout(M.from, client)

                    const wrongBuffer = getHangman(gameData.wrong)
                    const wrongMsg = `❌ *WRONG GUESS!*

📝 *Word:* \`\`\`${gameData.shown.join(' ')}\`\`\`
❤️ *Lives left:* ${livesLeft}
🎯 *Guessed:* ${gameData.guessed.map((l) => l.toUpperCase()).join(', ')}
⏰ *Time left:* 2 minutes

_Guess another letter!_`

                    return sendHangmanImage(M, wrongBuffer, wrongMsg)
                }

                // ========================================
                // CORRECT GUESS
                // ========================================
                // Update shown letters
                for (let i = 0; i < gameData.word.length; i++) {
                    if (gameData.word[i] === letter) {
                        gameData.shown[i] = letter.toUpperCase()
                    }
                }

                // Remove from remaining
                gameData.remaining = gameData.remaining.filter((l) => l !== letter)

                // ========================================
                // CHECK WIN
                // ========================================
                if (gameData.remaining.length === 0) {
                    endGame(M.from)
                    const timeTaken = Math.floor((Date.now() - gameData.startedAt) / 1000)
                    const minutes = Math.floor(timeTaken / 60)
                    const seconds = timeTaken % 60

                    const winBuffer = getHangman(gameData.wrong)
                    const winMsg = `🎉 *CONGRATULATIONS! YOU WON!*

📝 *Word:* **${gameData.word.toUpperCase()}**
❤️ *Lives used:* ${gameData.wrong}/6
🎯 *Total guesses:* ${gameData.guessed.length}
💡 *Hints used:* ${gameData.hintsUsed}
⏱️ *Time:* ${minutes}m ${seconds}s

_Amazing! You guessed the word correctly! 🏆_`

                    return sendHangmanImage(M, winBuffer, winMsg)
                }

                // Update game state and reset timeout
                gameData.lastGuessAt = Date.now()
                games.set(M.from, gameData)
                setGameTimeout(M.from, client)

                const remainingHidden = gameData.shown.filter((s) => s === '_').length
                const correctBuffer = getHangman(gameData.wrong)
                const correctMsg = `✅ *CORRECT!*

📝 *Word:* \`\`\`${gameData.shown.join(' ')}\`\`\`
🎯 *Letters left:* ${gameData.remaining.length}
🔍 *Hidden spots:* ${remainingHidden}
🎯 *Guessed:* ${gameData.guessed.map((l) => l.toUpperCase()).join(', ')}
⏰ *Time left:* 2 minutes

_Keep going! You're doing great!_`

                return sendHangmanImage(M, correctBuffer, correctMsg)
            }

            // ========================================
            // FORFEIT GAME
            // ========================================
            if (subCmd === 'forfeit' || subCmd === 'ff' || subCmd === 'end') {
                if (!gameData) {
                    return M.reply(`❌ No game running here.`)
                }

                if (gameData.player !== M.sender.id) {
                    return M.reply(
                        `⚠️ Only the player who started the game can forfeit!\n\n` +
                            `This game belongs to *@${gameData.player.split('@')[0]}*`,
                        'text',
                        undefined,
                        undefined,
                        [gameData.player]
                    )
                }

                // Store data before ending game
                const word = gameData.word
                const guessed = [...gameData.guessed]
                const wrong = gameData.wrong
                const hintsUsed = gameData.hintsUsed

                // End game (clears timeout too)
                endGame(M.from)

                const forfeitBuffer = getHangman(6)
                const forfeitMsg = `🏳️ *GAME FORFEITED*

📝 *The word was:* **${word.toUpperCase()}**
🎯 *Guesses made:* ${guessed.length}
💡 *Hints used:* ${hintsUsed}
❤️ *Lives used:* ${wrong}/6

_Start a new game with *${global.config.prefix}hangman start*_`

                return sendHangmanImage(M, forfeitBuffer, forfeitMsg)
            }

            // ========================================
            // STATUS - Show current game
            // ========================================
            if (subCmd === 'status' || subCmd === 'st') {
                if (!gameData) {
                    return M.reply(`❌ No game running here. Start one with *${global.config.prefix}hangman start*`)
                }

                const livesLeft = 6 - gameData.wrong
                const elapsed = Math.floor((Date.now() - gameData.startedAt) / 1000)
                const minutes = Math.floor(elapsed / 60)
                const seconds = elapsed % 60

                // Calculate time until timeout
                const timeSinceLastGuess = Date.now() - gameData.lastGuessAt
                const timeLeftMs = GAME_TIMEOUT_MS - timeSinceLastGuess
                const timeLeftMin = Math.floor(timeLeftMs / 60000)
                const timeLeftSec = Math.floor((timeLeftMs % 60000) / 1000)

                const statusBuffer = getHangman(gameData.wrong)
                const statusMsg = `📊 *CURRENT GAME STATUS*

📝 *Word:* \`\`\`${gameData.shown.join(' ')}\`\`\`
👤 *Player:* @${gameData.player.split('@')[0]}
❤️ *Lives:* ${livesLeft}/6
🎯 *Guessed:* ${gameData.guessed.length > 0 ? gameData.guessed.map((l) => l.toUpperCase()).join(', ') : 'None'}
💡 *Hints used:* ${gameData.hintsUsed}
⏱️ *Duration:* ${minutes}m ${seconds}s
⏰ *Time until timeout:* ${timeLeftMin}m ${timeLeftSec}s

_Continue with *${global.config.prefix}hangman guess <letter>*_`

                return sendHangmanImage(M, statusBuffer, statusMsg, [gameData.player])
            }

            return M.reply(
                `❌ Invalid command!\n\n` +
                    `*Available commands:*\n` +
                    `• *${global.config.prefix}hangman start* - Start a game\n` +
                    `• *${global.config.prefix}hangman guess <letter>* - Guess a letter\n` +
                    `• *${global.config.prefix}hangman hint* - Reveal a letter (-1 life)\n` +
                    `• *${global.config.prefix}hangman status* - Check current game\n` +
                    `• *${global.config.prefix}hangman forfeit* - End your game`
            )
        } catch (error) {
            console.error('[HANGMAN ERROR]', error)
            return M.reply('❌ An error occurred while processing the hangman game.')
        }
    }
)

// Export for external access if needed
export const getActiveGames = () => games
export const getActiveTimeouts = () => gameTimeouts
