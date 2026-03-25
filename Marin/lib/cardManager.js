// cardManager.js
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
// Database Schema import
const { mkhistory } = require('../Database/dataschema.js'); 

// Paths
const cardsPath = path.join(__dirname, '../cards.json');
const spawnedCachePath = path.join(__dirname, '../database/spawned_cache.json');
let allCards = [];

// Load cards.json
try {
    if (fs.existsSync(cardsPath)) {
        allCards = JSON.parse(fs.readFileSync(cardsPath, 'utf8'));
        console.log(chalk.green(`[CardManager] Loaded ${allCards.length} total cards.`));
    } else {
        console.log(chalk.red('[CardManager] Error: cards.json not found!'));
    }
} catch (err) {
    console.error('[CardManager] Error reading cards.json:', err);
}

/**
 * Helper: atomic file write (write to temp + rename) to avoid corruption
 */
function atomicWriteSync(filePath, data) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const tmp = filePath + '.tmp';
    fs.writeFileSync(tmp, data);
    fs.renameSync(tmp, filePath);
}

module.exports = {
    // Saare cards ka data
    getAllCards: () => allCards,

    // ID se card dhundo
    getCardById: (id) => allCards.find(c => String(c.id) === String(id)),

    // Name se card dhundo
    getCardByName: (query) => {
        if(!query) return null;
        return allCards.find(c => c.title.toLowerCase().includes(query.toLowerCase()));
    },

    // --- MAIN LOGIC: Database se check karo kaunse cards bache hain ---
    getAvailableCards: async () => {
        try {
            // DB se wo saari IDs nikalo jo permanently used/claimed hain
            const historyDocs = await mkhistory.find({});
            const usedCardIds = historyDocs.map(doc => String(doc.cardId));

            // Filter: Total Cards me se wo hata do jo used hain
            const available = allCards.filter(card => !usedCardIds.includes(String(card.id)));
            
            return available;
        } catch (e) {
            console.error("Error fetching available cards:", e);
            return [];
        }
    },

    // Random available card (null agar koi bacha hi nahi)
    getRandomAvailableCard: async () => {
        const avail = await module.exports.getAvailableCards();
        if (!avail || avail.length === 0) return null;
        return avail[Math.floor(Math.random() * avail.length)];
    },

    // --- Mark Card as permanently USED (call this when a user CLAIMS the card) ---
    // This uses upsert so duplicate/index issues won't crash.
    markAsUsed: async (cardId, claimedBy = null) => {
        try {
            if (!cardId) return null;
            const filter = { cardId: String(cardId) };
            const update = {
                $set: {
                    cardId: String(cardId),
                    claimedAt: new Date(),
                }
            };
            if (claimedBy) update.$set.claimedBy = String(claimedBy);

            // upsert: true -> insert if not exists, else update
            const opts = { upsert: true, new: true, setDefaultsOnInsert: true };
            const doc = await mkhistory.findOneAndUpdate(filter, update, opts);
            console.log(chalk.gray(`[CardManager] markAsUsed -> ${cardId} by ${claimedBy || 'SYSTEM'}`));
            return doc;
        } catch (e) {
            console.error("Error marking card as used (markAsUsed):", e);
            return null;
        }
    },

    // --- TEMPORARY spawn-reserve functions (keep track of active spawns in file) ---
    // These are NOT the permanent "used" flag. Use markAsUsed WHEN USER CLAIMS.

    // getSpawned returns object mapping cardId -> { spawnedAt, groupId?, expiresAt? }
    getSpawned: async () => {
        try {
            if (fs.existsSync(spawnedCachePath)) {
                const raw = fs.readFileSync(spawnedCachePath, 'utf8');
                if (!raw) return {};
                return JSON.parse(raw);
            }
            return {};
        } catch (e) {
            console.error("[CardManager] getSpawned parse error, returning empty:", e);
            return {};
        }
    },

    // saveSpawned writes atomically
    saveSpawned: async (data) => {
        try {
            atomicWriteSync(spawnedCachePath, JSON.stringify(data, null, 2));
        } catch (e) { 
            console.error("Failed to save spawned cache:", e);
        }
    },

    // reserve a card for spawning (so same card isn't spawned simultaneously)
    reserveSpawn: async (cardId, meta = {}) => {
        try {
            const spawned = await module.exports.getSpawned();
            if (spawned[cardId]) return false; // already reserved
            spawned[cardId] = {
                spawnedAt: new Date().toISOString(),
                meta
            };
            await module.exports.saveSpawned(spawned);
            return true;
        } catch (e) {
            console.error("reserveSpawn error:", e);
            return false;
        }
    },

    // release a temporary spawn reservation (call when claim or expire)
    releaseSpawn: async (cardId) => {
        try {
            const spawned = await module.exports.getSpawned();
            if (!spawned[cardId]) return false;
            delete spawned[cardId];
            await module.exports.saveSpawned(spawned);
            return true;
        } catch (e) {
            console.error("releaseSpawn error:", e);
            return false;
        }
    }
};