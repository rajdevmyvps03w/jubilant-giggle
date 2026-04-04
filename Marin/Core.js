require("./index.js");
require("./config.js");
require("./BotCharacters.js");
require("./Processes/welcome.js");
const {
  generateWAMessage,
  areJidsSameUser,
  proto,
} = require("@adiwajshing/baileys");
const {
  Simple,
  Collection,
  Function
} = require("./lib");
const {
  isUrl,
  isNumber
} = Function;
const axios = require("axios");
const {
  smsg,
  formatp,
  tanggal,
  GIFBufferToVideoBuffer,
  formatDate,
  getTime,
  sleep,
  clockString,
  runtime,
  fetchJson,
  getBuffer,
  jsonformat,
  format,
  parseMention,
  getRandom,
} = require("./lib/myfunc");
//const { getMarinReply } = require("./lib/chatbot");
const Func = require("./lib");
const fs = require("fs");
const moment = require("moment-timezone");
const chalk = require("chalk");
const {
  color
} = require("./lib/color");

const {
  Console
} = require("console");
const cool = new Collection();
const {
  mk,
  mku,
  mkchar,
  reg
} = require("./Database/dataschema.js");
const { report } = require("process");
const prefix = global.prefa;

// ---------- DATABASE CONNECTIONS ---------- //

// 1. Levels DB Connection
global.Levels = require("discord-xp");
Levels.setURL("mongodb+srv://Sten-X:Sten-X001@cluster0.69efne0.mongodb.net/?appName=Cluster0");
console.log(color("\nDatabase 1 has been connected Successfully !\n", "aqua"));

// 2. Economy DB Connection
const eco = require('discord-mongoose-economy');
const ty = eco.connect('mongodb+srv://Sten-X:Sten-X001@cluster0.69efne0.mongodb.net/?appName=Cluster0');
console.log(color("\nDatabase 2 has been connected Successfully !\n", "aqua"));

// ==============================================================================


