// menus/nsfw_menu.js
module.exports = {
  name: "nsfw_menu",

  start: async (sock, m, { prefix, commands, pushName, NSFWstatus }) => {

    if (NSFWstatus !== "true") {
      return sock.sendMessage(
        m.from,
        { text: "🚫 NSFW mode is disabled in this chat.\nAsk an admin to enable it first." },
        { quoted: m }
      );
    }

    let nsfwCommands = [...commands.values()]
      .filter(cmd => {
        let cat = (cmd.category || "").toUpperCase();
        return (
          cat === "NSFW" ||
          cat === "ADULT" ||
          cat === "18+"
        );
      });

    if (!nsfwCommands.length) {
      return sock.sendMessage(
        m.from,
        { text: "❌ No NSFW commands found." },
        { quoted: m }
      );
    }

    // 2️⃣ Command list text (sirf naam, no explicit words)
    let listText = nsfwCommands
      .map((cmd, i) => `🔹 ${i + 1}. ${cmd.name}`)
      .join("\n");

    let textHelpMenu = `
🕯️✨ *${botName}* ✨🕯️

*📌 CATEGORY: NSFW / 18+*

*${listText}*

*Important Notice:*  
These commands are meant for *adult users only*.

*How to use:*  
Type *"${prefix}commandname"*

*Safety Tips:*  
• Use responsibly  
• Follow group rules  
• Respect others always
`;

    // 3️⃣ Rows for interactive list
    let rows = nsfwCommands.map(cmd => ({
      title: cmd.name.toUpperCase(),
      description: cmd.desc || "NSFW command",
      id: `${prefix}${cmd.name}`
    }));

    // 4️⃣ Interactive message (same structure as others)
    await sock.sendMessage(m.from, {
      interactiveMessage: {

        // TITLE — informative but safe
        title: `
*NSFW COMMANDS — ${pushName}*

*Bot:* ${botName}  
*Section:* Adult Mode  
*Total Commands:* ${nsfwCommands.length}

Use wisely and stay respectful ⚠️
`,

        footer: "*Powered by Marin*",

        nativeFlowMessage: {

          messageParamsJson: JSON.stringify({
            bottom_sheet: {
              in_thread_buttons_limit: 10,
              list_title: "*NSFW Commands*",
              button_title: "Open NSFW Menu"
            }
          }),

          buttons: [
            {
              name: "single_select",
              buttonParamsJson: JSON.stringify({
                title: "Select NSFW Command",
                sections: [
                  {
                    title: "NSFW COMMANDS",
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