module.exports = {
  name: "add",
  alias: ["addmember", "invite"],
  desc: "Ultra safe slow add with invite fallback",
  category: "Group",
  usage: "add 91xxx, 92xxx",
  react: "➕",

  start: async (Miku, m, { text, isAdmin, isBotAdmin, pushName }) => {

    if (!m.isGroup)
      return Miku.sendMessage(m.from, { text: "❌ Ye command sirf group me use hota hai!" }, { quoted: m });

    if (!isAdmin)
      return Miku.sendMessage(m.from, { text: "❌ Sirf admin use kar sakta hai!" }, { quoted: m });

    if (!isBotAdmin)
      return Miku.sendMessage(m.from, { text: "❌ Bot ko admin banao pehle!" }, { quoted: m });

    if (!text)
      return Miku.sendMessage(m.from, { text: "⚠️ Numbers do!\nExample: .add 9199xxx, 9233xxx" }, { quoted: m });

    // 🔥 Extract numbers
    let numbers = text
      .replace(/[^0-9]/g, " ")
      .split(" ")
      .filter(num => num.length >= 8);

    if (numbers.length === 0)
      return Miku.sendMessage(m.from, { text: "❌ Valid numbers nahi mile!" }, { quoted: m });

    let users = numbers.map(num => num + "@s.whatsapp.net");

    let success = [];
    let failed = [];

    // 🔗 Group invite link
    let inviteLink = await Miku.groupInviteCode(m.from);
    inviteLink = `https://chat.whatsapp.com/${inviteLink}`;

    await Miku.sendMessage(m.from, {
      text: `🚀 *Ultra Slow Adding Started...*\n\n👥 Total: ${users.length}\n⏳ Safe mode ON (anti-ban)\n\nPlease wait patiently...`
    }, { quoted: m });

    // ⏳ Delay function
    const delay = (ms) => new Promise(res => setTimeout(res, ms));

    for (let i = 0; i < users.length; i++) {
      let user = users[i];

      try {
        let res = await Miku.groupParticipantsUpdate(m.from, [user], "add");

        if (res[0].status === "200") {
          success.push(user.split("@")[0]);
        } else {
          failed.push(user.split("@")[0]);

          // 📩 Send invite message if privacy ON
          try {
            let inviteMsg = `🌸 Hello there!  

✨ *You’ve been invited to join our awesome WhatsApp group!*  

👥 A friendly and active community  
🎉 Fun chats, updates & cool people  
💬 No spam — just good vibes  

💌 *Invited by:* ${pushName}  

🔗 *Join here:*  
${inviteLink}  

Hope to see you inside 😊`;

            await Miku.sendMessage(user, { text: inviteMsg });
          } catch (e) {
            // ignore DM fail
          }
        }

      } catch (e) {
        failed.push(user.split("@")[0]);
      }

      // 🧠 ULTRA SAFE RANDOM DELAY (8–15 sec)
      let randomDelay = 8000 + Math.floor(Math.random() * 7000);
      await delay(randomDelay);
    }

    let result = `➕ *Add Process Completed*\n\n`;

    if (success.length > 0)
      result += `✅ Added Successfully:\n${success.map(n => "• " + n).join("\n")}\n\n`;

    if (failed.length > 0)
      result += `📩 Invite Sent (Privacy ON / Failed):\n${failed.map(n => "• " + n).join("\n")}\n\n`;

    result += `🛡️ Ultra Safe Mode Enabled\n⏳ Slow adding used to reduce ban risk`;

    Miku.sendMessage(m.from, { text: result }, { quoted: m });

  }
};
