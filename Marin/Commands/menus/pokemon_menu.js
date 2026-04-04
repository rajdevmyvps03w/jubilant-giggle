// menus/pokemon_menu.js
module.exports = {
  name: "pokemon_menu",

  start: async (sock, m, { prefix, commands, pushName }) => {

    // 1️⃣ POKEMON category ke commands nikalo
    let pokeCommands = [...commands.values()]
      .filter(cmd => {
        let cat = (cmd.category || "").toUpperCase();
        return (
          cat === "POKEMON" ||
          cat === "POKE" ||
          cat === "POKEDEX" ||
          cat === "POKEMON SYSTEM"
        );
      });

    if (!pokeCommands.length) {
      return sock.sendMessage(
        m.from,
        { text: "❌ No Pokémon commands found." },
        { quoted: m }
      );
    }

    // 2️⃣ Command list text
    let listText = pokeCommands
      .map((cmd, i) => `🔹 ${i + 1}. ${cmd.name}`)
      .join("\n");

    let textHelpMenu = `
🕯️✨ *${botName}* ✨🕯️

*📌 CATEGORY: POKÉMON SYSTEM*

*${listText}*

*What is this?*  
Catch, train, battle, and manage your Pokémon.

*How to use:*  
Type *"${prefix}commandname"*

*Trainer Tips:*  
• Catch daily for better teams  
• Train Pokémon to level up  
• Build a balanced squad
`;

    // 3️⃣ Rows for interactive list
    let rows = pokeCommands.map(cmd => ({
      title: cmd.name.toUpperCase(),
      description: cmd.desc || "Pokémon system command",
      id: `${prefix}${cmd.name}`
    }));

    // 4️⃣ Interactive message
    await sock.sendMessage(m.from, {
      interactiveMessage: {

        // TITLE — informative + clean
        title: `
*POKÉMON COMMANDS — ${pushName}*

*Bot:* ${botName}  
*Section:* Catch • Train • Battle  
*Total Commands:* ${pokeCommands.length}

Become the ultimate Pokémon Trainer ⚡
`,

        footer: "*Powered by Marin*",

        nativeFlowMessage: {

          messageParamsJson: JSON.stringify({
            bottom_sheet: {
              in_thread_buttons_limit: 10,
              list_title: "*Pokémon Commands*",
              button_title: "Open Pokémon Menu"
            }
          }),

          buttons: [
            {
              name: "single_select",
              buttonParamsJson: JSON.stringify({
                title: "Select Pokémon Command",
                sections: [
                  {
                    title: "POKÉMON COMMANDS",
                    rows
                  }
                ]
              })
            },
            {
              name: "quick_reply",
              buttonParamsJson: JSON.stringify({
                display_text: "⬅ Back to Menu",
                id: `${prefix}help`
              })
            }
          ]

        }

      },

      caption: textHelpMenu

    }, { quoted: m });

  }
};