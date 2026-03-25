const { mkpokemon, mku } = require("../../Database/dataschema.js");
const { getPokemon } = require("../../lib/pokeGame.js");

module.exports = {
    name: "pokeinfo",
    alias: ["pokemoninfo"],
    desc: "Check details of your Pokemon",
    category: "Pokemon",
    usage: "pokeinfo <name>",
    react: "ℹ️",
    start: async (Miku, m, { text, prefix }) => {
        if (!text) return m.reply(`Which Pokemon? Usage: *${prefix}pokeinfo Pikachu*`);

        // Database se dhundo
        const myPoke = await mkpokemon.findOne({ owner: m.sender, name: { $regex: new RegExp("^" + text + "$", "i") } });

        if (!myPoke) return m.reply("🚫 You don't own this Pokemon!");

        // Live stats fetch karo API se
        const apiData = await getPokemon(myPoke.pokeId);
        
        let stats = `📊 *Pokemon Analysis* 📊\n\n` +
                    `🦊 *Name:* ${myPoke.name}\n` +
                    `🆙 *Level:* ${myPoke.level}\n` +
                    `🌟 *Shiny:* ${myPoke.shiny ? "Yes ✨" : "No"}\n` +
                    `⚡ *Type:* ${apiData.type}\n\n` +
                    `⚔️ *Stats (Base):*\n` +
                    `❤️ HP: ${apiData.hp}\n` +
                    `⚔️ ATK: ${apiData.atk}\n` +
                    `🛡️ DEF: ${apiData.def}\n` +
                    `💨 SPD: ${apiData.spd}`;

        await Miku.sendMessage(m.from, {
            image: { url: apiData.image },
            caption: stats,
            footer: `*${global.botName} Dex*`,
            type: 4
        }, { quoted: m });
    }
};