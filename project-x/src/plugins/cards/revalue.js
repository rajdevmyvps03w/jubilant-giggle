// src/plugins/cards/revalue.js

import { plugin } from '../../utils/plugin.js'
import {
    findUser,
    removeFromWallet,
    getMarketSnapshot,
    calculateCardRevalue,
    calculateGroupTax,
    applyCardRevalue,
    applyAllCardRevalues,
    addGroupFunds
} from '../../database/db.js'
import { getTierEmoji } from '../../handler/card.js'

const COST_SINGLE = 500
const COST_ALL = 2000

plugin(
    {
        name: 'revalue',
        aliases: ['rv', 'reval', 'cardvalue'],
        category: 'cards',
        isGroup: true,
        description: {
            content:
                `Revalue your deck card(s) based on real market data ~ tier scarcity, economy size, and avg prices.\n` +
                `Costs ₹${COST_SINGLE.toLocaleString()} per card or ₹${COST_ALL.toLocaleString()} for the whole deck.`,
            usage: '<index | all>',
            example: '3  OR  all'
        }
    },
    async (_, M, { args }) => {
        try {
            const input = args[0]?.toLowerCase()

            if (!input) {
                return M.reply(
                    `📊 *CARD REVALUATION*\n\n` +
                        `Recalculates your card prices using:\n` +
                        `  • Tier scarcity across all users\n` +
                        `  • Bot economy size (total users)\n` +
                        `  • Market average prices per tier\n` +
                        `  • Your card's original base price\n\n` +
                        `💰 *Cost:* ₹${COST_SINGLE.toLocaleString()} per card · ₹${COST_ALL.toLocaleString()} for entire deck\n\n` +
                        `📌 *Usage:*\n` +
                        ` To revalue deck card #3: *${global.config.prefix}revalue 3*\n` +
                        ` Revalue all deck cards:  *${global.config.prefix}revalue all*`
                )
            }

            // ── 1. LOAD USER ──────────────────────────────────────────────────
            const user = await findUser(M.sender.id, 'wallet cards.deck name')
            const deck = user?.cards?.deck || []

            if (!deck.length) {
                return M.reply(`🪹 Your deck is empty. Add cards with *${global.config.prefix}col2deck* first.`)
            }

            const isAll = input === 'all'
            let targetCards = []

            if (isAll) {
                targetCards = deck.map((card, i) => ({ card, deckIndex: i }))
            } else {
                const idx = parseInt(input)
                if (isNaN(idx) || idx < 1 || idx > deck.length) {
                    return M.reply(
                        `❌ Invalid index. Your deck has ${deck.length} card(s). Use 1–${deck.length} or \`all\`.`
                    )
                }
                targetCards = [{ card: deck[idx - 1], deckIndex: idx - 1 }]
            }

            // ── 2. COST CHECK ─────────────────────────────────────────────────
            // FIX: was passing undefined `baseCost` — pass `cost` instead
            const cost = isAll ? COST_ALL : COST_SINGLE
            const { tax: taxAmount } = await calculateGroupTax(M.sender.id, M.from, cost)
            const finalCost = cost + taxAmount

            if ((user.wallet || 0) - finalCost < 0) {
                return M.reply(
                    `💸 *Insufficient Balance*\n\n` +
                        `Cost: ₹${cost.toLocaleString()}\n` +
                        (taxAmount > 0 ? `🏛️ Tax: ₹${taxAmount.toLocaleString()}\n` : '') +
                        `💸 Total: ₹${finalCost.toLocaleString()}\n` +
                        `👛 Wallet: ₹${(user.wallet || 0).toLocaleString()}\n\n` +
                        `_You need ₹${(finalCost - (user.wallet || 0)).toLocaleString()} more._`
                )
            }

            // ── 3. MARKET SNAPSHOT ────────────────────────────────────────────
            await M.reply(`⏳ Fetching market data and calculating valuations...`)
            const snapshot = await getMarketSnapshot()

            // ── 4. CALCULATE NEW PRICES ───────────────────────────────────────
            const results = targetCards.map(({ card, deckIndex }) => {
                const { newPrice, newBasePrice, breakdown } = calculateCardRevalue(card, snapshot)
                return {
                    card,
                    deckIndex,
                    oldPrice: card.price || 0,
                    oldBasePrice: card.basePrice || 0,
                    newPrice,
                    newBasePrice,
                    breakdown
                }
            })

            // ── 5. DEDUCT COST ────────────────────────────────────────────────
            // FIX: addGroupFunds was missing from imports
            if (taxAmount > 0) {
                await addGroupFunds(M.from, taxAmount)
            }

            const deducted = await removeFromWallet(M.sender.id, finalCost)
            if (!deducted) {
                return M.reply('❌ Failed to deduct revaluation fee. Please try again.')
            }

            // ── 6. APPLY PRICE UPDATES ────────────────────────────────────────
            if (isAll) {
                const cardUpdates = results.map((r) => ({
                    cardId: r.card._id,
                    newPrice: r.newPrice,
                    newBasePrice: r.newBasePrice
                }))
                await applyAllCardRevalues(M.sender.id, cardUpdates)
            } else {
                const r = results[0]
                await applyCardRevalue(M.sender.id, r.card._id, r.newPrice, r.newBasePrice)
            }

            // ── 7. BUILD RESPONSE ─────────────────────────────────────────────
            if (isAll) {
                let msg = `📊 *DECK REVALUATION COMPLETE*\n\n`
                msg += `👤 *${user.name}*\n`
                msg += `💰 *Fee charged:* ₹${cost.toLocaleString()}\n`
                if (taxAmount > 0) {
                    msg += `🏛️ *Tax:* ₹${taxAmount.toLocaleString()}\n`
                }
                msg += `🌐 *Economy:* ${snapshot.totalUsers} users · ${snapshot.totalCards.toLocaleString()} total cards\n\n`

                let totalOld = 0
                let totalNew = 0

                results.forEach((r, i) => {
                    const emoji = getTierEmoji(r.card.tier)
                    const diff = r.newPrice - r.oldPrice
                    const arrow = diff > 0 ? '📈' : diff < 0 ? '📉' : '➡️'
                    const sign = diff >= 0 ? '+' : ''
                    totalOld += r.oldPrice
                    totalNew += r.newPrice

                    msg += `${i + 1}. ${emoji} *${r.card.title}* _(${r.card.tier})_\n`
                    msg += `   ₹${r.oldPrice.toLocaleString()} → *₹${r.newPrice.toLocaleString()}* ${arrow} ${sign}₹${Math.abs(diff).toLocaleString()}\n\n`
                })

                const totalDiff = totalNew - totalOld
                const totalSign = totalDiff >= 0 ? '+' : ''
                msg += `${'─'.repeat(28)}\n`
                msg += `📦 *Total Deck Value*\n`
                msg += `Old: ₹${totalOld.toLocaleString()} → New: *₹${totalNew.toLocaleString()}*\n`
                msg += `${totalDiff >= 0 ? '📈' : '📉'} Net change: *${totalSign}₹${Math.abs(totalDiff).toLocaleString()}*`

                return M.reply(msg.trim())
            } else {
                const r = results[0]
                const emoji = getTierEmoji(r.card.tier)
                const diff = r.newPrice - r.oldPrice
                const sign = diff >= 0 ? '+' : ''
                const arrow = diff > 0 ? '📈' : diff < 0 ? '📉' : '➡️'
                const bd = r.breakdown

                let msg = `📊 *CARD REVALUATION REPORT*\n\n`
                msg += `${emoji} *${r.card.title}*\n`
                msg += `🎏 Tier: *${r.card.tier}*\n\n`
                msg += `*PRICE CHANGE*\n`
                msg += `Old price:  ₹${r.oldPrice.toLocaleString()}\n`
                msg += `Old base:   ₹${r.oldBasePrice.toLocaleString()}\n`
                msg += `New price:  *₹${r.newPrice.toLocaleString()}*\n`
                msg += `New base:   ₹${r.newBasePrice.toLocaleString()}\n`
                msg += `${arrow} Net change: *${sign}₹${Math.abs(diff).toLocaleString()}*\n\n`
                msg += `*VALUATION BREAKDOWN*\n`
                msg += `🌐 Total users:      ${bd.totalUsers}\n`
                msg += `🃏 Total cards:      ${bd.totalCards.toLocaleString()}\n`
                msg += `🎴 ${r.card.tier} cards: ${bd.tierCount.toLocaleString()} in circulation\n`
                msg += `📐 Tier fair value:  ₹${bd.tierBase.toLocaleString()}\n`
                msg += `💎 Scarcity mult:    ${bd.scarcityMult}×\n`
                msg += `📊 Economy factor:   ${bd.economyFactor}×\n`
                msg += `📉 Market correction: ${bd.correctionFactor}×\n`
                msg += `⚡ Raw market price: ₹${bd.rawPrice.toLocaleString()}\n\n`
                msg += `💰 *Fee charged:* ₹${cost.toLocaleString()}\n`
                // FIX: was `message +=` (undefined variable) — should be `msg +=`
                if (taxAmount > 0) {
                    msg += `🏛️ Tax: ₹${taxAmount.toLocaleString()}\n`
                }

                return M.reply(msg.trim())
            }
        } catch (err) {
            console.error('[REVALUE ERROR]', err)
            return M.reply('❌ An error occurred during revaluation. Please try again.')
        }
    }
)
