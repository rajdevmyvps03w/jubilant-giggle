import { plugin } from '../../utils/plugin.js'
import { removeCardFromCollection, findUser } from '../../database/db.js'
import { extractNumbers } from '../../functions/helpler.js'

plugin(
    {
        name: 'delcard',
        aliases: ['deletecard', 'rcard'],
        category: 'cards',
        isGroup: true,
        description: {
            content: 'Delete specific cards or all duplicates using --d.',
            usage: '<index> [--d]',
            example: '1 5 10 --d'
        }
    },
    async (_, M, { text, flags }) => {
        try {
            const isDuplicateMode = 'd' in flags
            const inputNumbers = extractNumbers(text)

            // 1. Selective Projection: Only fetch the collection array
            const user = await findUser(M.sender.id, 'cards.collection')
            const collection = user?.cards?.collection || []

            if (collection.length === 0) {
                return M.reply('❌ Your collection is currently empty.')
            }

            /* ---------- DUPLICATE DETECTION LOGIC ---------- */
            const getCardKey = (c) => c?.id || c?.title || c?.name || 'unknown'

            if (isDuplicateMode && inputNumbers.length === 0) {
                const counts = {}
                collection.forEach((card, i) => {
                    const key = getCardKey(card)
                    if (!counts[key]) counts[key] = []
                    counts[key].push(i + 1)
                })

                let duplicateText = '👯 *YOUR DUPLICATE CARDS*\n\n'
                let hasDupes = false

                for (const [key, indexes] of Object.entries(counts)) {
                    if (indexes.length > 1) {
                        hasDupes = true
                        const card = collection[indexes[0] - 1]
                        const name = card.title || card.name || 'Unknown Card'
                        duplicateText += `🃏 *${name}*\n`
                        duplicateText += `✅ *Keep:* Index ${indexes[0]}\n`
                        duplicateText += `🗑️ *Stacks:* [${indexes.slice(1).join(', ')}]\n\n`
                    }
                }

                if (!hasDupes) return M.reply('✨ You have no duplicate cards!')
                return M.reply(
                    duplicateText +
                        `💡 Use *${global.config.prefix}delcard 1 --d* to delete all duplicates of that card.`
                )
            }

            /* ---------- TARGET SELECTION LOGIC ---------- */
            let targets = []

            if (isDuplicateMode && inputNumbers.length > 0) {
                inputNumbers.forEach((num) => {
                    const keepIndex = num - 1 // The index user wants to keep
                    const targetCard = collection[keepIndex]
                    if (!targetCard) return

                    const cardKey = getCardKey(targetCard)

                    // Find all occurrences but EXCLUDE the one the user wants to keep
                    const toDelete = collection
                        .map((c, i) => (getCardKey(c) === cardKey && i !== keepIndex ? i : -1))
                        .filter((i) => i !== -1)

                    targets.push(...toDelete)
                })
            } else {
                targets = inputNumbers.map((n) => n - 1).filter((i) => i >= 0 && i < collection.length)
            }

            // 2. DESCENDING SORT (CRITICAL)
            //
            const uniqueTargets = [...new Set(targets)].sort((a, b) => b - a)

            if (uniqueTargets.length === 0) {
                return M.reply('❌ No valid cards found to delete.')
            }

            /* ---------- EXECUTION ---------- */
            const deletedNames = []
            for (const idx of uniqueTargets) {
                const card = await removeCardFromCollection(M.sender.id, idx)
                if (card) {
                    deletedNames.push(card.title || card.name || 'Unknown Card')
                }
            }

            /* ---------- RESPONSE ---------- */
            return M.reply(
                `🗑️ *CARDS DELETED SUCCESSFULLY*\n\n` +
                    `✅ Total Removed: ${deletedNames.length}\n` +
                    `🃏 Samples: ${[...new Set(deletedNames)].slice(0, 3).join(', ')}\n\n` +
                    `⚠️ Note: These cards are gone forever.`
            )
        } catch (err) {
            console.error('[DELCARD ERROR]', err)
            return M.reply('❌ An error occurred while processing.')
        }
    }
)
