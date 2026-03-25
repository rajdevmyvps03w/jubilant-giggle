// Commands/RPG/shop.js
const mongoose = require("mongoose");
require("../../config.js");
require("../../Core.js");
const { player } = require("../../Database/rpgschema.js");
const eco = require("discord-mongoose-economy");
const ty = eco.connect(
  "mongodb+srv://rajdevorcreator:Sten-X001@cluster0.bfbbyuu.mongodb.net/?appName=Cluster0"
);
const fs = require("fs");

module.exports = {
  name: "shop",
  desc: "View the RPG item shop.",
  alias: ["store"],
  category: "RPG",
  usage: "shop",
  react: "🛍",
  start: async (Miku, m, { prefix, botName }) => {
    const msg = `🛍️ 💎 *${global.botName} RPG STORE* 💎 🛍️

👋 Hi miner-chan~ Welcome to the *${global.botName}* Shop!

━━━━━━━━━━━━━━━━━━
#1 – BASIC TOOLS
━━━━━━━━━━━━━━━━━━
🪵 *Wooden Axe*
💰 Cost: 250 Gold
⌨️ Usage: \`${prefix}buy woodenaxe\`
💬 Chop down trees for wood & basic loot! 🌲

⛏ *Stone Pickaxe*
💰 Cost: 500 Gold
⌨️ Usage: \`${prefix}buy stonepickaxe\`
💬 Simple but reliable for stone/coal/iron.

⛏ *Iron Pickaxe*
💰 Cost: 2000 Gold
⌨️ Usage: \`${prefix}buy ironpickaxe\`
💬 Better ores, better drops, better life~ 🔨

💎 *Diamond Pickaxe*
💰 Cost: 5000 Gold
⌨️ Usage: \`${prefix}buy diamondpickaxe\`
💬 Can rarely find *🍎 Golden Apple* & rare gems!

🔱 *Netherite Pickaxe* (NEW)
💰 Cost: 15000 Gold
⌨️ Usage: \`${prefix}buy netheritepickaxe\`
💬 Insane loot + bonus XP from mining.

━━━━━━━━━━━━━━━━━━
#2 – GOLD EXCHANGE
━━━━━━━━━━━━━━━━━━
💰 *100k GOLD*
🔐 Cost: 1x *Golden Apple*
⌨️ Usage: \`${prefix}buy gold\`
💬 Only the luckiest miners get this deal~

━━━━━━━━━━━━━━━━━━
#3 – UTILITY ITEMS
━━━━━━━━━━━━━━━━━━
🔦 *Torch*
💰 Cost: 100 Gold
⌨️ Usage: \`${prefix}buy torch\`
💬 Increases chance of extra ore while mining.

🎒 *Backpack*
💰 Cost: 1500 Gold
⌨️ Usage: \`${prefix}buy backpack\`
💬 RP item: shows you're a serious explorer!

🍀 *Lucky Charm*
💰 Cost: 2500 Gold
⌨️ Usage: \`${prefix}buy luckycharm\`
💬 Slight boost in rare drop chance & rob success.

🧴 *Repair Kit*
💰 Cost: 1000 Gold
⌨️ Usage: \`${prefix}buy repairkit\`
💬 (Use later when you add durability logic.)

━━━━━━━━━━━━━━━━━━
#4 – PROTECTION ITEMS
━━━━━━━━━━━━━━━━━━
🛡 *Shield*
💰 Cost: 3000 Gold
⌨️ Usage: \`${prefix}buy shield\`
💬 Reduces rob success chance on you.

🐶 *Guard Dog*
💰 Cost: 6000 Gold
⌨️ Usage: \`${prefix}buy guarddog\`
💬 If someone fails to rob you, they may lose extra coins.

🪤 *Trap*
💰 Cost: 4500 Gold
⌨️ Usage: \`${prefix}buy trap\`
💬 1-time trap that can fully reverse a failed rob on you.

━━━━━━━━━━━━━━━━━━
💡 *TIP*: Use \`${prefix}craft\` to upgrade tools using mined materials
instead of only spending Gold~`;

    return Miku.sendMessage(m.from, { text: msg }, { quoted: m });
  },
};