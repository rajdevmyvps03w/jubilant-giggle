const fs = require("fs");
const { mkcard, mkmarket } = require("../../Database/dataschema.js");
const CardMgr = require("../../lib/cardManager.js");
const { processCardMedia } = require("../../lib/converter.js"); // <-- MP4 SUPPORT ADDED

module.exports = {
    name: "buycard",
    alias: ["buyc", "purchase"],
    desc: "Buy a card from the market by Number or ID",
    category: "Cards",
    usage: "buycard <market_number | card_id>",
    react: "💳",

    start: async (Miku, m, { text, args, eco, prefix, pushName }) => {
        if (!args[0]) {
            return m.reply(
                `🛍️ *Which card do you want to buy from cardmarket?*\n\n` +
                `Usage:\n` +
                `• By Number → *${prefix}buycard 1*\n` +
                `• By Card ID → *${prefix}buycard cx123*`
            );
        }

        const input = args[0];
        const buyer = m.sender;
        const currency = "cara";
        let targetListing = null;

        if (!isNaN(input)) {
            const index = parseInt(input) - 1;

            const listings = await mkmarket.find({}).sort({ price: 1 });
            if (!listings.length) return m.reply("🏪 *The market is empty right now!*");

            if (index < 0 || index >= listings.length) {
                return m.reply(`❌ Invalid number! There are *${listings.length}* items in the market.`);
            }

            targetListing = listings[index];
        } else {
            // Find cheapest listing for that card
            targetListing = await mkmarket.findOne({ cardId: input }).sort({ price: 1 });
        }

        if (!targetListing) {
            return m.reply("❌ This card isn't listed in the market!");
        }
        if (targetListing.seller === buyer) {
            return m.reply(`😅 You can't buy your own card!\nUse *${prefix}delist ${input}* to reclaim it.`);
        }
        const balance = await eco.balance(buyer, currency);

        if (balance.wallet < targetListing.price) {
            return m.reply(
                `💸 *Insufficient Funds!*\n\n` +
                `Price: *${targetListing.price.toLocaleString()}* Gold\n` +
                `You Have: *${balance.wallet.toLocaleString()}*\n\n` +
                `Time to grind more, Senpai! 🔨`
            );
        }

        const card = CardMgr.getCardById(targetListing.cardId);
        await eco.deduct(buyer, currency, targetListing.price);
        await eco.give(targetListing.seller, currency, targetListing.price);

        // Remove from market
        await mkmarket.deleteOne({ _id: targetListing._id });

        // Add to buyer inventory
        const existingCard = await mkcard.findOne({ owner: buyer, cardId: targetListing.cardId });

        if (existingCard) {
            existingCard.count += 1;
            await existingCard.save();
        } else {
            await new mkcard({
                owner: buyer,
                cardId: targetListing.cardId,
                count: 1
            }).save();
        }
        const stars = "⭐".repeat(card.tier || 1);
        const attributes = card.specialAttributes?.length ? card.specialAttributes.join(", ") : "None";
        const creator = card.creators?.join(", ") || "Unknown";
        const value = card.price ? card.price.toLocaleString() : "???";

        const caption =
`🎉 *Purchase Successful!* 🛍️  
━━━━━━━━━━━━━━━━━━

🃏 *Card:* ${card.title}  
📺 *Series:* ${card.series}  
💎 *Tier:* ${stars}  
🎨 *Artist:* ${creator}  
🪄 *Attributes:* ${attributes}  
💰 *Price Paid:* ${targetListing.price.toLocaleString()} Gold  
💼 *Base Value:* ${value}  

👤 *Seller:* @${targetListing.seller.split("@")[0]}  
🆕 *New Owner:* ${pushName}  
━━━━━━━━━━━━━━━━━━
Your new treasure has been safely added to your inventory, Senpai~ 💖✨`;

        const processed = await processCardMedia(card.imageUrl);

        let msgData = {};
        let deleteAfter = null;

        try {
            if (processed.type === "video") {
                msgData = {
                    video: { url: processed.path },
                    caption,
                    footer: `${global.botName} Market`,
                    buttons: [
                        { buttonId: `${prefix}collection`, buttonText: { displayText: "🎒 Inventory" }, type: 1 },
                        { buttonId: `${prefix}market`, buttonText: { displayText: "🏪 Back to Market" }, type: 1 }
                    ],
                    mentions: [targetListing.seller]
                };

                deleteAfter = processed.path;

            } else {
                msgData = {
                    image: { url: card.imageUrl },
                    caption,
                    footer: `${global.botName} Market`,
                    buttons: [
                        { buttonId: `${prefix}collection`, buttonText: { displayText: "🎒 Inventory" }, type: 1 },
                        { buttonId: `${prefix}market`, buttonText: { displayText: "🏪 Back to Market" }, type: 1 }
                    ],
                    mentions: [targetListing.seller]
                };
            }

            await Miku.sendMessage(m.from, msgData, { quoted: m });

            // Auto-delete converted MP4
            if (deleteAfter && fs.existsSync(deleteAfter)) {
                fs.unlinkSync(deleteAfter);
                console.log("Auto-deleted buycard MP4:", deleteAfter);
            }

        } catch (err) {
            console.error("Send error in buycard:", err);
            m.reply("⚠️ Purchase completed but preview failed to load.");
        }
    }
};