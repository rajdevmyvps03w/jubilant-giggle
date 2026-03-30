import { getRandomItem, getRandomInt } from './helpler.js'

const DIFFICULTY = {
    'Tier 1': 'easy',
    'Tier 2': 'easy',
    'Tier 3': 'medium',
    'Tier 4': 'medium',
    'Tier 5': 'hard',
    'Tier 6': 'hard',
    'Tier S': 'hard',
    C: 'easy',
    R: 'medium',
    SR: 'medium',
    SSR: 'hard',
    UR: 'hard'
}

const OPS = {
    easy: ['+', '-'],
    medium: ['+', '-', '×'],
    hard: ['×', '÷']
}

const RANGES = {
    easy: [2, 20],
    medium: [5, 50],
    hard: [6, 20]
}

export const generatePuzzle = (tier) => {
    const difficulty = DIFFICULTY[tier] ?? 'easy'
    const [min, max] = RANGES[difficulty]
    const op = getRandomItem(OPS[difficulty])

    let a, b, answer, question

    switch (op) {
        case '+': {
            a = getRandomInt(min, max)
            b = getRandomInt(min, max)
            answer = a + b
            question = `${a} + ${b} = ?`
            break
        }

        case '-': {
            a = getRandomInt(min + 1, max)
            b = getRandomInt(min, a - 1)
            answer = a - b
            question = `${a} - ${b} = ?`
            break
        }

        case '×': {
            a = getRandomInt(min, max)
            b = getRandomInt(2, max) // at least ×2
            answer = a * b
            question = `${a} × ${b} = ?`
            break
        }

        case '÷': {
            b = getRandomInt(2, max)
            const multiplier = getRandomInt(min, max)
            a = b * multiplier
            answer = multiplier // a ÷ b = multiplier
            question = `${a} ÷ ${b} = ?`
            break
        }
    }

    if (!Number.isInteger(answer) || answer <= 0) {
        a = getRandomInt(min, max)
        b = getRandomInt(min, max)
        answer = a + b
        question = `${a} + ${b} = ?`
    }

    return { question, answer }
}

export const getDifficultyLabel = (tier) => {
    const d = DIFFICULTY[tier] ?? 'easy'
    return { easy: '🟢', medium: '🟡', hard: '🔴' }[d]
}
