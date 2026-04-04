// menus/rpg_menu.js
module.exports = {
  name: "rpg_menu",

  start: async (sock, m, { prefix, commands, pushName }) => {

    // 1️⃣ RPG category ke commands nikalo
    let rpgCommands = [...commands.values()]
      .filter(cmd => {
        let cat = (cmd.category || "").toUpperCase();
        return (
          cat === "RPG" ||
          cat === "ROLEPLAY" ||
          cat === "GAME" ||
          cat === "ADVENTURE"
        );
      });

    if (!rpgCommands.length) {
      return sock.sendMessage(
        m.from,
        { text: "❌ No RPG commands found." },
        { quoted: m }
      );
    }

    // 2️⃣ Command list text
    let listText = rpgCommands
      .map((cmd, i) => `🔹 ${i + 1}. ${cmd.name}`)
      .join("\n");

    let textHelpMenu = `
🕯️✨ *${botName}* ✨🕯️

*📌 CATEGORY: RPG SYSTEM*

*${listText}*

*What is this?*  
Play, level up, earn rewards, and build your character.

*How to use:*  
Type *"${prefix}commandname"*

*RPG Tips:*  
• Play daily to gain XP  
• Complete missions for rewards  
• Level up to unlock more features
`;

    // 3️⃣ Rows for interactive list
    let rows = rpgCommands.map(cmd => ({
      title: cmd.name.toUpperCase(),
      description: cmd.desc || "RPG command",
      id: `${prefix}${cmd.name}`
    }));

    // 4️⃣ Interactive message
    await sock.sendMessage(m.from, {
      interactiveMessage: {

        // TITLE — informative + game vibe
        title: `
*RPG COMMANDS — ${pushName}*

*Bot:* ${botName}  
*Section:* Adventure & Level System  
*Total Commands:* ${rpgCommands.length}

Start your adventure and become a legend ⚔️
`,

        footer: "*Powered by Marin*",

        nativeFlowMessage: {

          messageParamsJson: JSON.stringify({
            bottom_sheet: {
              in_thread_buttons_limit: 10,
              list_title: "*RPG Commands*",
              button_title: "Open RPG Menu"
            }
          }),

          buttons: [
            {
              name: "single_select",
              buttonParamsJson: JSON.stringify({
                title: "Select RPG Command",
                sections: [
                  {
                    title: "RPG COMMANDS",
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