import fs from 'fs'
import {
    getGroupsByFeatureState,
    getDynamicCardPrice,
    isGroupFeatureActive,
    saveState,
    deleteState
} from '../database/db.js'
import {
    gifToMp4,
    webpToMp4,
    getRandomInt,
    getBuffer,
    webpToPng,
    fetch,
    realURL,
    getRandomItem
} from '../functions/helpler.js'
import { generatePuzzle, getDifficultyLabel } from '../functions/mathpuzzle.js'
import { GroupActivity } from '../database/models/index.js' // add to existing imports

const INACTIVITY_WINDOW_DAYS = 2 // look back 2 days
const MIN_MSGS_TO_SPAWN = 20 // need at least 10 messages in that window

const getRecentGroupMessageCount = async (groupId) => {
    const windowKeys = []
    for (let i = 0; i < INACTIVITY_WINDOW_DAYS; i++) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        windowKeys.push(d.toISOString().slice(0, 10))
    }

    const records = await GroupActivity.find({ groupId }, { dailyCounts: 1, _id: 0 }).lean()

    let total = 0
    for (const record of records) {
        for (const key of windowKeys) {
            total += record.dailyCounts?.[key] || 0
        }
    }
    return total
}

// --- CONFIGURATION ---
const EXCLUSIVE_TIERS = ['Tier 6', 'Tier 5', 'Tier S', 'SSR', 'UR']
const JSON_PATH = './cards.json'
const MAZ_JSON = './cards_restructured.json'
const CARD_CLAIM_WINDOW_MS = 60 * 60 * 1000

const TIER_DATA = {
    C: { range: [8_000, 15_000], emoji: '🔰' },
    'Tier 1': { range: [8_000, 15_000], emoji: '🔰' },

    'Tier 2': { range: [20_000, 45_000], emoji: '🪄' },

    'Tier 3': { range: [50_000, 110_000], emoji: '🔭' },

    'Tier 4': { range: [120_000, 250_000], emoji: '🔮' },
    R: { range: [120_000, 250_000], emoji: '🔮' },

    'Tier 5': { range: [260_000, 500_000], emoji: '🔯' },
    SR: { range: [260_000, 500_000], emoji: '🔯' },

    'Tier 6': { range: [550_000, 1_000_000], emoji: '🧧' },
    SSR: { range: [550_000, 1_000_000], emoji: '🧧' },

    'Tier S': { range: [1_100_000, 2_200_000], emoji: '👑' },
    UR: { range: [1_100_000, 2_200_000], emoji: '👑' }
}

// --- SHARED UTILS ---

export const getPrice = (tier) => {
    const { range } = TIER_DATA[tier] || { range: [500, 1000] }
    return getRandomInt(range[0], range[1])
}

export const getTierEmoji = (tier) => TIER_DATA[tier]?.emoji || '🔰'

const safeFetch = async (url, retries = 3) => {
    try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 10000)

        const response = await fetch(url, { signal: controller.signal })
        clearTimeout(timeout)

        if (!response) {
            return null
        }
        return response
    } catch (err) {
        if (retries > 0) {
            await new Promise((r) => setTimeout(r, 500))
            return safeFetch(url, retries - 1)
        }
        return null
    }
}

// --- SHOOB LOGIC (API + LOCAL FALLBACK) ---
const getShoobCard = async (id, exclusive) => {
    let card = null

    // 1. Try API First with deep error catching
    try {
        const apiId =
            id || (await safeFetch(`https://api-fawn-seven-28.vercel.app/api/shoobRandom?exclusive=${exclusive}`))?.id

        if (apiId) {
            const apiCard = await safeFetch(`https://api-fawn-seven-28.vercel.app/api/getCard?id=${apiId}`)
            // Only accept it if it has a valid tier
            if (apiCard && apiCard.tier) {
                card = apiCard
            }
        }
    } catch (apiErr) {
        console.error('[API_ERROR] Shoob API failed, switching to local:', apiErr.message)
    }

    // 2. Local Storage Fallback (Executes if API failed OR returned no card)
    if (!card && fs.existsSync(JSON_PATH)) {
        try {
            const localData = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'))
            const pool = localData.filter((c) => {
                const isHigh = EXCLUSIVE_TIERS.includes(c.tier)
                return exclusive ? isHigh : !isHigh
            })
            if (pool.length) {
                card = getRandomItem(pool)
            }
        } catch (e) {
            console.error('[LOCAL_ERROR] Shoob JSON Read Error:', e)
        }
    }
    return card
}

