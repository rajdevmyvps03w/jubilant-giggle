// menus/audioedit_menu.js
module.exports = {
  name: "audioedit_menu",

  start: async (sock, m, { prefix, commands, pushName }) => {

    // 1️⃣ AUDIO EDIT category ke commands nikalo
    let audioCommands = [...commands.values()]
      .filter(cmd => {
        let cat = (cmd.category || "").toUpperCase();
        return cat === "AUDIO EDIT" || cat === "AUDIOEDIT" || cat === "AUDIO";
      });

    if (!audioCommands.length) {
      return sock.sendMessage(
        m.from,
        { text: "❌ No Audio Edit commands found." },
        { quoted: m }
      );
    }

    // 2️⃣ Command list text
    let listText = audioCommands
      .map((cmd, i) => `🔹 ${i + 1}. ${cmd.name}`)
      .join("\n");

    let textHelpMenu = `
🕯️✨ *${botName}* ✨🕯️

*📌 CATEGORY: AUDIO EDIT*

*${listText}*

*How to use:*  
Type *"${prefix}commandname"*

*Tips:*  
• Send an audio/video with the command  
• Use headphones for better preview  
• Edit, remix and enjoy clean audio
`;

    // 3️⃣ Rows for interactive list
    let rows = audioCommands.map(cmd => ({
      title: cmd.name.toUpperCase(),
      description: cmd.desc || "Audio edit command",
      id: `${prefix}${cmd.name}`
    }));

    // 4️⃣ Interactive message
    await sock.sendMessage(m.from, {
      interactiveMessage: {

        // TITLE — clean + little info
        title: `
*AUDIO EDIT COMMANDS — ${pushName}*

*Bot:* ${botName}  
*Section:* Audio Editing Tools  
*Total Commands:* ${audioCommands.length}  

Use this menu to edit, convert and enhance audio files.
`,

        footer: "*Powered by Marin*",

        nativeFlowMessage: {

          messageParamsJson: JSON.stringify({
            bottom_sheet: {
              in_thread_buttons_limit: 10,
              list_title: "*Audio Edit Commands*",
              button_title: "Open Audio Menu"
            }
          }),

          buttons: [
            {
              name: "single_select",
              buttonParamsJson: JSON.stringify({
                title: "Select Audio Edit Command",
                sections: [
                  {
                    title: "AUDIO EDIT COMMANDS",
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