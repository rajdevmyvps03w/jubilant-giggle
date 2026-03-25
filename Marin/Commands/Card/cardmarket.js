const fs = require("fs");
const { mkmarket } = require("../../Database/dataschema.js");
const CardMgr = require("../../lib/cardManager.js");
const { processCardMedia } = require("../../lib/converter.js"); // <-- MP4 SUPPORT ADDED

module.exports = {
    name: "cardmarket",
    alias: ["globalmarket", "cstore", "shop"],
    desc: "View cards listed for sale with Tiers and Numbers",
    category: "Cards",
    usage: "market <page_number>",
    react: "🏪",

    start: async (Miku, m, { args, prefix }) => {
        try {
            const listings = await mkmarket.find({}).sort({ price: 1 });
            let page = parseInt(args[0]) || 1;
            const limit = 10;

            // Empty Market
            if (listings.length === 0) {
                return Miku.sendButtonText(
                    m.from,
                    [{ buttonId: `${prefix}collection`, buttonText: { displayText: "🎒 Sell a Card" }, type: 1 }],
                    "🏪 *The Market is Empty!* 🍃\nBe the first merchant! Use:\n*list <id> <price>*",
                    `${global.botName} Market`,
                    m
                );
            }

            const totalListings = listings.length;
            const totalPages = Math.ceil(totalListings / limit);

            if (page < 1 || page > totalPages)
                return m.reply(`❌ Invalid page! Only *${totalPages}* pages available.`);

            const startIndex = (page - 1) * limit;
            const endIndex = startIndex + limit;
            const pageListings = listings.slice(startIndex, endIndex);

            // Cute Market Header
            let marketText =
`🏪 *GLOBAL CARD MARKET* 🏪  
📄 Page: *${page}/${totalPages}*  
📦 Items Listed: *${totalListings}*  

💳 *To Buy:*  
• *${prefix}buycard <number>*  
━━━━━━━━━━━━━━━━━━\n`;

            // Listing Entries
            pageListings.forEach((item, index) => {
                const card = CardMgr.getCardById(item.cardId);
                if (!card) return;

                const rowNum = startIndex + index + 1;
                const stars = "⭐".repeat(card.tier);
                const sellerName = item.seller.split("@")[0];

                marketText +=
`*#${rowNum}*  *${card.title}*  
   🆔 \`${card.id}\`  
   💎 Tier: ${stars}  
   💰 Price: *${item.price.toLocaleString()} Gold*  
   👤 Seller: @${sellerName}  
━━━━━━━━━━━━━━━━━━\n`;
            });

            // Footer
            if (page < totalPages)
                marketText += `👉 Next Page → *${prefix}market ${page + 1}*\n`;

            if (fs.existsSync("./Assets/Img/shop.jpg"))
                shopBanner = "./Assets/Img/shop.jpg";

            const media = await processCardMedia(shopBanner);

            let deleteAfter = null;
            let msg = {};

            if (media.type === "video") {
                msg = {
                    video: { url: media.path },
                    caption: marketText,
                    footer: `${global.botName} Market`,
                    gifPlayback: true,
                    buttons: [
                        { buttonId: `${prefix}market ${page + 1}`, buttonText: { displayText: "➡️ Next Page" }, type: 1 },
                        { buttonId: `${prefix}collection`, buttonText: { displayText: "🎒 My Collection" }, type: 1 }
                    ],
                    mentions: pageListings.map(x => x.seller)
                };
                deleteAfter = media.path;

            } else {
                msg = {
                    image: { url: media.url || shopBanner },
                    caption: marketText,
                    footer: `${global.botName} Market`,
                    buttons: [
                        { buttonId: `${prefix}market ${page + 1}`, buttonText: { displayText: "➡️ Next Page" }, type: 1 },
                        { buttonId: `${prefix}collection`, buttonText: { displayText: "🎒 My Collection" }, type: 1 }
                    ],
                    mentions: pageListings.map(x => x.seller)
                };
            }

            await Miku.sendMessage(m.from, msg, { quoted: m });

            // Auto delete MP4 banner
            if (deleteAfter && fs.existsSync(deleteAfter)) fs.unlinkSync(deleteAfter);

        } catch (err) {
            console.error("Market Command Error:", err);
            return m.reply("⚠️ Market seems overloaded! Try again.");
        }
    }
};