// --- MAZOKU LOGIC (API + LOCAL FALLBACK) ---
export const getMazokuCard = async (uuid, exclusive) => {
    let card = null
    try {
        const targetUuid =
            uuid ||
            (await safeFetch(`https://api-fawn-seven-28.vercel.app/api/mazokuRandom?exclusive=${exclusive}`))?.id

        if (targetUuid) {
            const apiCard = await safeFetch(`https://api-fawn-seven-28.vercel.app/api/mazokuCard?uuid=${targetUuid}`)
            // Only accept it if it has a valid tier
            if (apiCard && apiCard.tier) {
                card = apiCard
            }
        }
    } catch (apiErr) {
        console.error('[API_ERROR] Mazoku API failed, switching to local:', apiErr.message)
    }

    if (!card && fs.existsSync(MAZ_JSON)) {
        try {
            const localData = JSON.parse(fs.readFileSync(MAZ_JSON, 'utf8'))
            const pool = localData.filter((c) => {
                const isHigh = EXCLUSIVE_TIERS.includes(c.tier)
                return exclusive ? isHigh : !isHigh
            })
            if (pool.length) {
                card = getRandomItem(pool)
            }
        } catch (e) {
            console.error('[LOCAL_ERROR] Mazoku JSON Read Error:', e)
        }
    }
    return card
}

// --- CORE DISPATCHER ---

export const summonCard = async (provider, id, jid, client, forced = false, exclusive = false) => {
    try {
        // 1. Fetch Data based on Provider
        let card = provider === 'maz' ? await getMazokuCard(id, exclusive) : await getShoobCard(id, exclusive)

        if (!card || !card.tier) {
            throw new Error(`Empty data from ${provider}`)
        }

        // 2. Meta & Price
        const emoji = getTierEmoji(card.tier)
        const basePrice = getPrice(card.tier)
        const price = await getDynamicCardPrice(basePrice, jid)
        const isGif = card.tier == 'Tier 5' ? false : EXCLUSIVE_TIERS.includes(card.tier) // Ensure Tier 6, S, SSR, UR are GIFs

        // 3. Media Processing
        let mediaUrl =
            provider === 'maz' ? card.image : await realURL(`https://asapi.shoob.gg/site/api/cardr/${card.id}`)
        if (provider !== 'maz' && mediaUrl.toLowerCase().endsWith('.webm')) {
            mediaUrl = mediaUrl.replace(/\.webm$/i, '.gif')
        }

        const buffer = await getBuffer(mediaUrl, provider === 'maz')
        let media, mimetype

        if (isGif) {
            media = provider === 'maz' ? await webpToMp4(buffer) : await gifToMp4(buffer)
            mimetype = 'video/mp4'
        } else {
            media = provider === 'maz' ? await webpToPng(buffer) : buffer
            mimetype = provider === 'maz' ? 'image/png' : 'image/jpeg'
        }

        // 4. Save State

        card = {
            ...card,
            price,
            forced,
            type: provider,
            basePrice
        }

        const diffLabel = getDifficultyLabel(card.tier)
        const puzzle = generatePuzzle(card.tier)

        // 5. Build Caption & Send
        const caption = [
            !forced ? (isGif ? '*_Woah! A Rare Card Appeared!_*' : '*A Collectable Card Appeared!*') : '',
            '🃏 ```Card Details``` 🃏',
            '',
            `💠 *Title: ${card.title}*`,
            `👑 *Tier: ${card.tier} ${emoji}*`,
            `💰 *Price: ₹${price}*`,
            `📝 *Description: ${card.title} from ${card.source}*\n`,
            '',
            !forced
                ? [
                      `🧮 *Solve to Claim!* ${diffLabel}`,
                      ``,
                      `❓ *${puzzle.question}*`,
                      ``,
                      `_Use *${global.config.prefix}claim <answer>* to claim_`,
                      `_Example: ${global.config.prefix}claim 06_`
                  ].join('\n')
                : ''
        ]
            .filter((line) => line !== '')
            .join('\n')
            .trim()

        await client.sendMessage(jid, {
            [isGif ? 'video' : 'image']: media,
            gifPlayback: isGif,
            mimetype,
            caption
        })

        if (!forced) {
            card['puzzle'] = puzzle
            await deleteState(`${jid}:card`)
            await saveState(`${jid}:card`, card, CARD_CLAIM_WINDOW_MS) // ← pass duration
        }

        return card
    } catch (e) {
        console.error(`[SUMMON_ERROR] Provider: ${provider} | Reason: ${e.message}`)
    }
}

