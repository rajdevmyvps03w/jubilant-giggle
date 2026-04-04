// menus/reactions_menu.js
module.exports = {
  name: "reactions_menu",

  start: async (sock, m, { prefix, commands, pushName }) => {

    // 1️⃣ REACTIONS category ke commands nikalo
    let reactionCommands = [...commands.values()]
      .filter(cmd => {
        let cat = (cmd.category || "").toUpperCase();
        return (
          cat === "REACTIONS" ||
          cat === "REACTION" ||
          cat === "ACTIONS" ||
          cat === "EMOTES"
        );
      });

    if (!reactionCommands.length) {
      return sock.sendMessage(
        m.from,
        { text: "❌ No Reaction commands found." },
        { quoted: m }
      );
    }

    // 2️⃣ Command list text
    let listText = reactionCommands
      .map((cmd, i) => `🔹 ${i + 1}. ${cmd.name}`)
      .join("\n");

    let textHelpMenu = `
🕯️✨ *${botName}* ✨🕯️

*📌 CATEGORY: REACTIONS*

*${listText}*

*What is this?*  
Express your feelings with fun reaction commands.

*How to use:*  
Type *"${prefix}commandname"*

*Reaction Tips:*  
• Use in replies for best effect  
• Tag friends for more fun  
• Perfect for group chats 😄
`;

    // 3️⃣ Rows for interactive list
    let rows = reactionCommands.map(cmd => ({
      title: cmd.name.toUpperCase(),
      description: cmd.desc || "Reaction command",
      id: `${prefix}${cmd.name}`
    }));

    // 4️⃣ Interactive message
    await sock.sendMessage(m.from, {
      interactiveMessage: {

        // TITLE — informative + friendly
        title: `
*REACTION COMMANDS — ${pushName}*

*Bot:* ${botName}  
*Section:* Emotes & Actions  
*Total Commands:* ${reactionCommands.length}

Make chats more lively with reactions 🎉
`,

        footer: "*Powered by Marin*",

        nativeFlowMessage: {

          messageParamsJson: JSON.stringify({
            bottom_sheet: {
              in_thread_buttons_limit: 10,
              list_title: "*Reaction Commands*",
              button_title: "Open Reactions Menu"
            }
          }),

          buttons: [
            {
              name: "single_select",
              buttonParamsJson: JSON.stringify({
                title: "Select Reaction Command",
                sections: [
                  {
                    title: "REACTION COMMANDS",
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