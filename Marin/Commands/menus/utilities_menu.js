// menus/utilities_menu.js
module.exports = {
  name: "utilities_menu",

  start: async (sock, m, { prefix, commands, pushName }) => {

    // 1️⃣ UTILITIES category ke commands nikalo
    let utilCommands = [...commands.values()]
      .filter(cmd => {
        let cat = (cmd.category || "").toUpperCase();
        return (
          cat === "UTILITIES" ||
          cat === "UTILITY" ||
          cat === "TOOLS" ||
          cat === "BASIC TOOLS"
        );
      });

    if (!utilCommands.length) {
      return sock.sendMessage(
        m.from,
        { text: "❌ No Utilities commands found." },
        { quoted: m }
      );
    }

    // 2️⃣ Command list text
    let listText = utilCommands
      .map((cmd, i) => `🔹 ${i + 1}. ${cmd.name}`)
      .join("\n");

    let textHelpMenu = `
🕯️✨ *${botName}* ✨🕯️

*📌 CATEGORY: UTILITIES*

*${listText}*

*What is this?*  
These are your everyday helper tools for quick tasks.

*How to use:*  
Type *"${prefix}commandname"*

*Utility Tips:*  
• Use tools to save time  
• Perfect for daily needs  
• Makes bot more powerful
`;

    // 3️⃣ Rows for interactive list
    let rows = utilCommands.map(cmd => ({
      title: cmd.name.toUpperCase(),
      description: cmd.desc || "Utility command",
      id: `${prefix}${cmd.name}`
    }));

    // 4️⃣ Interactive message
    await sock.sendMessage(m.from, {
      interactiveMessage: {

        // TITLE — informative + clean
        title: `
*UTILITIES COMMANDS — ${pushName}*

*Bot:* ${botName}  
*Section:* Daily Tools & Helpers  
*Total Commands:* ${utilCommands.length}

Small tools, big help ⚙️
`,

        footer: "*Powered by Marin*",

        nativeFlowMessage: {

          messageParamsJson: JSON.stringify({
            bottom_sheet: {
              in_thread_buttons_limit: 10,
              list_title: "*Utilities Commands*",
              button_title: "Open Utilities Menu"
            }
          }),

          buttons: [
            {
              name: "single_select",
              buttonParamsJson: JSON.stringify({
                title: "Select Utility Command",
                sections: [
                  {
                    title: "UTILITIES COMMANDS",
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