const { mkpokemon } = require("../../Database/dataschema.js");

module.exports = {
    name: "renamepoke",
    alias: ["renamepokemon"],
    desc: "Give a nickname to your Pokemon",
    category: "Pokemon",
    usage: "rename <pokemon_name> | <new_nickname>",
    react: "🦕",
    start: async (Miku, m, { text, prefix }) => {
        if (!text.includes("|")) return m.reply(`⚠️ Usage: *${prefix}rename Pikachu | Sparky*`);

        const [pokeName, newNick] = text.split("|");
        const cleanName = pokeName.trim();
        const cleanNick = newNick.trim();

        const myPoke = await mkpokemon.findOne({ 
            owner: m.sender, 
            name: { $regex: new RegExp("^" + cleanName + "$", "i") } 
        });

        if (!myPoke) return m.reply(`🚫 You don't own a ${cleanName}!`);

        // Update Nickname
        myPoke.nickname = cleanNick;
        await myPoke.save();

        m.reply(`✅ Success! Your *${myPoke.name}* is now called *"${cleanNick}"*!`);
    }
};