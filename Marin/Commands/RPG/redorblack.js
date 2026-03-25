const mongoose = require("mongoose");
require("../../config.js");
require("../../Core.js");
const { mku, mk } = require("../../Database/dataschema.js");
const fs = require("fs");

module.exports = {
    name: "redblack",
    alias: ["redorblack"],
    desc: "Predict the card color: Red or Black!",
    category: "RPG",
    react: "🃏",

    start: async (
        Miku,
        m,
        { text, prefix, pushName, eco }
    ) => {

        const user = m.sender;
        const cara = "cara";

        // ------------------- INPUT CHECK ------------------- //
        if (!text)
            return m.reply(
                `🃏 *Red or Black Gambling Game*\n\n` +
                `Usage: *${prefix}redblack <bet> <red/black>*\n` +
                `Example: *${prefix}redblack 200 red*\n\n` +
                `💡 Tip: Black cards slightly more lucky today 😼💗`
            );

        const args = text.split(" ");
        const bet = parseInt(args[0]);
        const choice = (args[1] || "").toLowerCase();

        if (!bet || bet < 50)
            return m.reply(`❗ Minimum bet: *50 Gold*`);
        if (!["red", "black"].includes(choice))
            return m.reply(`❗ Choose: *red / black*`);

        const bal = await eco.balance(user, cara);
        if (bal.wallet < bet)
            return m.reply(`💸 Senpai… you don't have enough Gold!`);

        // Deduct bet
        await eco.deduct(user, cara, bet);


        // ------------------- CARD SYSTEM ------------------- //
        const redCards = ["♥️", "♦️"];
        const blackCards = ["♠️", "♣️"];

        const allCards = [
            "♥️", "♦️", "♠️", "♣️",
            "♥️", "♦️", "♠️", "♣️",
            "♦️", "♥️", "♠️", "♣️"
        ];

        const card = allCards[Math.floor(Math.random() * allCards.length)];

        // Determine final color
        let cardColor = redCards.includes(card) ? "red" : "black";

        // JACKPOT CARD (Ace of Spades)
        let isJackpot = false;
        if (card === "♠️") {
            // 1/5 chance to treat as Ace (jackpot)
            if (Math.random() < 0.2) isJackpot = true;
        }

        const cuteLines = [
            "Shuffling cards… UwU 🎴✨",
            "Nyaa~ almost ready! 😳",
            "Don’t blink Senpai 👀",
            "Your destiny is in this card 💗",
            "Sugoii… suspense rising 😼🔥"
        ];


        // ------------------- INITIAL MESSAGE ------------------- //
        let msg = await Miku.sendMessage(
            m.from,
            {
                text:
                    `🃏 *RED OR BLACK STARTED*\n\n` +
                    `Bet: *${bet} Gold*\n` +
                    `Your Choice: *${choice.toUpperCase()}*\n\n` +
                    `🎴 Drawing card...\n` +
                    `${cuteLines[Math.floor(Math.random() * cuteLines.length)]}`
            },
            { quoted: m }
        );

        // ------------------- REAL-TIME ANIMATION ------------------- //
        for (let i = 3; i > 0; i--) {
            await new Promise(res => setTimeout(res, 900));

            await Miku.sendMessage(
                m.from,
                {
                    text:
                        `🃏 *CARD DRAWING*\n\n` +
                        `Bet: *${bet}*\n` +
                        `Choice: *${choice.toUpperCase()}*\n\n` +
                        `⏳ Revealing in *${i}*...\n` +
                        `${cuteLines[Math.floor(Math.random() * cuteLines.length)]}`,
                    edit: msg.key
                }
            );
        }


        // ------------------- FINAL RESULTS ------------------- //
        if (isJackpot) {
            const reward = bet * 10;
            await eco.give(user, cara, reward);

            return Miku.sendMessage(
                m.from,
                {
                    text:
                        `🎉 *JACKPOT SENPAI!!!* 💥🔥\n\n` +
                        `You drew: *♠️ ACE OF SPADES*\n\n` +
                        `💰 *You win ${reward} Gold!* (×10)\n` +
                        `UwU You're insanely lucky today 💗`
                },
                { quoted: m }
            );
        }

        if (choice === cardColor) {
            const reward = bet * 2;
            await eco.give(user, cara, reward);

            return Miku.sendMessage(
                m.from,
                {
                    text:
                        `🎉 *YOU WON SENPAI!* ✨\n\n` +
                        `Card Drawn: *${card} (${cardColor.toUpperCase()})*\n` +
                        `Your Choice: *${choice.toUpperCase()}*\n\n` +
                        `💰 *You win ${reward} Gold!* (×2)\n` +
                        `Sugoii~ your instincts are amazing 😳💗`
                },
                { quoted: m }
            );
        }

        // YOU LOSE
        return Miku.sendMessage(
            m.from,
            {
                text:
                    `💀 *YOU LOST SENPAI…* 😭\n\n` +
                    `Card Drawn: *${card} (${cardColor.toUpperCase()})*\n` +
                    `Your Choice: *${choice.toUpperCase()}*\n\n` +
                    `💸 Lost *${bet} Gold*\n` +
                    `Don’t be sad… try again UwU 💗`
            },
            { quoted: m }
        );
    }
};