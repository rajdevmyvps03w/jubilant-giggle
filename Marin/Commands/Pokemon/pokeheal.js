const { mkpokemon } = require("../../Database/dataschema.js");

module.exports = {
    name: "pokeheal",
    alias: ["healpoke"],
    desc: "Heal all your Pokemon to Max HP",
    category: "Pokemon",
    usage: "pokeheal",
    react: "💊",
    start: async (Miku, m, { prefix }) => {
        // Find all pokemon of user
        const userPokes = await mkpokemon.find({ owner: m.sender });

        if (userPokes.length === 0) return m.reply("You have no Pokémon to heal!");

        let count = 0;
        for (let poke of userPokes) {
            if (poke.currentHp < poke.maxHp) {
                poke.currentHp = poke.maxHp; // Restore Full Health
                await poke.save();
                count++;
            }
        }

        if (count === 0) return m.reply("✨ Your team is already fully healthy!");

        let buttons = [{ buttonId: `${prefix}pokebattle`, buttonText: { displayText: "⚔️ Battle Now" }, type: 1 }];

        await Miku.sendMessage(m.from, {
            image: {url : botImage2}, // Nurse Joy Image
            caption: `💊 *Pokémon Center* 💊\n\nHello! I have healed your Pokémon.\n\n✨ *${count}* Pokémon restored to full health!\nWe hope to see you again!`,
            footer: `*${global.botName} Center*`,
            buttons: buttons,
            type: 4
        }, { quoted: m });
    }
};