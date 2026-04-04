// Commands/RPG/inventory.js
const mongoose = require("mongoose");
require("../../config.js");
require("../../Core.js");
const { player } = require("../../Database/rpgschema.js");
const eco = require("discord-mongoose-economy");
const ty = eco.connect(
  "mongodb+srv://rajdevorcreator:Sten-X001@cluster0.bfbbyuu.mongodb.net/?appName=Cluster0"
);

module.exports = {
  name: "inventory",
  desc: "View your RPG inventory.",
  alias: ["inv", "items"],
  category: "RPG",
  usage: "inventory",
  react: "💹",
  start: async (Miku, m, { prefix }) => {
    let user = await player.findOne({ id: m.sender });
    if (!user) {
      return Miku.sendMessage(
        m.from,
        {
          text: `😕 Aapke paas abhi inventory nahi hai.\nUse \`${prefix}reg-inv\` to create one, cutie~`,
        },
        { quoted: m }
      );
    }

    const inv = user.inventory;
    const st = user.stats || {
      miningLevel: 1,
      miningXP: 0,
      protectionLevel: 0,
      luckLevel: 0,
    };

    let msg = `〔 🐺 *${global.botName} RPG INVENTORY* 🐺 〕

👤 *Player ID*: ${m.sender.split("@")[0]}

📊 *STATS*
• ⛏ Mining Lv.*${st.miningLevel}*  (XP: ${st.miningXP})
• 🛡 Protection Lv.*${st.protectionLevel}*
• 🍀 Luck Lv.*${st.luckLevel}*

📦 *RESOURCES*
• 🌲 Wood: ${inv.wood}
• 🪨 Stone: ${inv.stone}
• ⛓ Iron: ${inv.iron}
• 🕯 Coal: ${inv.coal}
• 🟠 Copper: ${inv.copper}
• 🟡 Gold Ore: ${inv.goldOre}
• 💙 Lapis: ${inv.lapis}
• 💚 Emerald: ${inv.emerald}
• 🟪 Obsidian: ${inv.obsidian}
• 💎 Diamonds: ${inv.diamonds}
• 🍎 Golden Apple: ${inv.goldenApple}

🛠 *TOOLS*
• 🪵 Wooden Axe: ${inv.woodenaxe}
• ⛏ Stone Pickaxe: ${inv.stonepickaxe}
• ⛏ Iron Pickaxe: ${inv.ironpickaxe}
• 💎 Diamond Pickaxe: ${inv.diamondpickaxe}
• 🔱 Netherite Pickaxe: ${inv.netheritepickaxe}

🎒 *UTILITY*
• 🔦 Torch: ${inv.torch}
• 🎒 Backpack: ${inv.backpack}
• 🍀 Lucky Charm: ${inv.luckyCharm}
• 🧴 Repair Kit: ${inv.repairKit}

🛡 *PROTECTION ITEMS*
• 🛡 Shield: ${inv.shield}
• 🐶 Guard Dog: ${inv.guardDog}
• 🪤 Trap: ${inv.trap}

💡 *TIP*: Use \`${prefix}shop\` to see what you can buy,\n\`${prefix}craft\` to upgrade tools using mined items,\nand \`${prefix}mine\` to start mining adventure!`;

    return Miku.sendMessage(m.from, { text: msg }, { quoted: m });
  },
};