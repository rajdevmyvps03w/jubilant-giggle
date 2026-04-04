// menus/imagemanipulation_menu.js
module.exports = {
  name: "imagemanipulation_menu",

  start: async (sock, m, { prefix, commands, pushName }) => {

    // 1️⃣ IMAGE / MANIPULATION category ke commands nikalo
    let imageCommands = [...commands.values()]
      .filter(cmd => {
        let cat = (cmd.category || "").toUpperCase();
        return (
          cat === "IMAGE" ||
          cat === "IMAGE EDIT" ||
          cat === "IMAGE MANIPULATION" ||
          cat === "IMAGE TOOLS"
        );
      });

    if (!imageCommands.length) {
      return sock.sendMessage(
        m.from,
        { text: "❌ No Image Manipulation commands found." },
        { quoted: m }
      );
    }

    // 2️⃣ Command list text
    let listText = imageCommands
      .map((cmd, i) => `🔹 ${i + 1}. ${cmd.name}`)
      .join("\n");

    let textHelpMenu = `
🕯️✨ *${botName}* ✨🕯️

*📌 CATEGORY: IMAGE MANIPULATION*

*${listText}*

*What is this?*  
Edit, enhance, and transform your images using these tools.

*How to use:*  
Type *"${prefix}commandname"*

*Pro Tips:*  
• Send an image with the command  
• Try different effects for best result  
• Perfect for memes, DP, and posters
`;

    // 3️⃣ Rows for interactive list
    let rows = imageCommands.map(cmd => ({
      title: cmd.name.toUpperCase(),
      description: cmd.desc || "Image editing command",
      id: `${prefix}${cmd.name}`
    }));

    // 4️⃣ Interactive message (same structure)
    await sock.sendMessage(m.from, {
      interactiveMessage: {

        // TITLE — informative
        title: `
*IMAGE MANIPULATION — ${pushName}*

*Bot:* ${botName}  
*Section:* Photo Editing Tools  
*Total Commands:* ${imageCommands.length}

Turn simple images into something awesome ✨
`,

        footer: "*Powered by Marin*",

        nativeFlowMessage: {

          messageParamsJson: JSON.stringify({
            bottom_sheet: {
              in_thread_buttons_limit: 10,
              list_title: "*Image Commands*",
              button_title: "Open Image Menu"
            }
          }),

          buttons: [
            {
              name: "single_select",
              buttonParamsJson: JSON.stringify({
                title: "Select Image Command",
                sections: [
                  {
                    title: "IMAGE MANIPULATION COMMANDS",
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