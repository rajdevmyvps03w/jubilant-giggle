const mongoose = require("mongoose");
require("../../config.js");
require("../../Core.js");
const { mku, mk } = require("../../Database/dataschema.js");
const fs = require("fs");

module.exports = {
    name: "shark",
    desc: "Risk based Shark Attack gambling game",
    alias: ["sharkattack"],
    category: "RPG",
    react: "🦈",

    start: async (
        Miku,
        m,
        { text, prefix, pushName, eco }
    ) => {

        const user = m.sender;
        const cara = "cara";

        // ------------------ INPUT ------------------ //
        if (!text)
            return m.reply(
                `🦈 *Shark Attack Gambling Game*\n\n` +
                `Usage: *${prefix}shark <bet> <low/medium/high/ultra>*\n` +
                `Example: *${prefix}shark 200 medium*\n\n` +
                `🔥 Higher risk = Higher reward, Senpai 💗`
            );

        const args = text.split(" ");
        const bet = parseInt(args[0]);
        const mode = (args[1] || "").toLowerCase();

        if (!bet || bet < 100)
            return m.reply(`❗ Minimum bet: *100 Gold*`);
        if (!["low", "medium", "high", "ultra"].includes(mode))
            return m.reply(`❗ Mode must be: *low / medium / high / ultra*`);

        const bal = await eco.balance(user, cara);
        if (bal.wallet < bet) return m.reply(`💸 Not enough Gold!`);

        // Deduct bet
        await eco.deduct(user, cara, bet);


        // ------------------ RISK PARAMETERS ------------------ //
        let multiplier = 1.3;
        let danger = 0.20;

        if (mode === "medium") { multiplier = 2; danger = 0.35; }
        if (mode === "high") { multiplier = 3; danger = 0.55; }
        if (mode === "ultra") { multiplier = 5; danger = 0.75; }

        const cuteLines = [
            "Nyaa~ swimming carefully… 🌊💗",
            "Senpai don’t panic! 😳🔥",
            "Shark is sniffing something… 👀",
            "Your heartbeat is rising… UwU 😭",
            "Stay calm… maybe luck is with you ✨",
        ];

        // ------------------ INITIAL MESSAGE ------------------ //
        let msg = await Miku.sendMessage(
            m.from,
            {
                text:
                    `🦈 *SHARK ATTACK STARTED*\n\n` +
                    `Bet: *${bet} Gold*\n` +
                    `Risk Mode: *${mode.toUpperCase()}*\n` +
                    `Multiplier: *${multiplier}x*\n\n` +
                    `🌊 Swimming away...\n` +
                    `${cuteLines[Math.floor(Math.random() * cuteLines.length)]}`,
            },
            { quoted: m }
        );

        // ------------------ LIVE ANIMATION ------------------ //
        for (let i = 0; i < 5; i++) {
            await new Promise(res => setTimeout(res, 800));

            const waves = ["🌊", "🌊🌊", "🌊🌊🌊", "🌊🌊", "🌊"];

            await Miku.sendMessage(
                m.from,
                {
                    text:
                        `🦈 *SHARK ATTACK LIVE*\n\n` +
                        `Bet: *${bet} Gold*\n` +
                        `Mode: *${mode}*\n` +
                        `Multiplier: *${multiplier}x*\n\n` +
                        `${waves[i]}\n` +
                        `${cuteLines[Math.floor(Math.random() * cuteLines.length)]}`,
                    edit: msg.key
                }
            );
        }

        // ------------------ FINAL RESULT ------------------ //
        const sharkAttacks = Math.random() < danger;

        if (sharkAttacks) {
            return Miku.sendMessage(
                m.from,
                {
                    text:
                        `💀 *SHARK ATTACKED YOU SENPAI!!* 🦈💥\n\n` +
                        `You lost *${bet} Gold.*\n` +
                        `🌊 Better luck next time… UwU 💗`
                },
                { quoted: m }
            );
        }

        // User survives → WIN
        const reward = Math.floor(bet * multiplier);

        await eco.give(user, cara, reward);

        return Miku.sendMessage(
            m.from,
            {
                text:
                    `🎉 *YOU ESCAPED THE SHARK!* 🦈✨\n\n` +
                    `Mode: *${mode}*\nMultiplier: *${multiplier}x*\n\n` +
                    `💰 *You won ${reward} Gold!* ❤️\n` +
                    `Nyaa~ I’m proud of you Senpai 😳💗`
            },
            { quoted: m }
        );
    }
};