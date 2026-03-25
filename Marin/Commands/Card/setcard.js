// lib/commands/setcard.js
const fs = require("fs");
const { mkcard, mkbattle } = require("../../Database/dataschema.js");
const CardMgr = require("../../lib/cardManager.js");
const { processCardMedia } = require("../../lib/converter.js"); // MP4 Support

module.exports = {
    name: "setcard",
    alias: ["setmain", "maincard"],
    desc: "Equip a main card for battles",
    category: "Battle",
    usage: "setcard <deck_number | card_id>",
    react: "🛡️",

    start: async (Miku, m, { args, prefix, pushName }) => {

        if (!args[0]) {
            return m.reply(
                `🛡️ *Choose which card to set as your main fighter!*  
                
Use:
• By Number → *${prefix}setcard 1*  
• By ID → *${prefix}setcard cx123*`
            );
        }

        const input = args[0];
        const user = m.sender;

        let targetCardDB = null;

        if (!isNaN(input)) {
            const index = parseInt(input) - 1;

            let userCards = await mkcard.find({ owner: user });
            if (!userCards.length) return m.reply("🎒 Your deck is empty, commander!");

            // Sort same as collection
            let sorted = userCards.map(uc => {
                const d = CardMgr.getCardById(uc.cardId);
                return d ? { ...d, db: uc } : null;
            }).filter(Boolean);

            sorted.sort((a, b) => b.tier - a.tier || a.title.localeCompare(b.title));

            if (index < 0 || index >= sorted.length)
                return m.reply(`❌ Invalid number! You only have *${sorted.length}* cards.`);

            targetCardDB = sorted[index].db;
        } else {
            targetCardDB = await mkcard.findOne({ owner: user, cardId: input });
        }

        if (!targetCardDB)
            return m.reply("🚫 You don’t own this card, commander!");

        const card = CardMgr.getCardById(targetCardDB.cardId);
        if (!card)
            return m.reply("⚠️ Card metadata missing!");

        let profile = await mkbattle.findOne({ userId: user });

        if (!profile) {
            profile = new mkbattle({
                userId: user,
                mainCardId: card.id
            });
        } else {
            profile.mainCardId = card.id;
        }

        await profile.save();

        const stars = "⭐".repeat(card.tier || 1);
        const attributes = card.specialAttributes?.length
            ? card.specialAttributes.join(", ")
            : "None";

        const creators = card.creators?.length
            ? card.creators.join(", ")
            : "Unknown";

        const caption =
`🛡️ *MAIN CARD EQUIPPED!*  

Your battle formation has been updated, Commander ${pushName}! ⚔️  
This warrior will now lead every fight you enter.  

━━━━━━━━━━━━━━━━━━
🃏 *Card:* ${card.title}  
📺 *Series:* ${card.series}  
💎 *Tier:* ${stars}  
🎨 *Artist:* ${creators}  
🪄 *Attributes:* ${attributes}  
🧭 *Role:* Primary Battle Unit  
━━━━━━━━━━━━━━━━━━

March forward with pride, commander! 🪖🔥`;

        let deleteAfter = null;
        const processed = await processCardMedia(card.imageUrl);

        const buttons = [
            { buttonId: `${prefix}battleprofile`, buttonText: { displayText: "⚔️ Battle Profile" }, type: 1 },
            { buttonId: `${prefix}collection`, buttonText: { displayText: "🎴 View Deck" }, type: 1 }
        ];

        let msg = {};

        try {
            if (processed.type === "video") {
                msg = {
                    video: { url: processed.path },
                    caption,
                    gifPlayback: true,
                    footer: `${global.botName} Barracks`,
                    buttons
                };
                deleteAfter = processed.path;

            } else {
                msg = {
                    image: { url: card.imageUrl },
                    caption,
                    footer: `${global.botName} Barracks`,
                    buttons
                };
            }

            await Miku.sendMessage(m.from, msg, { quoted: m });

            if (deleteAfter && fs.existsSync(deleteAfter))
                fs.unlinkSync(deleteAfter);

        } catch (err) {
            console.error("SetCard send error:", err);
            m.reply("⚠️ Main card updated, but preview failed.");
        }
    }
};