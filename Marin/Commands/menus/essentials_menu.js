// menus/essentials_menu.js
module.exports = {
  name: "essentials_menu",

  start: async (sock, m, { prefix, commands, pushName }) => {

    // 1️⃣ ESSENTIALS category ke commands nikalo
    let essentialCommands = [...commands.values()]
      .filter(cmd => {
        let cat = (cmd.category || "").toUpperCase();
        return cat === "ESSENTIALS" || cat === "BASIC" || cat === "TOOLS";
      });

    if (!essentialCommands.length) {
      return sock.sendMessage(
        m.from,
        { text: "❌ No Essentials commands found." },
        { quoted: m }
      );
    }

    // 2️⃣ Command list text
    let listText = essentialCommands
      .map((cmd, i) => `🔹 ${i + 1}. ${cmd.name}`)
      .join("\n");

    let textHelpMenu = `
🕯️✨ *${botName}* ✨🕯️

*📌 CATEGORY: ESSENTIALS*

*${listText}*

*What is this?*  
These are the most important everyday commands you’ll use.

*How to use:*  
Type *"${prefix}commandname"*

*Quick Tips:*  
• Use essentials to save time  
• Perfect for new users  
• Learn these first to master the bot
`;

    // 3️⃣ Rows for interactive list
    let rows = essentialCommands.map(cmd => ({
      title: cmd.name.toUpperCase(),
      description: cmd.desc || "Essential command",
      id: `${prefix}${cmd.name}`
    }));

    // 4️⃣ Interactive message (same structure)
    await sock.sendMessage(m.from, {
      interactiveMessage: {

        // TITLE — thoda informative + clean
        title: `
*ESSENTIAL COMMANDS — ${pushName}*

*Bot:* ${botName}  
*Section:* Daily Use Tools  
*Total Commands:* ${essentialCommands.length}

Start here if you’re new to the bot.
`,

        footer: "*Powered by Marin*",

        nativeFlowMessage: {

          messageParamsJson: JSON.stringify({
            bottom_sheet: {
              in_thread_buttons_limit: 10,
              list_title: "*Essential Commands*",
              button_title: "Open Essentials Menu"
            }
          }),

          buttons: [
            {
              name: "single_select",
              buttonParamsJson: JSON.stringify({
                title: "Select Essential Command",
                sections: [
                  {
                    title: "ESSENTIAL COMMANDS",
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