module.exports = async (Miku, m, commands, chatUpdate, store) => {
  try {
    let {
      type,
      isGroup,
      sender,
      from
    } = m;

    // ---------- Safe message body extraction ----------
    let body = "";
    try {
      if (type === "buttonsResponseMessage") {
        body = m.message?.[type]?.selectedButtonId || "";

      } else if (type === "listResponseMessage") {
        body = m.message?.[type]?.singleSelectReply?.selectedRowId || "";

      } else if (type === "templateButtonReplyMessage") {
        body = m.message?.[type]?.selectedId || "";

      }
      // ✅ NEW — interactiveMessage handler
      else if (type === "interactiveResponseMessage") {
        const params =
          m.message?.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson;
        if (params) {
          const parsed = JSON.parse(params);
          body = parsed.id || "";
        }
      }

      else if (type === "extendedTextMessage") {
        body = m.text || m.message?.conversation || "";

      } else {
        body = m.text || m.message?.conversation || "";
      }
    } catch (err) {
      body = m.text || "";
    }
    body = typeof body === "string" ? body : "";

    // ---------- Basic derived values ----------
    const quoted = m.quoted ? m.quoted : m;
    const mime = (quoted.msg || m.msg)?.mimetype || " ";
    const isMedia = /image|video|sticker|audio/.test(mime);
    const budy = typeof m.text === "string" ? m.text : "";
    const args = (body || "").trim().split(/ +/).slice(1);
    const ar = args.map((v) => v.toLowerCase());
    let text = (q = args.join(" "));
    const groupName = m.isGroup ? (await (Miku.groupMetadata(from))).subject : '';

    // safe isCmd check
    const isCmd = Boolean(body && body.startsWith && body.startsWith(prefix));
    const prat = (typeof body === "string" && body.startsWith(prefix)) ? body : "";
    const cmdName = ((prat.slice(prefix.length).trim().split(/ +/).shift()) || "").toLowerCase();

    // ============ Gender Button Resolver ============ //
    if (type === "buttonsResponseMessage") {
      if (body === "gender_male" || body === "gender_female" || body === "gender_other") {
        await reg.updateOne({ id: m.sender }, { gender: body.replace("gender_", ""), step: "region" });
        return m.reply("🏮 Now type your Country / Region");
      }
    }

    const metadata = isGroup ? await Miku.groupMetadata(from) : {};
    const pushname = m.pushName;
    const participants = isGroup ? metadata.participants : [sender];
    const groupAdmin = isGroup ? participants.filter((v) => v.admin !== null).map((v) => v.id) : [];
    const botNumber = await Miku.decodeJid(Miku.user.id);
    const isBotAdmin = m.isGroup ? groupAdmin.includes(Miku.user?.jid) : false;
    const isAdmin = isGroup ? groupAdmin.includes(sender) : false;
    const isCreator = [botNumber, ...global.owner].map((v) => v.replace(/[^0-9]/g, "") + "@s.whatsapp.net").includes(m.sender);
    const isOwner = global.owner.includes(m.sender);
    global.suppL = 'https://chat.whatsapp.com/Cx1scYCxNhf29QS9BWuvrp';

    // ---------- Safe alias lookup function ----------
    function safeFind(name) {
      if (!commands) return null;
      try {
        const lowered = String(name || "").toLowerCase();
        if (typeof commands.get === "function") {
          const direct = commands.get(lowered) || commands.get(name);
          if (direct) return direct;
        }
        return Array.from(commands.values()).find((v) =>
          Array.isArray(v.alias) && v.alias.map(a => String(a).toLowerCase()).includes(lowered)
        ) || null;
      } catch (e) {
        console.warn("safeFind error:", e);
        return null;
      }
    }

    const cmd = (commands && typeof commands.get === "function" && (commands.get(cmdName) || commands.get(cmdName.toLowerCase()))) || safeFind(cmdName) || null;
    const icmd = cmd;

    const mentionByTag = type == "extendedTextMessage" && m.message.extendedTextMessage?.contextInfo != null ? m.message.extendedTextMessage.contextInfo.mentionedJid : [];

    // ======================= INTERACTIVE REGISTRATION HANDLER ======================= //
    let userReg = await reg.findOne({ id: m.sender });

    if (userReg && userReg.step !== "none" && !isCmd) {
      if (userReg.step === "name") {
        await reg.updateOne({ id: m.sender }, { name: m.text, step: "age" });
        return m.reply("🎗️ *Great!* Now send your *Age*");
      }
      if (userReg.step === "age") {
        await reg.updateOne({ id: m.sender }, { age: m.text, step: "gender" });
        let buttons = [
          { buttonId: "gender_male", buttonText: { displayText: "♂ Male" }, type: 1 },
          { buttonId: "gender_female", buttonText: { displayText: "♀ Female" }, type: 1 },
          { buttonId: "gender_other", buttonText: { displayText: "⚧ Other" }, type: 1 },
        ];
        return Miku.sendMessage(m.from, { text: `✨ Select your Gender`, footer: `* ${botName}🎀* Interactive Registration`, buttons }, { quoted: m });
      }
      if (userReg.step === "region") {
        await reg.updateOne({ id: m.sender }, { region: m.text, registered: true, step: "none" });
        return m.reply("🎉 *Registration Completed Successfully!* Now you can use all commands.");
      }
      return;
    }

    if (!isCreator) {
      let checkban = (await mku.findOne({ id: m.sender })) || (await new mku({ id: m.sender, name: m.pushName }).save());
      if (isCmd && checkban.ban !== "false" && budy != `${prefix}support` && budy != `${prefix}supportgc` && budy != `${prefix}owner` && budy != `${prefix}mods` && budy != `${prefix}mod` && budy != `${prefix}modlist`) return m.reply(`You are *Banned* from using commands for *${checkban.reason}* from *${checkban.gcname}*`);
    }

    // ------------------------ Character Configuration ------------------------ //
    let char = "0";
    let CharacterSelection = "0";
    let character = await mkchar.findOne({ id: "1" });
    if (character) { CharacterSelection = character.seletedCharacter; } else { let newCharacter = new mkchar({ id: "1", seletedCharacter: "0" }); await newCharacter.save(); }
    await mkchar.findOne({ id: "1" }).then(async (res) => {
      if (res.seletedCharacter != char) { CharacterSelection = res.seletedCharacter; } else { CharacterSelection = char; }
    });
    let idConfig = "charID" + CharacterSelection;
    global.botName = global[idConfig].botName;
    global.botVideo = global[idConfig].botVideo;
    global.botImage1 = global[idConfig].botImage1;
    global.botImage2 = global[idConfig].botImage2;
    global.botImage3 = global[idConfig].botImage3;
    global.botImage4 = global[idConfig].botImage4;
    global.botImage5 = global[idConfig].botImage5;
    global.botImage6 = global[idConfig].botImage6;

    //------------------------------------------- Antilink Configuration --------------------------------------------//
    let checkdata = await mk.findOne({ id: m.from });
    if (!checkdata) { new mk({ id: m.from, antilink: "false" }); }
    if (checkdata) {
      let mongoschema = checkdata.antilink || "false";
      if (m.isGroup && mongoschema == "true") {
        linkgce = await Miku.groupInviteCode(from);
        if ((budy || "").includes(`https://chat.whatsapp.com/${linkgce}`)) {
          m.reply(`\`\`\`「  Antilink System  」\`\`\`\n\nNo action will be taken because you sent this group's link.`);
        } else if ((budy || "").includes(`https://chat.whatsapp`)) {
          bvl = `\`\`\`「  Antilink System  」\`\`\`\n\nAdmin has sent a link so no issues.`;
          if (isAdmin) return m.reply(bvl);
          if (m.key.fromMe) return m.reply(bvl);
          if (isCreator) return m.reply(bvl);
          kice = m.sender;
          await Miku.groupParticipantsUpdate(m.from, [kice], "remove");
          await Miku.sendMessage(from, { delete: { remoteJid: m.from, fromMe: false, id: m.id, participant: m.sender } }, { quoted: m });
          await mk.updateOne({ id: m.from }, { antilink: "true" });
          Miku.sendMessage(from, { text: `\`\`\`「  Antilink System  」\`\`\`\n\n@${kice.split("@")[0]} Removed for sending WhatsApp group link in this group! Message has been deleted.`, mentions: [kice] }, { quoted: m });
        } else if (isUrl(m.text) && !icmd && !isAdmin && !isCreator) {
          await Miku.sendMessage(from, { delete: { remoteJid: m.from, fromMe: false, id: m.id, participant: m.sender } }, { quoted: m });
          m.reply(`Antilink is on ! To use any link related commands use my actual prefix ( ${prefix} ) ! \n\nExample : ${prefix}igdl <link>`);
        }
      }
    }

    //---------------------------------- Mode Configuration ------------------------------------//
    let modSTATUS = await mku.findOne({ id: m.sender });
    var modStatus = "false"
    if (!modSTATUS) { await mku.create({ id: m.sender, addedMods: "false" }); modStatus = "false"; }
    if (modSTATUS) { modStatus = modSTATUS.addedMods || "false"; }

    let botModeSet = await mkchar.findOne({ id: '1' });
    var workerMode = "false";
    if (botModeSet) {
      workerMode = botModeSet.privateMode || "false";
      if (workerMode == "true") { if (!global.owner.includes(`${m.sender.split("@")[0]}`) && modStatus == "false" && isCmd && m.sender != botNumber) { console.log("\nCommand Rejected ! Bot is in private mode !\n"); return; } }
      if (workerMode == "self") { if (m.sender != botNumber && isCmd) { console.log("\nCommand Rejected ! Bot is in Self mode !\n"); return; } }
    }

    //-------------------------------------- Group CMD Configuration ----------------------------------------//
    let botSwitchGC = await mk.findOne({ id: m.from });
    var botWrokerGC = "true"
    if (botSwitchGC) {
      botWrokerGC = botSwitchGC.botSwitch || "true";
      if (m.isGroup && botWrokerGC == "false" && !isAdmin && !isOwner && modStatus == "false" && isCmd) { return console.log(`\nCommand Rejected ! Bot is turned off in ${groupName} !\n`); }
    }

    //------------------------------------------- Chatbot Configuration ---------------------------------------------//
        // 1. GROUP CHAT LOGIC
        // let chatbotStatus = await mk.findOne({ id: m.from });
// let csts = chatbotStatus ? chatbotStatus.chatBot : "false";

// if (m.isGroup && csts === "true" && !icmd && !isCmd) {
//     // Reply only if bot is quoted
//     if (m.quoted && m.quoted.sender == botNumber) {
//         const userMsg = (m.body || m.text)?.trim();
//         if (userMsg) {
//             await Miku.sendPresenceUpdate("composing", m.from);
            
//             // Fetch AI Reply (Mood extract ho jayega par hum use text tak hi rakhenge)
//             const { reply } = await getMarinReply(userMsg, m.sender);
            
//             // Send Text Message
//             await Miku.sendMessage(m.from, { text: reply }, { quoted: m });
//         }
//     }
// }

// // 2. PM CHAT LOGIC
// let PMchatBotStatus = await mkchar.findOne({ id: "1" });
// let PMcsts = PMchatBotStatus ? PMchatBotStatus.PMchatBot : "false";

// if (!m.isGroup && PMcsts === "true" && !icmd && !isCmd) {
//     const userMsg = (m.body || m.text)?.trim();
//     if (userMsg) {
//         await Miku.sendPresenceUpdate("composing", m.from);
        
//         // Fetch AI Reply
//         const { reply } = await getMarinReply(userMsg, m.from);
        
//         // Send Text Message
//         await Miku.sendMessage(m.from, { text: reply }, { quoted: m });
//     }
// }
        
    //--------------------------------------------- NSFW Configuration -----------------------------------------------//
    let nsfwstatus = await mk.findOne({ id: m.from });
    let NSFWstatus = "false";
    if (nsfwstatus) { NSFWstatus = nsfwstatus.switchNSFW || "false"; }

    //---------------------------------------------- Group Banning Configuration --------------------------------------//
    let banGCStatus = await mk.findOne({ id: m.from });
    var BANGCSTATUS = "false";
    if (banGCStatus) { BANGCSTATUS = banGCStatus.bangroup || "false"; }
    if (BANGCSTATUS == "true" && (budy || "") != `${prefix}unbangc` && (budy || "") != `${prefix}unbangroup` && (body || "").startsWith(prefix) && (budy || "") != `${prefix}support` && (budy || "") != `${prefix}supportgc` && (budy || "") != `${prefix}owner` && (budy || "") != `${prefix}mods` && (budy || "") != `${prefix}mod` && (budy || "") != `${prefix}modlist`) {
      if (m.isGroup && !isOwner && modStatus == "false") { return m.reply(`*${global.botName}* is *Banned* on *${groupName}* group! \n\nType *${prefix}owner* or *${prefix}support* to submit a request to unban the group!`); }
    }

    //------------------------------------------- Pokemon System Configuration -----------------------------------------//
    let pokeSystemStatus = await mk.findOne({ id: m.from });
    var POKESYSTEMSTATUS = "false";
    if (pokeSystemStatus) { POKESYSTEMSTATUS = pokeSystemStatus.pokemonSystem || "false"; }
    const pokeCommands = ["pokestart", "pstart", "hunt", "wild", "catch", "pokedex", "mypoke", "pokeinfo", "release"];
    if (m.isGroup && POKESYSTEMSTATUS == "false" && pokeCommands.includes((cmdName || "").toLowerCase()) && !isAdmin && !isOwner && modStatus == "false") {
      return m.reply(`The *Pokémon System* is currently *disabled* in this group. 🔴\n\nAn admin can enable it using *${prefix}pokeswitch on*`);
    }

    // ===================== AFK SYSTEM ========================================
    const senderData = await mku.findOne({ id: m.sender });
    if (senderData && senderData.afk === "true" && !cmdName.includes("afk")) {
      await mku.updateOne({ id: m.sender }, { afk: "false", afkReason: "" });
      m.reply(`👋 *Welcome Back Senpai!* \nI have removed your AFK status.`);
    }
    if (m.message && mentionByTag && mentionByTag.length > 0) {
      for (let mentionedJid of mentionByTag) {
        const targetSystem = await mku.findOne({ id: mentionedJid });
        if (targetSystem && targetSystem.afk === "true") {
          let displayname = "Unknown User";
          const targetProfile = await reg.findOne({ id: mentionedJid });
          if (targetProfile && targetProfile.name) { displayname = targetProfile.name; }
          else { try { displayname = await Miku.getName(mentionedJid); } catch { displayname = mentionedJid.split('@')[0]; } }
          let afkMsg = `🤫 *Shh! Don't disturb them!* \n\n👤 *User:* ${displayname}\n💤 *Status:* Currently AFK\n📝 *Reason:* ${targetSystem.afkReason}\n\nWait for them to come back!`;
          Miku.sendMessage(m.from, { text: afkMsg }, { quoted: m });
        }
      }
    }

    const flags = args.filter((arg) => arg.startsWith("--"));
    if ((body || "").startsWith(prefix) && !icmd) {
      let mikutext = `*ᴏᴏᴘꜱ ɴᴏ ꜱᴜᴄʜ ᴄᴏᴍᴍᴀɴᴅ ᴘʀᴏɢʀᴀᴍᴍᴇᴅ ꜱᴇɴᴘᴀɪ! ʕ•̫͡•ʔ*\n`;
      let Button = [{ buttonId: `${prefix}help`, buttonText: { displayText: `〘 ᴄʟɪᴄᴋ ʜᴇʀᴇ ꜱᴇɴᴘᴀɪ 〙` }, type: 1 },];
      let bmffg = { image: { url: botImage1 }, caption: mikutext, footer: `*${botName}*`, buttons: Button, headerType: 4, };
      Miku.sendMessage(m.from, bmffg, { quoted: m });
    }

    if (m.message) {
      console.log(chalk.black(chalk.bgWhite("[ MESSAGE ]")), chalk.black(chalk.bgGreen(new Date())), chalk.black(chalk.bgBlue(budy || m.mtype)) + "\n" + chalk.magenta("=> From"), chalk.green(pushname), chalk.yellow(m.sender) + "\n" + chalk.blueBright("=> In"), chalk.green(m.isGroup ? m.from : "Private Chat", m.chat));
    }

    const blockedCommands = ["battleprofile", "mystats", "bp", "buycard", "buyc", "battle", "fight", "duel", "cardinfo", "viewcard", "ci", "addtomarket", "sellmarket", "addlist", "globalmarket", "cstore", "market", "gamblecard", "betcard", "claim", "catch", "pick", "collection", "deck", "mycards", "delist", "removemarket", "retrieve", "giftcard", "transfercard", "givecard", "lbcard", "topcards", "clb", "networth", "wealth", "sellcard", "sc", "setcard", "selectfighter", "bank", "capacity", "daily", "deposit", "gamble", "leaderboard", "lb", "rob", "slot", "transfer", "give", "wallet", "withdraw", "report", "huntpoke", "pokehunt", "pokemonbattle", "pokebattle", "catchpoke", "catch", "pokedex", "pokedeck", "pokefeed", "feedpoke", "pokegift", "givepoke", "giftpokemon", "pokeheal", "healpoke", "pokeinfo", "pokemoninfo", "pokeprotect", "protectpoke", "pokerelease", "sellpoke", "renamepoke", "renamepokemon", "setpokemon", "setpoke", "pokestart", "startpoke", "startpokemon", "poketaring", "taringpoke", "trainpokemon",];

    if (isCmd && blockedCommands.includes((cmdName || "").toLowerCase())) {
      const check = await reg.findOne({ id: m.sender });
      if (!check || !check.registered) {
        await reg.updateOne({ id: m.sender }, { step: "name" }, { upsert: true });
        return Miku.sendMessage(m.from, { text: `Konnichiwa (こんにちは) Senpai!~ \n\n〽️ Registration Required To Use *${botName}* Exclusive Commands\n\n🔮 You Don't Need To Do Much, Just Answer whatever Bot Asks.\n\n Example: *First Your Name*\n\nWith love ${botName},` }, { quoted: m });
      }
    }

    if (cmd) { const randomXp = Math.floor(Math.random() * 3) + 1; const haslUp = await Levels.appendXp(m.sender, "bot", randomXp); }

    if (text.endsWith("--info") || text.endsWith("--i") || text.endsWith("--?")) {
      let data = [];
      if (cmd && cmd.alias) data.push(`*Alias :* ${cmd.alias.join(", ")}`);
      if (cmd && cmd.desc) data.push(`*Description :* ${cmd.desc}\n`);
      if (cmd && cmd.usage) data.push(`*Example :* ${cmd.usage.replace(/%prefix/gi, prefix).replace(/%command/gi, cmd.name).replace(/%text/gi, text)}`);
      var buttonss = [{ buttonId: `${prefix}help`, buttonText: { displayText: `〘 ᴄʟɪᴄᴋ ʜᴇʀᴇ ꜱᴇɴᴘᴀɪ 〙` }, type: 1 },];
      let buttonmess = { text: `*ᴄᴏᴍᴍᴀɴᴅ ɪɴғᴏ *\n\n${data.join("\n")}`, footer: `*${botName}*`, buttons: buttonss, headerType: 1, };
      let reactionMess = { react: { text: cmd?.react, key: m.key, }, };
      if (cmd) { await Miku.sendMessage(m.from, reactionMess).then(() => { return Miku.sendMessage(m.from, buttonmess, { react: "🐼", quoted: m }); }); }
    }
    if (cmd && cmd.react) { const reactm = { react: { text: cmd.react, key: m.key, }, }; await Miku.sendMessage(m.from, reactm); }
    if (!cool.has(m.sender)) { cool.set(m.sender, new Collection()); }
    const now = Date.now();
    const timestamps = cool.get(m.sender);
    const cdAmount = (cmd && cmd.cool || 0) * 1000;
    if (timestamps.has(m.sender)) {
      const expiration = timestamps.get(m.sender) + cdAmount;
      if (now < expiration) {
        let timeLeft = (expiration - now) / 1000;
        return await Miku.sendMessage(m.from, { text: `You are on cooldown, please wait another _${timeLeft.toFixed(1)} second(s)_`, }, { quoted: m });
      }
    }
    timestamps.set(m.sender, now);
    setTimeout(() => timestamps.delete(m.sender), cdAmount);

    if (cmd && typeof cmd.start === "function") {
      try {
        await cmd.start(Miku, m, {
          name: "Miku",
          metadata,
          pushName: pushname,
          participants,
          body,
          args,
          ar,
          groupName,
          botNumber,
          flags,
          isAdmin,
          groupAdmin,
          text,
          eco,
          ty,
          quoted,
          mentionByTag,
          mime,
          isBotAdmin,
          prefix,
          modStatus,
          NSFWstatus,
          isCreator,
          store,
          command: cmd.name,
          commands,
          Function: Func,
          toUpper: function toUpper(query) {
            return query.replace(/^\w/, (c) => c.toUpperCase());
          },
        });
      } catch (err) {
        console.error("Error executing command", cmd.name || cmdName, err);
        try { await Miku.sendMessage(m.from, { text: "⚠️ Error executing command — contact owner." }, { quoted: m }); } catch (e) { }
      }
    }
  } catch (e) {
    e = String(e);
    if (!e.includes("cmd.start")) console.error(e);
  }
};