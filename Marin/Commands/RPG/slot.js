const mongoose = require("mongoose");
require("../../config.js");
require("../../Core.js");
const { mku, mk } = require("../../Database/dataschema.js");
const fs = require("fs");

module.exports = {
    name: "slot",
    desc: "Advanced 5-Reel Slot Machine with Free Spins & Wilds",
    alias: ["slot"],
    category: "RPG",
    react: "🎰",

    start: async (
        Miku,
        m,
        { text, prefix, pushName, eco }
    ) => {

        const user = m.sender;
        const cara = "cara";

        // -------------------------- BET PARSING ------------------------------
        if (!text)
            return m.reply(
                `🎰 *Slot Machine — Ultimate Casino Mode*\n\n` +
                `Usage: *${prefix}slot <bet>*\nExample: *${prefix}slot 200*\n\n` +
                `Features:\n` +
                `🌟 WILD Symbol\n💎 SCATTER → Free Spins\n🎁 BONUS Mode\n🔥 5-Reel Wins!\n`
            );

        const bet = parseInt(text);
        if (!bet || bet < 100) return m.reply(`❗ Minimum bet: *100 Gold*`);

        const bal = await eco.balance(user, cara);
        if (bal.wallet < bet)
            return m.reply(`💸 *Not enough Gold, Senpai!*`);

        await eco.deduct(user, cara, bet);


        // -------------------------- SLOT SYMBOLS -----------------------------
        const symbols = ["🍒", "🍋", "🍇", "🥥", "🍉", "⭐", "💎"];
        const WILD = "⭐";
        const SCATTER = "💎";

        const kawaiiLines = [
            "UwU spinning the reels… 🎰🌸",
            "Nyaa~ jackpot vibes incoming 😳💗",
            "Sugoii Senpai… symbols dancing ✨",
            "Fingers crossed… maybe bonus round 👀",
            "Aaaa it's getting intense 😼🔥"
        ];


        // -------------------------- SEND INITIAL MSG -------------------------
        let msg = await Miku.sendMessage(
            m.from,
            {
                text:
                    `🎰 *SLOT MACHINE STARTED*\n` +
                    `Bet: *${bet} Gold*\n` +
                    `[ ❔ | ❔ | ❔ | ❔ | ❔ ]\n\n` +
                    `${kawaiiLines[Math.floor(Math.random() * kawaiiLines.length)]}`
            },
            { quoted: m }
        );


        // -------------------------- REAL-TIME SPIN ---------------------------
        let reel = ["❔", "❔", "❔", "❔", "❔"];

        for (let spin = 0; spin < 8; spin++) {
            await new Promise(res => setTimeout(res, 550));

            for (let i = 0; i < 5; i++) {
                reel[i] = symbols[Math.floor(Math.random() * symbols.length)];
            }

            await Miku.sendMessage(
                m.from,
                {
                    text:
                        `🎰 *SLOT MACHINE LIVE*\n` +
                        `Bet: *${bet}*\n` +
                        `[ ${reel.join(" | ")} ]\n\n` +
                        `${kawaiiLines[Math.floor(Math.random() * kawaiiLines.length)]}`,
                    edit: msg.key
                }
            );
        }


        // -------------------------- RESULT CALCULATION -------------------------
        let reward = 0;
        let wildCount = reel.filter(x => x === WILD).length;
        let scatterCount = reel.filter(x => x === SCATTER).length;

        const freq = {};
        reel.forEach(x => freq[x] = (freq[x] || 0) + 1);

        const mostCommon = Object.keys(freq).reduce((a, b) =>
            freq[a] > freq[b] ? a : b
        );

        let matchCount = freq[mostCommon];

        let result;

        // ⭐ WILD BOOST
        if (wildCount > 0) matchCount += Math.floor(wildCount / 1.5);

        // 💎 SCATTER → Free Spins
        let freeSpins = 0;
        if (scatterCount >= 3) {
            freeSpins = Math.floor(Math.random() * 5) + 3; // 3–8 free spins
        }


        // 🎁 BONUS FEATURE
        let bonusWin = 0;
        if (reel.includes("🍉") && reel.includes("🥥")) {
            bonusWin = bet * (Math.random() * 4 + 1); // 1x–5x
        }


        // -------------------------- PAYOUT RULES ---------------------------
        if (matchCount >= 5) {
            reward = bet * 10;
            result = `💎 *MEGA JACKPOT SENPAI!!!*\n🔥 Win: *${reward} Gold*`;
        }
        else if (matchCount == 4) {
            reward = bet * 4;
            result = `🎉 *BIG WIN!* You won *${reward} Gold!*`;
        }
        else if (matchCount == 3) {
            reward = bet * 2;
            result = `😊 *Nice Win!* Earned *${reward} Gold*`;
        }
        else if (matchCount == 2) {
            reward = Math.floor(bet * 1.2);
            result = `✨ *Small Win!* *${reward} Gold*`;
        }
        else {
            result = `💀 *You Lost… but don't cry Senpai 💗*`;
        }

        // Add free spin rewards
        let freeSpinReward = 0;
        if (freeSpins > 0) {
            freeSpinReward = (bet * freeSpins) / 2;
            reward += freeSpinReward;
        }

        // Add bonus feature reward
        reward += Math.floor(bonusWin);

        if (reward > 0) await eco.give(user, cara, reward);


        // -------------------------- FINAL OUTPUT -----------------------------
        return Miku.sendMessage(
            m.from,
            {
                text:
                    `🎰 *SLOT MACHINE RESULT*\n\n` +
                    `[ ${reel.join(" | ")} ]\n\n` +
                    `${result}\n\n` +
                    `${freeSpins > 0 ? `💎 Free Spins Won: *${freeSpins}*\n🎁 Bonus Gold: *${freeSpinReward}*\n\n` : ""}` +
                    `${bonusWin > 0 ? `🔥 Bonus Feature Payout: *${Math.floor(bonusWin)} Gold*\n\n` : ""}` +
                    ` Thanks for playing, Senpai!`
            },
            { quoted: m }
        );
    }
};