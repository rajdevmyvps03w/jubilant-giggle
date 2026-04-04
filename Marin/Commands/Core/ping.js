const os = require("os");

module.exports = {
  name: "ping",
  alias: ["pong", "uptime", "alive"],
  desc: "Shows accurate bot ping and system info",
  category: "Core",
  usage: "Bot Heartbeat Check",
  react: "🍁",

  start: async (Miku, m, { prefix, pushName }) => {
    try {
      // 🔴 MOST IMPORTANT (loop stop)
      if (m.key.fromMe) return;

      const botName =
        typeof global.botName !== "undefined"
          ? global.botName
          : "Magical Waifu";

      // ⏱️ Start time
      const startTime = Date.now();

      // 📤 Send temporary message
      const tempMsg = await Miku.sendMessage(
        m.from,
        { text: "🐾 Nyaa~ Checking heartbeat..." },
        { quoted: m }
      );

      // ⏱️ Calculate ping
      const ping = Date.now() - startTime;

      // 🕒 Bot uptime
      const uptime = process.uptime();
      const upH = Math.floor(uptime / 3600);
      const upM = Math.floor((uptime % 3600) / 60);
      const upS = Math.floor(uptime % 60);

      // 💤 System uptime
      const sysUp = os.uptime();
      const sysH = Math.floor(sysUp / 3600);
      const sysM = Math.floor((sysUp % 3600) / 60);
      const sysS = Math.floor(sysUp % 60);

      // 💻 System info
      const platform = os.platform();
      const cpu = os.cpus()[0]?.model || "Unknown";
      const freeMem = Math.round(os.freemem() / 1024 / 1024);
      const totalMem = Math.round(os.totalmem() / 1024 / 1024);

      // ✨ Final message
      const text = `
✨ *${botName} Ping Report*

👋 Hello *${pushName}*

⚡ *Ping:* \`${ping} ms\`

🕒 *Uptime:* ${upH}h ${upM}m ${upS}s
💤 *System:* ${sysH}h ${sysM}m ${sysS}s

💾 *Memory:* ${freeMem}MB / ${totalMem}MB

💻 *Platform:* ${platform}

🎀 *CPU:* ${cpu}

💖 Always fast for you~
✨ Powered by ${botName}
`.trim();

      // 📤 Send final message
      await Miku.sendMessage(m.from, { text }, { quoted: tempMsg });

    } catch (err) {
      console.error("Ping Error:", err);
      await Miku.sendMessage(
        m.from,
        { text: "⚠️ Error while checking ping." },
        { quoted: m }
      );
    }
  },
};