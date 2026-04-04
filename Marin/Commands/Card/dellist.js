// lib/commands/delist.js
const fs = require("fs");
const { mkcard, mkmarket } = require("../../Database/dataschema.js");
const CardMgr = require("../../lib/cardManager.js");
const { processCardMedia } = require("../../lib/converter.js"); // MP4 SUPPORT

module.exports = {
    name: "delist",
    alias: ["removemarket", "retrieve", "unlist"],
    desc: "Remove a listed card from the global market and return it to your collection",
    category: "Cards",
    usage: "delist <market_number | card_id>",
    react: "↩️",

    start: async (Miku, m, { text, args, prefix, pushName }) => {
        if (!args[0]) {
            return m.reply(
                `⚠️ *Which card do you want to retrieve, Senpai?*  

Use:\n` +
                `• By Number → *${prefix}delist 1*\n` +
                `• By Card ID → *${prefix}delist cx123*`
            );
        }

        const input = args[0];
        const seller = m.sender;
        let targetListing = null;

        // If input is a number → treat as market index
        if (!isNaN(input)) {
            const index = parseInt(input) - 1;

            const myListings = await mkmarket.find({ seller });

            if (!myListings.length)
                return m.reply("📉 *You do not have any cards listed in the market right now!*");

            if (index < 0 || index >= myListings.length)
                return m.reply(`❌ Invalid number! You only have *${myListings.length}* listed items.`);

            targetListing = myListings[index];
        } else {
            // treat as cardId
            targetListing = await mkmarket.findOne({ seller, cardId: input });
        }

        if (!targetListing) {
            return m.reply("🚫 *This card is not currently listed by you in the market.*");
        }

        // Fetch full card details
        const card = CardMgr.getCardById(targetListing.cardId);
        if (!card) return m.reply("⚠️ Card details missing from database.");

        // Remove listing
        await mkmarket.deleteOne({ _id: targetListing._id });

        // Restore card into inventory
        let existing = await mkcard.findOne({ owner: seller, cardId: card.id });
        if (existing) {
            existing.count += 1;
            await existing.save();
        } else {
            await new mkcard({
                owner: seller,
                cardId: card.id,
                count: 1
            }).save();
        }

        // Build pretty tier stars
        const stars = "⭐".repeat(card.tier || 1);

        // Extra details
        const attributes = card.specialAttributes?.length 
            ? card.specialAttributes.join(", ")
            : "None";

        const creators = card.creators?.length 
            ? card.creators.join(", ")
            : "Unknown";

        const value = card.price ? card.price.toLocaleString() : "???";

        // Caption block
        const caption = 
`↩️ *CARD RETRIEVED SUCCESSFULLY!*  
Your treasure has returned home safely, Senpai~ 💖✨

━━━━━━━━━━━━━━━━━━
🃏 *Card:* ${card.title}  
📺 *Series:* ${card.series}  
💎 *Tier:* ${stars}  
🎨 *Artist:* ${creators}  
🪄 *Attributes:* ${attributes}  
💰 *Listed Price:* ${targetListing.price.toLocaleString()} Gold  
🗃️ *Base Value:* ${value}
━━━━━━━━━━━━━━━━━━

It has been removed from the global market and restored to your inventory~ 🎒💞`;

        // Media processing for MP4 / WEBM support
        const processed = await processCardMedia(card.imageUrl);
        let msg = {};
        let deleteAfter = null;

        try {
            if (processed.type === "video") {
                msg = {
                    video: { url: processed.path },
                    caption,
                    footer: `${global.botName} Marketplace`,
                    gifPlayback: true,
                    buttons: [
                        { buttonId: `${prefix}collection`, buttonText: { displayText: "🎒 My Collection" }, type: 1 },
                        { buttonId: `${prefix}market`, buttonText: { displayText: "🏪 Back to Market" }, type: 1 }
                    ]
                };

                deleteAfter = processed.path;
            } else {
                msg = {
                    image: { url: card.imageUrl },
                    caption,
                    footer: `${global.botName} Marketplace`,
                    buttons: [
                        { buttonId: `${prefix}collection`, buttonText: { displayText: "🎒 My Collection" }, type: 1 },
                        { buttonId: `${prefix}market`, buttonText: { displayText: "🏪 Back to Market" }, type: 1 }
                    ]
                };
            }

            await Miku.sendMessage(m.from, msg, { quoted: m });

            // Auto-delete processed MP4
            if (deleteAfter && fs.existsSync(deleteAfter)) {
                fs.unlinkSync(deleteAfter);
            }

        } catch (err) {
            console.error("Send error in delist:", err);
            return m.reply("⚠️ Card retrieved but preview failed to send.");
        }
    }
};