/**
 * Automated Spawner for Groups
 * This handles the logic for choosing the provider and the rarity.
 */
export const runDailyCardSpawn = async (client) => {
    try {
        const participatingGroups = await client.groupFetchAllParticipating().catch(() => ({}))
        const participatingIds = Object.keys(participatingGroups)
        const dbGroups = await getGroupsByFeatureState('card_spawn', 'active')
        const activeGroups = dbGroups.filter((g) => participatingIds.includes(g.id))

        if (!activeGroups.length) {
            return
        }

        for (let i = 0; i < activeGroups.length; i += 3) {
            const batch = activeGroups.slice(i, i + 3)

            await Promise.allSettled(
                batch.map(async (group) => {
                    const meta = await client.cachedGroupMetadata(group.id)
                    if (!meta || meta.announce) {
                        return
                    }

                    // ── Inactivity check ─────────────────────────────────────
                    const recentMsgs = await getRecentGroupMessageCount(group.id)
                    if (recentMsgs < MIN_MSGS_TO_SPAWN) {
                        console.log(
                            `[SPAWN SKIPPED] ${group.id.split('@')[0]} only ${recentMsgs} messages in last ${INACTIVITY_WINDOW_DAYS} days (need ${MIN_MSGS_TO_SPAWN})`
                        )
                        await client.sendMessage(group.id, {
                            text:
                                `🃏 *Card Spawn Skipped*\n\n` +
                                `This group has been inactive lately.\n` +
                                `📊 Only *${recentMsgs} messages* sent in the last ${INACTIVITY_WINDOW_DAYS} days.\n\n` +
                                `_Cards will spawn again once the group reaches ${MIN_MSGS_TO_SPAWN}+ messages in a ${INACTIVITY_WINDOW_DAYS}-day window. Start chatting!_ 💬`
                        })
                        return
                    }
                    // ─────────────────────────────────────────────────────────

                    let exclusive = false
                    const isExclusiveMode = await isGroupFeatureActive(group.id, 'exclusive_card_spawn')
                    if (isExclusiveMode) {
                        const roll1 = getRandomInt(0, 50)
                        const roll2 = getRandomInt(40, 100)
                        if (roll1 > roll2) {
                            exclusive = true
                        }
                    }

                    const providerType = getRandomInt(0, 1)
                    const provider = providerType === 0 ? 'maz' : 'shoob'
                    return summonCard(provider, null, group.id, client, false, exclusive)
                })
            )

            await new Promise((r) => setTimeout(r, 1000))
        }
    } catch (error) {
        console.error(`[DAILY_SPAWN_ERROR]`, error)
    }
}

export const summonMazCard = (id, jid, client, forced, exclusive) =>
    summonCard('maz', id, jid, client, forced, exclusive)

export const summonShoobCard = (id, jid, client, forced, exclusive) =>
    summonCard('shoob', id, jid, client, forced, exclusive)
