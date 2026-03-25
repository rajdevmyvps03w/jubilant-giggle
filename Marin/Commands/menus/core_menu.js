// menus/core_menu.js
module.exports = {
  name: "core_menu",

  start: async (sock, m, { prefix, commands, pushName }) => {

    // 1️⃣ CORE category ke commands nikalo
    let coreCommands = [...commands.values()]
      .filter(cmd => (cmd.category || "").toUpperCase() === "CORE");

    if (!coreCommands.length) {
      return sock.sendMessage(
        m.from,
        { text: "❌ No CORE commands found." },
        { quoted: m }
      );
    }

    // 2️⃣ Command list text
    let listText = coreCommands
      .map((cmd, i) => `🔹 ${i + 1}. ${cmd.name}`)
      .join("\n");

    let textHelpMenu = `
🕯️✨ *${botName}* ✨🕯️

*📌 CATEGORY: CORE*

*${listText}*

*How to use:*  
Type *"${prefix}commandname"*

*Tips:*  
• Use *${prefix}help* to return to menu  
• Tap any command below to run it  
• Core commands handle basic bot features
`;

    // 3️⃣ Rows for interactive list
    let rows = coreCommands.map(cmd => ({
      title: cmd.name.toUpperCase(),
      description: cmd.desc || "Core command",
      id: `${prefix}${cmd.name}`
    }));

    // 4️⃣ Interactive message
    await sock.sendMessage(m.from, {
      interactiveMessage: {

        // 🔹 TITLE with a bit more info (clean & useful)
        title: `
*CORE COMMANDS — ${pushName}*

*Bot:* ${botName}  
*Section:* Core Features  
*Total Commands:* ${coreCommands.length}  

Use this menu to access all basic bot commands.
`,

        footer: "*Powered by Marin*",

        nativeFlowMessage: {

          messageParamsJson: JSON.stringify({
            bottom_sheet: {
              in_thread_buttons_limit: 10,
              list_title: "*Core Commands*",
              button_title: "Open Core Menu"
            }
          }),

          buttons: [
            {
              name: "single_select",
              buttonParamsJson: JSON.stringify({
                title: "Select Core Command",
                sections: [
                  {
                    title: "CORE COMMANDS",
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