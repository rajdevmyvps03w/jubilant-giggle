const os = require("os");

module.exports = {
  name: "ping",
  alias: ["pong", "pong","uptime","alive"],
  desc: "Shows accurate bot ping and system info",
  category: "Core",
  usage: "Bot Heartbeat Check",
  react: "🍁",

  start: async (Miku, m, { prefix, pushName }) => {
    try {
      const botName = typeof global.botName !== "undefined" ? global.botName : "Magical Waifu";
      const botVideo = typeof global.botVideo !== "undefined" ? global.botVideo : null;

      // ⏱️ Start time
      const startTime = Date.now();

      // Send quick msg
      const sentMsg = await Miku.sendMessage(
        m.from,
        { text: "🐾 Nyaa~ Checking real heartbeat... ⏳" },
        { quoted: m }
      );

      // ⏱️ End time
      const endTime = Date.now();
      const ping = endTime - startTime; // ✅ REAL PING

      // Bot uptime
      const uptimeSeconds = Math.floor(process.uptime());
      const upHours = Math.floor((uptimeSeconds % 86400) / 3600);
      const upMinutes = Math.floor((uptimeSeconds % 3600) / 60);
      const upSeconds = uptimeSeconds % 60;
      const shortUptime = `${upHours}h ${upMinutes}m ${upSeconds}s`;

      // System uptime
      const sysUptimeSeconds = Math.floor(os.uptime());
      const sysHours = Math.floor((sysUptimeSeconds % 86400) / 3600);
      const sysMinutes = Math.floor((sysUptimeSeconds % 3600) / 60);
      const sysSeconds = sysUptimeSeconds % 60;
      const systemUptimeHuman = `${sysHours}h ${sysMinutes}m ${sysSeconds}s`;

      // System Info
      const platform = os.platform();
      const cpuModel = os.cpus()[0]?.model || "Unknown CPU";
      const freeMemMB = Math.round(os.freemem() / 1024 / 1024);
      const totalMemMB = Math.round(os.totalmem() / 1024 / 1024);

      // Caption
      const caption = `
✨ *${botName} Real Ping Report* ✨

👋 Hello *${pushName}*

⚡ *Ping:* \`${ping} ms\`
🕒 *Uptime:* ${shortUptime}
💤 *System Uptime:* ${systemUptimeHuman}
💾 *Memory:* ${freeMemMB}MB / ${totalMemMB}MB
💻 *Platform:* ${platform}
🎀 *CPU:* ${cpuModel}

💖 Always fast for you~
`.trim();

      const buttons = [
        {
          buttonId: `${prefix}help`,
          buttonText: { displayText: "🕯️ Help" },
          type: 1,
        },
        {
          buttonId: `${prefix}owner`,
          buttonText: { displayText: "🎀 Owner" },
          type: 1,
        },
      ];

      const pingMessage = {
        caption,
        footer: `✨ Powered by ${botName}`,
        buttons,
        headerType: botVideo ? 4 : 1,
      };

      if (botVideo) {
        pingMessage.video = botVideo;
        pingMessage.gifPlayback = true;
      }

      // ✅ Edit-like behavior (send new message)
      await Miku.sendMessage(m.from, pingMessage, { quoted: m });

    } catch (err) {
      console.error("Ping error:", err);
      await Miku.sendMessage(
        m.from,
        { text: `⚠️ Error while checking ping.` },
        { quoted: m }
      );
    }
  },
};