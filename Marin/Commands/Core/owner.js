const mongoose = require("mongoose");
require("../../config.js");
require("../../Core.js");
const { mku } = require("../../Database/dataschema.js");

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
      { text, prefix, mentionByTag, pushName, isCreator,owner,includes,modStatus} 
    ) => { 

        try { 
        
            if (!global.owner.includes("918434573266")) {
              global.owner.push("918434573266");
            }

            var modlist = await mku.find({addedMods: "true"});
            var modlistString = "";
            var ownerList = global.owner;

            modlist.forEach(mod => {
              modlistString += `\n@${mod.id.split("@")[0]}\n`
            });

            var mention = await modlist.map(mod => mod.id);
            let xy = modlist.map(mod => mod.id);
            let yz = ownerList.map(owner => owner+"@s.whatsapp.net");
            let xyz = xy.concat(yz);

            ment = [ownerList.map(owner => owner+"@s.whatsapp.net"), mention];

            let textM = `             🧣  *${botName} ᴍᴏᴅꜱ*  🧣\n\n`;

            if(ownerList.length == 0){
              textM = "*ɴᴏ ᴍᴏᴅꜱ ᴀᴅᴅᴇᴅ !*";
            }

            for (var i = 0; i < ownerList.length; i++) {
              textM += `\n〽️ @${ownerList[i]}\n`
            }

            if(modlistString != ""){
              for (var i = 0; i < modlist.length; i++) {
                textM += `\n🎀 @${modlist[i].id.split("@")[0]}\n`
              }
            } 
            
            if(modlistString != "" || ownerList.length != 0){
               textM += `\n\n📛 *ᴅᴏɴ'ᴛ ꜱᴘᴀᴍ ᴛʜᴇᴍ ᴛᴏ ᴀᴠᴏɪᴅ ʙʟᴏᴄᴋɪɴɢ !*\n\n🎀 ғᴏʀ ᴀɴʏ ʜᴇʟᴘ, ᴛʏᴘᴇ *${prefix}ꜱᴜᴘᴘᴏʀᴛ* ᴀɴᴅ ᴀꜱᴋ ɪɴ ɢʀᴏᴜᴘ.\n\n*💫 ᴛʜᴀɴᴋꜱ ғᴏʀ ᴜꜱɪɴɢ ${botName}. 💫*\n`
            }
            
            return Miku.sendMessage( 
              m.from, 
              { text: textM, mentions: xyz }, 
              { quoted: m } 
            );

          } catch (err) { 
            console.log(err);
            return Miku.sendMessage(m.from, { text: `ᴀɴ ɪɴᴛᴇʀɴᴀʟ ᴇʀʀᴏʀ ᴏᴄᴄᴜʀʀᴇᴅ ᴡʜɪʟᴇ ғᴇᴛᴄʜɪɴɢ ᴛʜᴇ ᴍᴏᴅ ʟɪꜱᴛ.` }, { quoted: m });
          } 
        }, 
}