// menus/mods_menu.js
module.exports = {
  name: "mods_menu",

  start: async (sock, m, { prefix, commands, pushName }) => {

    // 1️⃣ MODERATION / MODS category ke commands nikalo
    let modCommands = [...commands.values()]
      .filter(cmd => {
        let cat = (cmd.category || "").toUpperCase();
        return (
          cat === "MOD" ||
          cat === "MODS" ||
          cat === "MODERATION" ||
          cat === "STAFF"
        );
      });

    if (!modCommands.length) {
      return sock.sendMessage(
        m.from,
        { text: "❌ No Moderation commands found." },
        { quoted: m }
      );
    }

    // 2️⃣ Command list text
    let listText = modCommands
      .map((cmd, i) => `🔹 ${i + 1}. ${cmd.name}`)
      .join("\n");

    let textHelpMenu = `
🕯️✨ *${botName}* ✨🕯️

*📌 CATEGORY: MODERATION / MODS*

*${listText}*

*What is this?*  
These commands are for moderators and trusted staff.

*How to use:*  
Type *"${prefix}commandname"*

*Mod Tips:*  
• Use powers responsibly  
• Keep chat clean & safe  
• Follow rules before actions
`;

    // 3️⃣ Rows for interactive list
    let rows = modCommands.map(cmd => ({
      title: cmd.name.toUpperCase(),
      description: cmd.desc || "Moderation command",
      id: `${prefix}${cmd.name}`
    }));

    // 4️⃣ Interactive message
    await sock.sendMessage(m.from, {
      interactiveMessage: {

        // TITLE — informative
        title: `
*MODERATION COMMANDS — ${pushName}*

*Bot:* ${botName}  
*Section:* Staff & Control Tools  
*Total Commands:* ${modCommands.length}

With great power comes great responsibility ⚖️
`,

        footer: "*Powered by Marin*",

        nativeFlowMessage: {

          messageParamsJson: JSON.stringify({
            bottom_sheet: {
              in_thread_buttons_limit: 10,
              list_title: "*Moderation Commands*",
              button_title: "Open Mods Menu"
            }
          }),

          buttons: [
            {
              name: "single_select",
              buttonParamsJson: JSON.stringify({
                title: "Select Mod Command",
                sections: [
                  {
                    title: "MODERATION COMMANDS",
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