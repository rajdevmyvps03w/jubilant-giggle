module.exports = {
  name: "imagemanipulationmenu",
  alias: ["immenu"],
  desc: "Gives all bot commands list",
  react: "✨",
  category: "",
  start: async (Miku, m, {prefix,pushName,NSFWstatus,args,commands,text}) => {

if (args[0]) {
            let data = []
            let name = args[0].toLowerCase()
            let cmd = commands.get(name) || Array.from(commands.values()).find((v) => v.alias.includes(name))
            if (!cmd || cmd.type == "hide") return m.reply("No Command Found")
            else data.push(`🍁Command : ${cmd.name.replace(/^\w/, c => c.toUpperCase())}`)
            if (cmd.alias) data.push(`👾Alias : ${cmd.alias.join(", ")}`) 
            if(cmd.cool) data.push(`⏱️Cooldown: ${cmd.cool}`)       
            if (cmd.desc) data.push(`🧾Description : ${cmd.desc}`)
            if (cmd.usage) data.push(`💡Example : ${cmd.usage.replace(/%prefix/gi, prefix).replace(/%command/gi, cmd.name).replace(/%text/gi, text)}`)
            var buttonss = [
				{buttonId: `${prefix}help`, buttonText: {displayText: `🕯️✨ ʜᴇʟᴘ ✨🕯️`}, type: 1},]
            let buth={
                text:`ℹ️Command Info\n\n${data.join("\n")}`,
                footer: `${botName}`,
                buttons:buttonss,
                headerType:1
            }    
            return Miku.sendMessage(m.from,buth,{quoted:m})
        } else {

let textHelpMenu = `ᴋᴏɴɴɪᴄʜɪᴡᴀ *${pushName}* ꜱᴇɴᴘᴀɪ
,
ɪ ᴀᴍ *${botName}*, ᴀ ʙᴏᴛ ᴅᴇᴠᴇʟᴏᴘᴇᴅ ʙʏ *Sten-X*

🎀 ᴍʏ ᴘʀᴇғɪꭗ ɪꜱ: *${prefix}*

ʜᴇʀᴇ'ꜱ ᴛʜᴇ ʟɪꜱᴛ ᴏғ ᴍʏ ᴄᴏᴍᴘʟᴇᴛᴇ ɪᴍᴀɢᴇ ᴍᴀɴɪᴘᴜʟᴀᴛɪᴏɴ ᴄᴏᴍᴍᴀɴᴅꜱ.\n
             
╭────ꕥ ɪᴍᴀɢᴇ ꕥ────╮
├
├・🎐 ʙʟᴜʀ, ᴄɪʀᴄʟᴇ 
├・🎐 ᴄɪʀᴄʟᴇɪᴍᴀɢᴇ, ᴊᴀɪʟ,
├・🎐 ʀᴇᴍᴏᴠᴇʙɢ, ᴛʀɪɢɢᴇʀ
├
\n\n`
          
textHelpMenu +=`*🕯️✨  ${botName}  ✨🕯️*
 ᴘᴏᴡᴇʀᴇᴅ ʙʏ: *© Marin Kitagawa*
🎐 *ᴄᴏᴅᴇᴅ ʙʏ Sten-X*
🎀 ᴛᴏ ᴜꜱᴇ ᴀɴʏ ᴏғ ᴛʜᴇꜱᴇ ᴄᴏᴍᴍᴀɴᴅꜱ ᴛʏᴘᴇ  
" *${prefix}ᴄᴏᴍᴍᴀɴᴅ ɴᴀᴍᴇ* ".
🏮 ᴛᴏ ɢᴇᴛ ꜱᴜᴘᴘᴏʀᴛ ɢʀᴏᴜᴘ ʟɪɴᴋ ᴛʏᴘᴇ " *${prefix}ꜱᴜᴘᴘᴏʀᴛ* ".
🧩 ᴛᴏ ʀᴇᴘᴏʀᴛ ᴀɴʏ ɪꜱꜱᴜᴇꜱ ᴛᴏ ᴅᴇᴠᴇʟᴏᴘᴇʀ ᴛʏᴘᴇ " *${prefix}ʀᴇᴘᴏʀᴛ 〘 ᴅᴇꜱᴄʀɪʙᴇ ɪꜱꜱᴜᴇ 〙* ".\n`

let buttons = [
    {
      buttonId: `${prefix}owner`,
      buttonText: { displayText: "🕯️𝓞𝓦𝓝𝓔𝓡" },
      type: 1,
    },
  ];
  let buttonMessage = {
    video: botVideo, gifPlayback: true,
    caption: textHelpMenu,
    buttons: buttons,
    headerType: 4,
  };

  await Miku.sendMessage(m.from, buttonMessage, { quoted: m });
}
  }
}