// Commands/RPG/craft.js
const mongoose = require("mongoose");
require("../../config.js");
require("../../Core.js");
const { player } = require("../../Database/rpgschema.js");

module.exports = {
  name: "craft",
  desc: "Craft or upgrade items using mined resources.",
  alias: ["forge", "upgrade"],
  category: "RPG",
  usage: "craft <recipe>",
  react: "⚒",
  start: async (Miku, m, { prefix, args }) => {
    const recipe = (args[0] || "").toLowerCase();

    if (!recipe) {
      const helpText = `⚒ *CRAFTING MENU* ⚒

Use ores to upgrade & craft items~

Available recipes:
• \`${prefix}craft ironpickaxe\`
   - 1x Stone Pickaxe
   - 20x Iron
   - 10x Wood

• \`${prefix}craft diamondpickaxe\`
   - 1x Iron Pickaxe
   - 10x Diamonds
   - 5x Obsidian

• \`${prefix}craft netheritepickaxe\`
   - 1x Diamond Pickaxe
   - 15x Diamonds
   - 10x Obsidian

• \`${prefix}craft shield\`
   - 10x Iron
   - 20x Wood

• \`${prefix}craft goldenapple\`
   - 1x Diamonds
   - 5x Gold Ore

💡 TIP: Crafting saves gold, you’ll just have to do a bit more mining~`;

      return Miku.sendMessage(m.from, { text: helpText }, { quoted: m });
    }

    let user = await player.findOne({ id: m.sender });
    if (!user) {
      return Miku.sendMessage(
        m.from,
        {
          text: `😕 You don't have an inventory.\nUse \`${prefix}reg-inv\` first.`,
        },
        { quoted: m }
      );
    }

    const inv = user.inventory;
    const stats = user.stats || {
      protectionLevel: 0,
      miningLevel: 1,
      miningXP: 0,
      luckLevel: 0,
    };

    const notEnough = (needText) =>
      Miku.sendMessage(
        m.from,
        {
          text: `😕 Not enough materials!\nYou need:\n${needText}`,
        },
        { quoted: m }
      );

    // ---------- Recipes ----------
    if (recipe === "ironpickaxe") {
      if (
        inv.stonepickaxe < 1 ||
        inv.iron < 20 ||
        inv.wood < 10
      ) {
        return notEnough(
          `• Stone Pickaxe x1\n• Iron x20\n• Wood x10`
        );
      }

      inv.stonepickaxe -= 1;
      inv.iron -= 20;
      inv.wood -= 10;
      inv.ironpickaxe += 1;

      await user.save();

      return Miku.sendMessage(
        m.from,
        {
          text: `⚒ *Crafting Complete!*\nYou upgraded to an *Iron Pickaxe* ⛏\n(Stone Pickaxe + Iron + Wood consumed.)`,
        },
        { quoted: m }
      );
    }

    if (recipe === "diamondpickaxe") {
      if (
        inv.ironpickaxe < 1 ||
        inv.diamonds < 10 ||
        inv.obsidian < 5
      ) {
        return notEnough(
          `• Iron Pickaxe x1\n• Diamonds x10\n• Obsidian x5`
        );
      }

      inv.ironpickaxe -= 1;
      inv.diamonds -= 10;
      inv.obsidian -= 5;
      inv.diamondpickaxe += 1;

      await user.save();

      return Miku.sendMessage(
        m.from,
        {
          text: `⚒ *Crafting Complete!*\nYou forged a *Diamond Pickaxe* 💎\n(Your Iron Pickaxe has evolved~)`,
        },
        { quoted: m }
      );
    }

    if (recipe === "netheritepickaxe") {
      if (
        inv.diamondpickaxe < 1 ||
        inv.diamonds < 15 ||
        inv.obsidian < 10
      ) {
        return notEnough(
          `• Diamond Pickaxe x1\n• Diamonds x15\n• Obsidian x10`
        );
      }

      inv.diamondpickaxe -= 1;
      inv.diamonds -= 15;
      inv.obsidian -= 10;
      inv.netheritepickaxe += 1;

      await user.save();

      return Miku.sendMessage(
        m.from,
        {
          text: `⚒ *Crafting Complete!*\nYou created a god-tier *Netherite Pickaxe* 🔱\nNow go bully the mines.`,
        },
        { quoted: m }
      );
    }

    if (recipe === "shield") {
      if (inv.iron < 10 || inv.wood < 20) {
        return notEnough(`• Iron x10\n• Wood x20`);
      }

      inv.iron -= 10;
      inv.wood -= 20;
      inv.shield += 1;
      stats.protectionLevel += 1;

      user.inventory = inv;
      user.stats = stats;
      await user.save();

      return Miku.sendMessage(
        m.from,
        {
          text: `🛡 *Shield Crafted!*\nYour protection level increased.\nRobbing you just got harder~`,
        },
        { quoted: m }
      );
    }

    if (recipe === "goldenapple") {
      if (inv.diamonds < 1 || inv.goldOre < 5) {
        return notEnough(`• Diamonds x1\n• Gold Ore x5`);
      }

      inv.diamonds -= 1;
      inv.goldOre -= 5;
      inv.goldenApple += 1;

      await user.save();

      return Miku.sendMessage(
        m.from,
        {
          text: `🍎 *Golden Apple Crafted!*\nUse it to exchange for big Gold or flex in inventory~`,
        },
        { quoted: m }
      );
    }

    // Unknown recipe
    return Miku.sendMessage(
      m.from,
      {
        text: `😕 Unknown recipe.\nUse \`${prefix}craft\` to see available recipes.`,
      },
      { quoted: m }
    );
  },
};