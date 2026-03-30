const emojis = ['🍒', '🍋', '🍊', '🍇', '🍉', '🔔', '⭐', '💎']

export const spinSlotMachine = (winChance) => {
    const grid = [[], [], []]

    const getRandomEmoji = () => {
        return emojis[Math.floor(Math.random() * emojis.length)]
    }

    const allMatch = (array) => {
        for (let i = 1; i < array.length; i++) {
            if (array[i] !== array[0]) return false
        }
        return true
    }

    const generateGrid = () => {
        const shouldWin = Math.random() * 100 < winChance
        if (shouldWin) {
            const winningEmoji = getRandomEmoji()
            const rowOrColumn = Math.random() < 0.5 ? 'row' : 'column'

            if (rowOrColumn === 'row') {
                const rowIndex = Math.floor(Math.random() * 3)
                for (let j = 0; j < 3; j++) grid[rowIndex][j] = winningEmoji
                for (let i = 0; i < 3; i++) {
                    if (i !== rowIndex && Math.random() < 0.5) {
                        for (let j = 0; j < 3; j++) grid[i][j] = winningEmoji
                    }
                }
            } else {
                const colIndex = Math.floor(Math.random() * 3)
                for (let i = 0; i < 3; i++) grid[i][colIndex] = winningEmoji
                for (let j = 0; j < 3; j++) {
                    if (j !== colIndex && Math.random() < 0.5) {
                        for (let i = 0; i < 3; i++) grid[i][j] = winningEmoji
                    }
                }
            }

            for (let i = 0; i < 3; i++) {
                for (let j = 0; j < 3; j++) {
                    if (!grid[i][j]) grid[i][j] = getRandomEmoji()
                }
            }
        } else {
            for (let i = 0; i < 3; i++) {
                for (let j = 0; j < 3; j++) grid[i][j] = getRandomEmoji()
            }
        }
    }

    const checkMatches = () => {
        const matches = { rows: 0, columns: 0 }

        for (let i = 0; i < 3; i++) {
            if (allMatch(grid[i])) matches.rows++
        }

        for (let j = 0; j < 3; j++) {
            const column = [grid[0][j], grid[1][j], grid[2][j]]
            if (allMatch(column)) matches.columns++
        }

        return matches
    }

    generateGrid()

    let slot = ''
    for (let i = 0; i < grid.length; i++) {
        slot += grid[i].join(' ') + '\n'
    }

    return {
        slot: slot,
        matches: checkMatches()
    }
}
