const mongoose = require("mongoose");
require("../../config.js");
require("../../Core.js");
const { mku, mk } = require("../../Database/dataschema.js");
const fs = require("fs");

module.exports = {
    name: "crashtower",
    desc: "Climb floors, avoid boom, win multipliers",
    alias: ["tower", "ctower"],
    category: "RPG",
    react: "🗼",

    start: async (
        Miku,
        m,
        { text, prefix, pushName, eco }
    ) => {

        const user = m.sender;
        const cara = "cara";

        // ------------------------ INPUT CHECK ------------------------ //
        if (!text)
            return m.reply(
                `🏰 *Crash Tower Game*\n\n` +
                `Usage: *${prefix}crashtower <bet> <auto-floor>*\n` +
                `Example: *${prefix}crashtower 200 5*\n\n` +
                `💡 Tip: Floors 4–7 have best risk:reward ratio 💗`
            );

        const args = text.split(" ");
        const bet = parseInt(args[0]);
        const autoFloor = parseInt(args[1]);

        if (!bet || bet < 100)
            return m.reply(`❗ Minimum bet is *100 Gold* Senpai.`);
        if (!autoFloor || autoFloor < 1 || autoFloor > 12)
            return m.reply(`❗ Auto-floor must be between *1–12*.`);

        const bal = await eco.balance(user, cara);
        if (bal.wallet < bet)
            return m.reply(`💸 *Not enough Gold to climb the tower, Senpai…*`);

        // Deduct bet first
        await eco.deduct(user, cara, bet);

        // ------------------------ GAME SETUP ------------------------ //
        let multiplier = 1.00;
        let floors = 12;
        let currentFloor = 0;
        let cashedOut = false;

        const cuteLines = [
            "Nyaa~ climbing slowly… 🧗‍♂️💗",
            "Sugoii Senpai… next floor looks scary 😳",
            "Careful! Boom chance rising 😼🔥",
            "UwU you’re doing great~ ✨",
            "Aaaa don’t slip Senpai!! 😭",
        ];

        // Starting message
        let msg = await Miku.sendMessage(
            m.from,
            {
                text:
                    `🏰 *CRASH TOWER STARTED*\n\n` +
                    `Bet: *${bet} Gold*\n` +
                    `Auto Cashout at Floor: *${autoFloor}*\n\n` +
                    `Floor: *0/12*\nMultiplier: *1.00x*\n\n` +
                    `💗 ${cuteLines[Math.floor(Math.random() * cuteLines.length)]}`
            },
            { quoted: m }
        );

        // ------------------------ REALTIME CLIMB LOOP ------------------------ //
        while (currentFloor < floors) {

            await new Promise(res => setTimeout(res, 900));

            currentFloor++;
            multiplier += multiplier * 0.25; // 25% boost per floor

            // Boom chance increases every floor
            const boomChance = Math.random() < currentFloor * 0.06;

            // If BOOM happens
            if (boomChance) {
                await Miku.sendMessage(
                    m.from,
                    {
                        text:
                            `💥 *BOOM! YOU FELL SENPAI!* 💀\n\n` +
                            `You reached Floor *${currentFloor}*\n` +
                            `Multiplier before fall: *${multiplier.toFixed(2)}x*\n\n` +
                            `💸 Lost: *${bet} Gold*\n` +
                            `🎀 Better luck next climb 💗`,
                        edit: msg.key
                    }
                );
                return;
            }

            // AUTO CASHOUT logic
            if (currentFloor >= autoFloor) {
                cashedOut = true;
            }

            // Edit message each floor
            await Miku.sendMessage(
                m.from,
                {
                    text:
                        `🏰 *CRASH TOWER LIVE*\n\n` +
                        `Floor: *${currentFloor}/12*\n` +
                        `Multiplier: *${multiplier.toFixed(2)}x*\n\n` +
                        `Status: ${cashedOut ? "💖 CASHED OUT!" : "🧗‍♂️ Climbing…"}\n\n` +
                        `✨ ${cuteLines[Math.floor(Math.random() * cuteLines.length)]}`,
                    edit: msg.key
                }
            );

            if (cashedOut) break;
        }

        // ------------------------ FINAL CASHOUT ------------------------ //
        const reward = Math.floor(bet * multiplier);

        await eco.give(user, cara, reward);

        return Miku.sendMessage(
            m.from,
            {
                text:
                    `🎉 *SUCCESS, SENPAI!* 💗\n\n` +
                    `You cashed out on Floor *${currentFloor}*\n` +
                    `Final Multiplier: *${multiplier.toFixed(2)}x*\n\n` +
                    `💰 *Reward Earned: ${reward} Gold!* 🔥\n` +
                    `🎀 You climbed like a true hero UwU`
            },
            { quoted: m }
        );
    }
};