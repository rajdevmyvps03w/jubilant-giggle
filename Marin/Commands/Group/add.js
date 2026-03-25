const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

module.exports = {
  name: "add",
  alias: ["addnum", "invite"],
  desc: "Add multiple members with Anti-Ban Logic 🛡️",
  category: "Group",
  usage: `add <numbers>`,
  react: "📥",
  isGroup: true,
  isBotAdmin: true,
  isAdmin: true,

  start: async (Miku, m, { text, prefix }) => {
    if (!text) return m.reply(`Usage: ${prefix}add 91...`);

    const inputNumbers = text.split(/[,|\n|\s]/); 
    const cleanedNumbers = inputNumbers.map(v => v.replace(/[^0-9]/g, "")).filter(v => v.length >= 10);

    if (cleanedNumbers.length === 0) return m.reply("❌ No valid numbers found!");

    await m.reply(`⏳ Processing *${cleanedNumbers.length}* numbers. I will add them slowly to keep your number safe! 🛡️`);

    const groupMetadata = await Miku.groupMetadata(m.from);
    const groupName = groupMetadata.subject;
    
    let inviteLink = "";
    try {
        const code = await Miku.groupInviteCode(m.from);
        inviteLink = `https://chat.whatsapp.com/${code}`;
    } catch {
        inviteLink = "(Invite link not available)";
    }

    let success = 0;
    let privacyCount = 0;
    let failed = 0;

    for (let num of cleanedNumbers) {
      try {
        const jid = `${num}@s.whatsapp.net`;
        
        // 🚀 Adding Participant
        const response = await Miku.groupParticipantsUpdate(m.from, [jid], "add");

        // 🔍 Status Analysis
        const status = response[0]?.status;

        if (status === "403") {
          privacyCount++;
          const inviteMsg = `*🎀 Hello Senpai! 🎀*\n\nI tried adding you to *${groupName}*, but your privacy settings restricted me. 🥺\n\n🔗 *Join here:* ${inviteLink}`;
          await Miku.sendMessage(jid, { text: inviteMsg });
        } else if (status === "200") {
          success++;
        } else {
          failed++;
        }

        // 🛡️ ANTI-BAN DELAY (Increased to 5-7 seconds)
        // Aapka VPS fast hai, isliye humein bot ko slow karna padega
        const randomDelay = Math.floor(Math.random() * (7000 - 5000 + 1)) + 5000;
        await sleep(randomDelay); 

      } catch (err) {
        console.log(`Failed for ${num}:`, err.message);
        failed++;
        await sleep(2000); // Error ke baad thoda break
      }
    }

    await m.reply(`✅ *Batch Process Completed!*\n\n🟢 Added: ${success}\n🔒 Privacy DM: ${privacyCount}\n❌ Failed/Skipped: ${failed}\n\n_Safety delay was applied to prevent ban!_ 🛡️`);
  }
};
