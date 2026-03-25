const fs = require("fs");
const path = require("path");
const YT = require("../../lib/ytdl-core.js");

module.exports = {
  name: "ytvdl",
  alias: [],
  desc: "Download a YouTube video in selected quality",
  category: "Media",
  usage: `ytvdl <480|720|1080> <youtube url>`,
  react: "🍁",

  start: async (Miku, m, { args, prefix }) => {

    // 🔎 Validation
    if (!args[0] || !args[1]) {
      return Miku.sendMessage(
        m.from,
        {
          text:
            `❗ *Invalid usage!*\n\n` +
            `📌 *Correct format:*\n` +
            `👉 ${prefix}ytvdl <480|720|1080> <YouTube URL>\n\n` +
            `✨ Example:\n` +
            `👉 ${prefix}ytvdl 720 https://youtu.be/xxxxx`
        },
        { quoted: m }
      );
    }

    const quality = parseInt(args[0], 10);
    const url = args.slice(1).join(" ");

    if (![480, 720, 1080].includes(quality)) {
      return Miku.sendMessage(
        m.from,
        { text: "⚠️ *Quality must be 480, 720, or 1080 only!*" },
        { quoted: m }
      );
    }

    try {
      // ⏳ Inform user
      await Miku.sendMessage(
        m.from,
        { text: "📥 *Downloading video...*\nPlease wait a moment ✨" },
        { quoted: m }
      );

      // 📥 Download video
      const { path: filePath, meta, size } = await YT.downloadMp4(url, quality);

      // 📏 Calculate File Size in MB
      const fileSizeInMB = size / (1024 * 1024);
      const captionText = `🍁 *Title:* ${meta.title}\n🏮 *Quality:* ${meta.quality}p\n📦 *Size:* ${fileSizeInMB.toFixed(2)} MB\n\n💖 Enjoy your video!`;

      // 📤 Sending Logic (Smart Switch)
      if (fileSizeInMB > 64) {
        // --- 📄 SEND AS DOCUMENT (If > 64MB) ---
        await Miku.sendMessage(
          m.from,
          {
            document: fs.readFileSync(filePath),
            mimetype: "video/mp4",
            fileName: `${meta.title}.mp4`,
            caption: captionText + `\n\n_Note: Sent as Document because size is > 64MB_`,
          },
          { quoted: m }
        );
      } else {
        // --- 🎥 SEND AS NORMAL VIDEO (If < 64MB) ---
        await Miku.sendMessage(
          m.from,
          {
            video: fs.readFileSync(filePath),
            mimetype: "video/mp4",
            caption: captionText,
          },
          { quoted: m }
        );
      }

      // 🧹 Cleanup
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    } catch (e) {
      console.error(e);
      await Miku.sendMessage(
        m.from,
        {
          text:
            `❌ *Download failed!*\n\n` +
            `📌 Reason: ${e.message}\n\n` +
            `💡 *Tip:* Try a lower quality like *480p* or check the link.`,
        },
        { quoted: m }
      );
    }
  }
};