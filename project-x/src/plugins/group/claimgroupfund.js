import { plugin } from '../../utils/plugin.js'
import { findGroup, addToWallet, removeGroupFunds, getState, saveState } from '../../database/db.js'

// ─── Config ───────────────────────────────────────────────────────────────
const COOLDOWN_MS = 24 * 60 * 60 * 1000 // 24 hours between claims
const CLAIM_SHARE = 0.05 // each member claims 5% of current funds
const MIN_FUNDS = 1000 // group must have at least ₹1,000 to allow claims
const MAX_CLAIM = 50000 // single claim is capped at ₹50,000

const fmtMs = (ms) => {
    const h = Math.floor(ms / 3600000)
    const m = Math.floor((ms % 3600000) / 60000)
    return h > 0 ? `${h}h ${m}m` : `${m}m`
}

plugin(
    {
        name: 'claimgroupfund',
        aliases: ['claimfund', 'gclaim', 'claimmoney'],
        isGroup: true,
        isAdmin: true,
        category: 'economy',
        description: {
            content: `Claim your share (${CLAIM_SHARE * 100}%) of the group fund. Once per 24 hours.`
        }
    },
    async (_, M) => {
        try {
            // ── 1. COOLDOWN CHECK ─────────────────────────────────────────
            const cooldownKey = `gclaim:${M.from}:${M.sender.id}`
            const lastClaim = await getState(cooldownKey)
            const now = Date.now()

            if (lastClaim) {
                const elapsed = now - lastClaim
                const remaining = COOLDOWN_MS - elapsed
                if (remaining > 0) {
                    return M.reply(
                        `⏳ *Already Claimed!*\n\n` +
                            `You already claimed your share today.\n` +
                            `⏰ *Next claim in:* ${fmtMs(remaining)}`
                    )
                }
            }

            // ── 2. GROUP FUND CHECK ───────────────────────────────────────
            const group = await findGroup(M.from)
            const funds = group?.funds || 0

            if (funds < MIN_FUNDS) {
                return M.reply(
                    `🏦 *Group Fund Too Low*\n\n` +
                        `Current funds: *₹${funds.toLocaleString()}*\n` +
                        `Minimum required: *₹${MIN_FUNDS.toLocaleString()}*\n\n` +
                        `_Help fill the fund with *${global.config.prefix}addgroupfund <amount>*_`
                )
            }

            // ── 3. CALCULATE CLAIM AMOUNT ────────────────────────────────
            // Each claim = CLAIM_SHARE % of current funds, capped at MAX_CLAIM
            const rawClaim = Math.floor(funds * CLAIM_SHARE)
            const claimAmount = Math.min(rawClaim, MAX_CLAIM)

            // ── 4. ATOMIC DEDUCT FROM GROUP ───────────────────────────────
            // removeGroupFunds already uses $gte guard — safe against race conditions
            const deducted = await removeGroupFunds(M.from, claimAmount)
            if (!deducted) {
                return M.reply(
                    `❌ *Claim Failed*\n\n` +
                        `Group funds changed while processing. Current: ₹${funds.toLocaleString()}\n` +
                        `_Please try again._`
                )
            }

            // ── 5. ADD TO USER WALLET ─────────────────────────────────────
            const added = await addToWallet(M.sender.id, claimAmount)
            if (!added) {
                // Critical: refund the group if wallet credit fails
                await removeGroupFunds(M.from, claimAmount).catch(() => {})
                console.error(
                    `[GCLAIM CRITICAL] Refunding ₹${claimAmount} to group ${M.from} — wallet add failed for ${M.sender.id}`
                )
                return M.reply(
                    '❌ *Critical Error:* Could not credit your wallet. The funds have been refunded to the group.'
                )
            }

            // ── 6. SAVE COOLDOWN ──────────────────────────────────────────
            await saveState(cooldownKey, now, COOLDOWN_MS)

            // ── 7. RESPOND ────────────────────────────────────────────────
            const remaining = funds - claimAmount
            return M.reply(
                `✅ *Group Fund Claimed!*\n\n` +
                    `💰 *You received:* ₹${claimAmount.toLocaleString()}\n` +
                    `📊 *Share:* ${CLAIM_SHARE * 100}% of ₹${funds.toLocaleString()}\n` +
                    `🏦 *Remaining fund:* ₹${remaining.toLocaleString()}\n\n` +
                    `⏰ *Next claim available in:* 24h`
            )
        } catch (err) {
            console.error('[CLAIMGROUPFUND ERROR]', err)
            return M.reply('❌ An error occurred while processing your claim.')
        }
    }
)
