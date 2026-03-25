// menus/economy_menu.js
module.exports = {
  name: "economy_menu",

  start: async (sock, m, { prefix, commands, pushName }) => {

    // 1️⃣ ECONOMY category ke commands nikalo
    let ecoCommands = [...commands.values()]
      .filter(cmd => {
        let cat = (cmd.category || "").toUpperCase();
        return cat === "ECONOMY" || cat === "ECONOMY SYSTEM" || cat === "BANK";
      });

    if (!ecoCommands.length) {
      return sock.sendMessage(
        m.from,
        { text: "❌ No Economy commands found." },
        { quoted: m }
      );
    }

    // 2️⃣ Command list text
    let listText = ecoCommands
      .map((cmd, i) => `🔹 ${i + 1}. ${cmd.name}`)
      .join("\n");

    let textHelpMenu = `
🕯️✨ *${botName}* ✨🕯️

*📌 CATEGORY: ECONOMY*

*${listText}*

*How to use:*  
Type *"${prefix}commandname"*

*Tips:*  
• Check your balance regularly  
• Save coins in bank for safety  
• Use daily rewards to grow faster
`;

    // 3️⃣ Rows for interactive list
    let rows = ecoCommands.map(cmd => ({
      title: cmd.name.toUpperCase(),
      description: cmd.desc || "Economy command",
      id: `${prefix}${cmd.name}`
    }));

    // 4️⃣ Interactive message
    await sock.sendMessage(m.from, {
      interactiveMessage: {

        // TITLE — clean + informative
        title: `
*ECONOMY COMMANDS — ${pushName}*

*Bot:* ${botName}  
*Section:* Wallet & Bank System  
*Total Commands:* ${ecoCommands.length}  

Use this menu to manage your money and rewards.
`,

        footer: "*Powered by Marin*",

        nativeFlowMessage: {

          messageParamsJson: JSON.stringify({
            bottom_sheet: {
              in_thread_buttons_limit: 10,
              list_title: "*Economy Commands*",
              button_title: "Open Economy Menu"
            }
          }),

          buttons: [
            {
              name: "single_select",
              buttonParamsJson: JSON.stringify({
                title: "Select Economy Command",
                sections: [
                  {
                    title: "ECONOMY COMMANDS",
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