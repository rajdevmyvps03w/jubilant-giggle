// Commands/RPG/buy.js
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
  name: "buy",
  desc: "Buy RPG items/tools.",
  alias: ["buy", "purchase"],
  category: "RPG",
  usage: "buy <item>",
  react: "💰",
  start: async (Miku, m, { text, prefix }) => {
    const cara = "cara";
    let user = await player.findOne({ id: m.sender });
    if (!user) {
      return Miku.sendMessage(
        m.from,
        {
          text: `😕 You don't have an inventory.\nUse \`${prefix}reg-inv\` to register first.`,
        },
        { quoted: m }
      );
    }

    if (!text) {
      return Miku.sendMessage(
        m.from,
        {
          text: `😕 Please specify an item to purchase.\nUse \`${prefix}shop\` to see the list.\n\nExample: \`${prefix}buy woodenaxe\``,
        },
        { quoted: m }
      );
    }

    const item = text.toLowerCase().trim();
    const balance = await eco.balance(m.sender, cara);

    // helper
    const notEnough = (cost) =>
      Miku.sendMessage(
        m.from,
        {
          text: `😕 *Not enough Gold!* \nYou need \`${cost}\` Gold in your wallet, Senpai~`,
        },
        { quoted: m }
      );

    // ---------------- BASIC TOOLS ----------------
    if (item === "woodenaxe") {
      const cost = 250;
      if (balance.wallet < cost) return notEnough(cost);

      await eco.deduct(m.sender, cara, cost);
      user.inventory.woodenaxe += 1;
      await user.save();

      return Miku.sendMessage(
        m.from,
        {
          text: `[ *💰 PURCHASE RESULT 💰* ]\n\nSuccessfully purchased a *Wooden Axe* 🪵\nGo chop some trees, cutie~`,
        },
        { quoted: m }
      );
    }

    if (item === "stonepickaxe") {
      const cost = 500;
      if (balance.wallet < cost) return notEnough(cost);

      await eco.deduct(m.sender, cara, cost);
      user.inventory.stonepickaxe += 1;
      await user.save();

      return Miku.sendMessage(
        m.from,
        {
          text: `[ *💰 PURCHASE RESULT 💰* ]\n\n*Stone Pickaxe* ready! ⛏ Time to farm stone & coal~`,
        },
        { quoted: m }
      );
    }

    if (item === "ironpickaxe") {
      const cost = 2000;
      if (balance.wallet < cost) return notEnough(cost);

      await eco.deduct(m.sender, cara, cost);
      user.inventory.ironpickaxe += 1;
      await user.save();

      return Miku.sendMessage(
        m.from,
        {
          text: `[ *💰 PURCHASE RESULT 💰* ]\n\n*Iron Pickaxe* obtained! 🔨 Stronger ores unlocked.`,
        },
        { quoted: m }
      );
    }

    if (item === "diamondpickaxe") {
      const cost = 5000;
      if (balance.wallet < cost) return notEnough(cost);

      await eco.deduct(m.sender, cara, cost);
      user.inventory.diamondpickaxe += 1;
      await user.save();

      return Miku.sendMessage(
        m.from,
        {
          text: `[ *💰 PURCHASE RESULT 💰* ]\n\nShiny *Diamond Pickaxe* acquired! 💎\nRare drops incoming~`,
        },
        { quoted: m }
      );
    }

    if (item === "netheritepickaxe") {
      const cost = 15000;
      if (balance.wallet < cost) return notEnough(cost);

      await eco.deduct(m.sender, cara, cost);
      user.inventory.netheritepickaxe += 1;
      await user.save();

      return Miku.sendMessage(
        m.from,
        {
          text: `[ *💰 PURCHASE RESULT 💰* ]\n\nYou bought a *Netherite Pickaxe* 🔱\nYou're an absolute giga-miner now.`,
        },
        { quoted: m }
      );
    }

    // GOLD EXCHANGE
    if (item === "gold") {
      if (user.inventory.goldenApple < 1) {
        return Miku.sendMessage(
          m.from,
          {
            text: `😕 You don't have a *Golden Apple* to convert into Gold.`,
          },
          { quoted: m }
        );
      }
      await eco.give(m.sender, cara, 100000);
      user.inventory.goldenApple -= 1;
      await user.save();

      return Miku.sendMessage(
        m.from,
        {
          text: `[ *💰 PURCHASE RESULT 💰* ]\n\nSuccessfully exchanged 1x 🍎 *Golden Apple* for *100k Gold*!`,
        },
        { quoted: m }
      );
    }

    // ---------------- UTILITY ITEMS ----------------
    if (item === "torch") {
      const cost = 100;
      if (balance.wallet < cost) return notEnough(cost);

      await eco.deduct(m.sender, cara, cost);
      user.inventory.torch += 1;
      await user.save();

      return Miku.sendMessage(
        m.from,
        {
          text: `🔦 *Torch* purchased!\nSlight boost in ore drops while mining in future logic~`,
        },
        { quoted: m }
      );
    }

    if (item === "backpack") {
      const cost = 1500;
      if (balance.wallet < cost) return notEnough(cost);

      await eco.deduct(m.sender, cara, cost);
      user.inventory.backpack += 1;
      await user.save();

      return Miku.sendMessage(
        m.from,
        {
          text: `🎒 *Backpack* purchased!\nNow you *look* like a pro explorer~ (cosmetic / RP item).`,
        },
        { quoted: m }
      );
    }

    if (item === "luckycharm") {
      const cost = 2500;
      if (balance.wallet < cost) return notEnough(cost);

      await eco.deduct(m.sender, cara, cost);
      user.inventory.luckyCharm += 1;
      await user.save();

      return Miku.sendMessage(
        m.from,
        {
          text: `🍀 *Lucky Charm* purchased!\nGives extra chance in rare drops & rob success (see rob logic).`,
        },
        { quoted: m }
      );
    }

    if (item === "repairkit") {
      const cost = 1000;
      if (balance.wallet < cost) return notEnough(cost);

      await eco.deduct(m.sender, cara, cost);
      user.inventory.repairKit += 1;
      await user.save();

      return Miku.sendMessage(
        m.from,
        {
          text: `🧴 *Repair Kit* purchased!\nUse it when you add durability feature for tools.`,
        },
        { quoted: m }
      );
    }

    // ---------------- PROTECTION ----------------
    if (item === "shield") {
      const cost = 3000;
      if (balance.wallet < cost) return notEnough(cost);

      await eco.deduct(m.sender, cara, cost);
      user.inventory.shield += 1;
      user.stats.protectionLevel = (user.stats?.protectionLevel || 0) + 1;
      await user.save();

      return Miku.sendMessage(
        m.from,
        {
          text: `🛡 *Shield* purchased!\nYour protection level increased. Robbing you is now harder.`,
        },
        { quoted: m }
      );
    }

    if (item === "guarddog") {
      const cost = 6000;
      if (balance.wallet < cost) return notEnough(cost);

      await eco.deduct(m.sender, cara, cost);
      user.inventory.guardDog += 1;
      user.stats.protectionLevel = (user.stats?.protectionLevel || 0) + 2;
      await user.save();

      return Miku.sendMessage(
        m.from,
        {
          text: `🐶 *Guard Dog* purchased!\nIf someone fails to rob you, they might lose extra Gold as *dog tax* 🐾`,
        },
        { quoted: m }
      );
    }

    if (item === "trap") {
      const cost = 4500;
      if (balance.wallet < cost) return notEnough(cost);

      await eco.deduct(m.sender, cara, cost);
      user.inventory.trap += 1;
      await user.save();

      return Miku.sendMessage(
        m.from,
        {
          text: `🪤 *Trap* purchased!\nOne-time surprise for robbers. They better be scared now~`,
        },
        { quoted: m }
      );
    }

    // DEFAULT
    return Miku.sendMessage(
      m.from,
      {
        text: `😕 Invalid item.\nUse \`${prefix}shop\` to see valid items.`,
      },
      { quoted: m }
    );
  },
};