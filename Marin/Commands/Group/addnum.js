const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

module.exports = {
  name: "add",
  alias: ["addnum", "invite"],
  desc: "Add members with Smart Number Detection (Remote/Local) 🛡️",
  category: "Group",
  usage: `add <numbers> OR add JID | <numbers>`,
  react: "📥",
  isBotAdmin: true,
  isAdmin: true,

  start: async (Miku, m, { text, prefix }) => {
    if (!text) return m.reply(`*❌ Usage:*\n\n*Group:* ${prefix}add 918434...\n*DM:* ${prefix}add JID | 918434...`);

    let targetGroup = m.from;
    let rawNumbersText = text;

    // 🌐 Remote DM System Check
    if (text.includes("|")) {
      const parts = text.split("|");
      targetGroup = parts[0].trim();
      rawNumbersText = parts.slice(1).join("|");
    }

    // 🔍 SMART DETECTION LOGIC
    // 1. Pehle pure text ko commas, newlines aur spaces se tod do
    const segments = rawNumbersText.split(/[,|\n]/);
    
    // 2. Har segment se sirf numbers nikalo aur validate karo (10-15 digits)
    const cleanedNumbers = segments
      .map(v => v.replace(/[^0-9]/g, "")) // Sirf numbers rakho, +, -, ( ) sab uda do
      .filter(v => v.length >= 10 && v.length <= 15); // Valid length filter

    if (!cleanedNumbers || cleanedNumbers.length === 0) {
      return m.reply("❌ No valid numbers detected! Please check the format.");
    }

    try {
      const groupMetadata = await Miku.groupMetadata(targetGroup);
      const groupName = groupMetadata.subject;

      await m.reply(`✅ *Detected ${cleanedNumbers.length} numbers!*\n⏳ Starting process for *${groupName}*... 🛡️`);

      let inviteLink = "";
      try {
        const code = await Miku.groupInviteCode(targetGroup);
        inviteLink = `https://chat.whatsapp.com/${code}`;
      } catch {
        inviteLink = "(Link not available)";
      }

      let success = 0;
      let privacyCount = 0;
      let failed = 0;

      for (let num of cleanedNumbers) {
        try {
          const jid = `${num}@s.whatsapp.net`;
          const response = await Miku.groupParticipantsUpdate(targetGroup, [jid], "add");
          const status = response[0]?.status;

          if (status === "403") {
            privacyCount++;
            const inviteMsg = `*🎀 Hello Senpai! 🎀*\n\nI tried adding you to *${groupName}*, but your privacy settings restricted me. 🥺\n🔗 *Join:* ${inviteLink}`;
            await Miku.sendMessage(jid, { text: inviteMsg });
          } else if (status === "200") {
            success++;
          } else {
            failed++;
          }

          // 🛡️ ANTI-BAN DELAY (5-8 seconds randomized)
          // VPS fast hai isliye delay zaroori hai
          await sleep(Math.floor(Math.random() * 3000) + 5000);

        } catch (err) {
          failed++;
          await sleep(2000);
        }
      }

      await m.reply(`✅ *Batch Process Completed!*\n\n🟢 Added: ${success}\n🔒 Privacy DM: ${privacyCount}\n❌ Failed/Skipped: ${failed}`);

    } catch (err) {
      return m.reply("❌ Error: Group JID not found or Bot is not admin!");
    }
  }
};
