const fs = require("fs");
const { mkcard, mku } = require("../../Database/dataschema.js");
const CardMgr = require("../../lib/cardManager.js");
const { processCardMedia } = require("../../lib/converter.js"); // ⬅ NEW: Convert .webm → mp4

module.exports = {
    name: "claim",
    alias: ["claim"],
    desc: "Claim a card spawned in the group",
    category: "Cards",
    usage: "claim <code>",
    react: "🍁",

    start: async (Miku, m, { text, prefix, pushName, eco }) => {
        if (!global.spawnedCards || !global.spawnedCards.has(m.from)) {
            return m.reply(
                `⏳ *Ara ara, ${pushName}…*\nThere is no card to claim right now!\nBe patient until the next spawn arrives! 💫`
            );
        }

        const spawnData = global.spawnedCards.get(m.from);
        const card = spawnData.card;

        if (!text || text.trim() !== spawnData.claimCode) {
            return m.reply(
                `❌ *Incorrect Claim Code!*  
😣 Baka! That’s not the right code.

✨ **Correct Code:** *${spawnData.claimCode}*
Hurry before the card disappears! 💨`
            );
        }
        const cardPrice = card.price || 0;
        const currency = "cara";

        const balance = await eco.balance(m.sender, currency);

        if (balance.wallet < cardPrice) {
            return m.reply(
                `💸 *Insufficient Funds!*  
You need *${cardPrice}* to claim this card!

Your Wallet: *${balance.wallet}*  
Earn more coins first, Senpai! 🔨`
            );
        }

        // Deduct money
        await eco.deduct(m.sender, currency, cardPrice);
        const duplicate = await mkcard.findOne({ owner: m.sender, cardId: card.id });
        let responseText = "";
        const stars = "⭐".repeat(card.tier || 1);

        if (duplicate) {
            duplicate.count += 1;
            await duplicate.save();

            responseText = `♻️ *Duplicate Obtained!*  
You already owned **${card.title}**, so your count increased!

📦 Total Copies: *${duplicate.count}*`;
        } else {
            await new mkcard({
                owner: m.sender,
                cardId: card.id,
                count: 1,
            }).save();

            responseText = `🎉 *Card Successfully Claimed!* 🎉

👤 *User:* ${pushName}
💰 *Paid:* ${cardPrice}
🃏 *Card:* ${card.title}
🎞 *Series:* ${card.series}
💎 *Tier:* ${stars}

Remaining Wallet: *${balance.wallet - cardPrice}*`;
        }
        await CardMgr.markAsUsed(card.id, m.sender);
        await CardMgr.releaseSpawn(card.id);

        // Remove from in-memory spawn list
        global.spawnedCards.delete(m.from);
        await CardMgr.saveSpawned(Object.fromEntries(global.spawnedCards.entries()));
        const processedMedia = await processCardMedia(card.imageUrl);

        let msgPayload = {};
        let fileToDelete = null;

        if (processedMedia.type === "video") {
            msgPayload = {
                video: { url: processedMedia.path },
                caption: responseText,
                gifPlayback: true
            };

            fileToDelete = processedMedia.path; // auto-delete later

        } else {
            msgPayload = {
                image: { url: card.imageUrl },
                caption: responseText
            };
        }

        const buttons = [
            {
                buttonId: `${prefix}collection`,
                buttonText: { displayText: "📚 My Collection" },
                type: 1,
            },
            {
                buttonId: `${prefix}wallet`,
                buttonText: { displayText: "💰 My Wallet" },
                type: 1,
            },
            {
                buttonId: `${prefix}profile`,
                buttonText: { displayText: "🧬 My Profile" },
                type: 1,
            }
        ];

        const finalMessage = {
            ...msgPayload,
            buttons,
            footer: `✨ ${global.botName} — Card Claimed Successfully!`,
            type: 4
        };

        await Miku.sendMessage(m.from, finalMessage, { quoted: m });
        if (fileToDelete && fs.existsSync(fileToDelete)) {
            try {
                fs.unlinkSync(fileToDelete);
                console.log("Auto-deleted MP4:", fileToDelete);
            } catch (err) {
                console.error("Failed to delete MP4:", err);
            }
        }
    }
};