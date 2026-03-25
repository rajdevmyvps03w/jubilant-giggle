const fs = require("fs");
const { mkcard, mkmarket } = require("../../Database/dataschema.js");
const CardMgr = require("../../lib/cardManager.js");
const { processCardMedia } = require("../../lib/converter.js");

module.exports = {
    name: "addlist",
    alias: ["sellmarket", "addtomarket", "addlist"],
    desc: "List a card for sale in the Global Market by Deck Number or ID",
    category: "Cards",
    usage: "list <deck_number | card_id> <price>",
    react: "🏷️",

    start: async (Miku, m, { text, args, prefix, pushName }) => {

        if (!args[0] || !args[1]) {
            return m.reply(
                `⚠️ *Invalid Format!*  
Use:\n` +
                `• By Number: *${prefix}list 4 5000*\n` +
                `• By ID: *${prefix}list card_id 5000*`
            );
        }

        const input = args[0];
        const price = parseInt(args[1]);
        let targetCardId = null;

        if (isNaN(price) || price < 1) {
            return m.reply("❌ *Price must be a positive number!*");
        }
        if (!isNaN(input)) {
            const index = parseInt(input) - 1;

            let userCardsDB = await mkcard.find({ owner: m.sender });
            if (!userCardsDB.length) return m.reply("🎒 Your collection is empty!");

            let fullCards = userCardsDB.map(uc => {
                const details = CardMgr.getCardById(uc.cardId);
                return details ? { ...details, dbData: uc } : null;
            }).filter(Boolean);

            fullCards.sort((a, b) => b.tier - a.tier || a.title.localeCompare(b.title));

            if (index < 0 || index >= fullCards.length) {
                return m.reply(`❌ Invalid number! You only have *${fullCards.length}* cards.`);
            }

            targetCardId = fullCards[index].id;
        } else {
            targetCardId = input;
        }
        const userCard = await mkcard.findOne({ owner: m.sender, cardId: targetCardId });
        if (!userCard) {
            return m.reply("🚫 *You don’t own this card, Senpai!*");
        }
        if (userCard.count > 1) {
            userCard.count -= 1;
            await userCard.save();
        } else {
            await mkcard.deleteOne({ owner: m.sender, cardId: targetCardId });
        }
        await new mkmarket({
            seller: m.sender,
            cardId: targetCardId,
            price
        }).save();

        const card = CardMgr.getCardById(targetCardId);
        const processed = await processCardMedia(card.imageUrl);
        const stars = "⭐".repeat(card.tier || 1);
        const attributes = card.specialAttributes?.length
            ? card.specialAttributes.join(", ")
            : "None";
        const creators = card.creators?.join(", ") || "Unknown";
        const value = card.price ? card.price.toLocaleString() : "???";

        const caption = 
`🏷️ *Card Listed Successfully!* 💖  
Your card is now visible in the *Global Market!* 🌍

━━━━━━━━━━━━━━━
👤 *Seller:* ${pushName}  
🃏 *Card:* ${card.title}  
📺 *Series:* ${card.series}  
💎 *Tier:* ${stars}  
🎨 *Artist:* ${creators}  
🪄 *Attributes:* ${attributes}  
💰 *Listed Price:* ${price.toLocaleString()} Gold
🗃️ *Base Value:* ${value}
━━━━━━━━━━━━━━━

✨ Other users can now buy your listed card using *${prefix}market*  
So exciting, Senpai! 💞✨
`;
        const buttons = [
            {
                buttonId: `${prefix}cardmarket`,
                buttonText: { displayText: "🏪 View Market" },
                type: 1
            },
            {
                buttonId: `${prefix}collection`,
                buttonText: { displayText: "🎒 My Collection" },
                type: 1
            }
        ];
        let msg = {};

        try {
            if (processed.type === "video") {
                msg = {
                    video: { url: processed.path },
                    caption,
                    buttons,
                    footer: `${global.botName} Marketplace`,
                    type: 4
                };

                await Miku.sendMessage(m.from, msg, { quoted: m });

                // Auto delete converted MP4
                if (fs.existsSync(processed.path)) fs.unlinkSync(processed.path);

            } else {
                msg = {
                    image: { url: card.imageUrl },
                    caption,
                    buttons,
                    footer: `${global.botName} Marketplace`,
                    type: 4
                };

                await Miku.sendMessage(m.from, msg, { quoted: m });
            }

        } catch (err) {
            console.log("Send Error:", err);
            return m.reply("⚠️ Card listed but preview failed to send.");
        }
    }
};