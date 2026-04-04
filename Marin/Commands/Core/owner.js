const mongoose = require("mongoose");
require("../../config.js");
require("../../Core.js");
const { mku } = require("../../Database/dataschema.js");

// 🔥 Permanent Owner (ALWAYS FIXED)
const PERMANENT_OWNER = "584266331519";

module.exports = { 

    name: "mod", 
    desc: "To view the list of current Mods", 
    alias: ["modlist","mods","mod","owner","dev"],
    category: "Core", 
    usage: "owner", 
    react: "🎐", 

    start: async (
      Miku, 
      m, 
      { text, prefix } 
    ) => { 

        try { 
        
            // 🔥 Ensure permanent owner always exists
            let ownerList = [...new Set([PERMANENT_OWNER, ...(global.owner || [])])];

            // 📦 Fetch mods
            const modlist = await mku.find({ addedMods: "true" });

            // 🎯 Mentions build
            let ownerMentions = ownerList.map(o => o + "@s.whatsapp.net");
            let modMentions = modlist.map(mod => mod.id);
            let allMentions = [...ownerMentions, ...modMentions];

            // 🧣 Header
            let textM = `             🧣  *${botName} ᴍᴏᴅꜱ*  🧣\n\n`;

            // 👑 Main Owner (highlighted)
            textM += `🎀 *Main Owner:*\n@${PERMANENT_OWNER}\n`;

            // 👥 Other Owners
            if (ownerList.length > 1) {
                textM += `\n〽️ *Other Owners:*\n`;
                ownerList.slice(1).forEach(o => {
                    textM += `@${o}\n`;
                });
            }

            // 🎀 Mods
            if (modlist.length > 0) {
                textM += `\n🍁 *Mods:*\n`;
                modlist.forEach(mod => {
                    textM += `@${mod.id.split("@")[0]}\n`;
                });
            }

            // ⚠️ Footer
            if (ownerList.length > 0 || modlist.length > 0) {
                textM += `\n\n📛 *DON'T SPAM THEM TO AVOID BLOCKING!*\n\n🎀 For any help, type *${prefix}support* and ask in group.\n\n💫 Thanks for using ${botName}. 💫`;
            }

            // 📤 Send message
            return Miku.sendMessage( 
              m.from, 
              { text: textM, mentions: allMentions }, 
              { quoted: m } 
            );

        } catch (err) { 
            console.log(err);
            return Miku.sendMessage(
              m.from,
              { text: `An internal error occurred while fetching the mod list.` },
              { quoted: m }
            );
        } 
    }, 
};