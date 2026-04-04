// menus/media_menu.js
module.exports = {
  name: "media_menu",

  start: async (sock, m, { prefix, commands, pushName }) => {

    // 1️⃣ MEDIA category ke commands nikalo
    let mediaCommands = [...commands.values()]
      .filter(cmd => {
        let cat = (cmd.category || "").toUpperCase();
        return (
          cat === "MEDIA" ||
          cat === "DOWNLOAD" ||
          cat === "DOWNLOADER" ||
          cat === "MEDIA TOOLS"
        );
      });

    if (!mediaCommands.length) {
      return sock.sendMessage(
        m.from,
        { text: "❌ No Media/Downloader commands found." },
        { quoted: m }
      );
    }

    // 2️⃣ Command list text
    let listText = mediaCommands
      .map((cmd, i) => `🔹 ${i + 1}. ${cmd.name}`)
      .join("\n");

    let textHelpMenu = `
🕯️✨ *${botName}* ✨🕯️

*📌 CATEGORY: MEDIA / DOWNLOADERS*

*${listText}*

*What is this?*  
Download videos, audios, and other media easily.

*How to use:*  
Type *"${prefix}commandname"*

*Pro Tips:*  
• Use Wi-Fi for big downloads  
• Choose quality wisely  
• Respect copyright rules
`;

    // 3️⃣ Rows for interactive list
    let rows = mediaCommands.map(cmd => ({
      title: cmd.name.toUpperCase(),
      description: cmd.desc || "Media / downloader command",
      id: `${prefix}${cmd.name}`
    }));

    // 4️⃣ Interactive message
    await sock.sendMessage(m.from, {
      interactiveMessage: {

        // TITLE — informative but clean
        title: `
*MEDIA COMMANDS — ${pushName}*

*Bot:* ${botName}  
*Section:* Video & Audio Download  
*Total Commands:* ${mediaCommands.length}

Grab your favorite media in one tap 🎬🎧
`,

        footer: "*Powered by Marin*",

        nativeFlowMessage: {

          messageParamsJson: JSON.stringify({
            bottom_sheet: {
              in_thread_buttons_limit: 10,
              list_title: "*Media Commands*",
              button_title: "Open Media Menu"
            }
          }),

          buttons: [
            {
              name: "single_select",
              buttonParamsJson: JSON.stringify({
                title: "Select Media Command",
                sections: [
                  {
                    title: "MEDIA COMMANDS",
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