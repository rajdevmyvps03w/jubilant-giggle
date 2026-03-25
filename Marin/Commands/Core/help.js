module.exports = {
  name: "help",
  alias: ["fullmenu", "h"],
  react: "✨",

  start: async (sock, m, { prefix, pushName }) => {

    // ❗ Caption ab secondary hai, main power TITLE me hai
    let textHelpMenu = `
Need help senpai? 💖  
Open menu and explore commands easily ✨
`;

    // 🔥 ADVANCED TITLE SYSTEM
    let advancedTitle = `
Konnichiwa – こんにちは~ *${pushName}* 

🕯️ Welcome to *${botName}* 🕯️  
Your cute little helper bot 💫  

───────────────  
🎀 HOW TO USE  
*Type: ${prefix}Menu* 

🏮 SUPPORT  
*Type: ${prefix}Support* 

🧩 REPORT  
*Type: ${prefix}report <issue>* 

───────────────  
*💡 Tip:* 
Tap any category below to explore magic ✨  
Have fun, senpai~ 💕
`;

    await sock.sendMessage(m.from, {
      interactiveMessage: {

        // 🌟 AB TITLE HI SAB KUCH BOLEGA
        title: advancedTitle,

        footer: "*Powered by Marin MD*",

        image: { url: botImage6 },

        nativeFlowMessage: {

          messageParamsJson: JSON.stringify({
            bottom_sheet: {
              in_thread_buttons_limit: 5,
              divider_indices: [1, 2, 3, 4, 5],
              list_title: "Select Category",
              button_title: "Open Cute Menu ✨"
            }
          }),

          buttons: [

            // CATEGORY MENU
            {
              name: "single_select",
              buttonParamsJson: JSON.stringify({
                title: "Choose Your Magic ✨",
                sections: [
                  {
                    title: "📌 MAIN CATEGORIES",
                    highlight_label: "HELP MENU",
                    rows: [
                      { title: "CORE", description: "Basic bot powers ✨", id: `${prefix}core_menu` },
                      { title: "GROUP", description: "Admin & group tools 🏮", id: `${prefix}Group_Menu` },
                      { title: "MODERATION", description: "Mod safety commands 🛡️", id: `${prefix}Mods_Menu` },
                      { title: "MEDIA", description: "Music & video magic 🎬", id: `${prefix}Media_Menu` },
                      { title: "SEARCH", description: "Find anything 🔍", id: `${prefix}Search_Menu` },
                      { title: "FUN", description: "Enjoyable commands 🎉", id: `${prefix}Fun_Menu` },
                      { title: "NSFW", description: "Adult content 🔥", id: `${prefix}NSFW_Menu` },
                      { title: "RPG", description: "Adventure system ⚔️", id: `${prefix}RPG_Menu` },
                      { title: "ECONOMY", description: "Money & bank 💰", id: `${prefix}Economy_Menu` },
                      { title: "CARD", description: "Card System 🎴", id: `${prefix}Card_Menu` },
                      { title: "AUDIOEDIT", description: "Audio Edit 🎵", id: `${prefix}AudioEdit_Menu` },
                      { title: "ESSENTIALS", description: "Essential commands 💫", id: `${prefix} Essentials_Menu` },
                      { title: "POKEMON", description: "Catch them all! ⚡", id: `${prefix} Pokemon_Menu` },
                      { title: "IMAGE EDITOR", description: "Edit pictures 🖼️", id: `${prefix}ImageManipulation_Menu` },
                      { title: "UTILITIES", description: "Daily useful tools 🛠️", id: `${prefix}Utilities_Menu` },
                      { title: "WEEB", description: "Anime world 🌸", id: `${prefix}Weeb_Menu` },
                      { title: "LOGO", description: "Create logos 🎨", id: `${prefix}LogoMaker_Menu` },
                      { title: "REACTIONS", description: "Reaction images 😊", id: `${prefix}Reactions_Menu` }
                    ]
                  }
                ]
              })
            },

            // OWNER BUTTON
            {
              name: "quick_reply",
              buttonParamsJson: JSON.stringify({
                display_text: "🕯️ OWNER",
                id: `${prefix}owner`
              })
            },

            // COPY SUPPORT LINK
            {
              name: "cta_copy",
              buttonParamsJson: JSON.stringify({
                display_text: "📋 Copy Support Link",
                id: "support_copy",
                copy_code: "https://chat.whatsapp.com/FRQe4g1OresD4hkjIWGzkz"
              })
            }

          ]

        }

      },

      // caption minimal rakha kyunki WhatsApp ise ignore karta hai interactive me
      caption: textHelpMenu

    }, { quoted: m });

  }
};