import { Tiktok } from "../System/Tiktokscraper.js";

let mergedCommands = [
  "tiktok",
  "tt",
  "tiktokdl",
  "tiktokmp3",
  "ttmp3",
  "tiktokmp4",
  "ttmp4",
  "tiktokdoc",
];

export default {
  name: "tiktokDl",
  alias: [...mergedCommands],
  uniquecommands: ["tiktok", "tiktokmp3", "tiktokmp4"],
  description: "Advanced TikTok Downloader",

  start: async (
    Atlas,
    m,
    { inputCMD, text, prefix, doReact }
  ) => {

    if (!text) {
      await doReact("❌");
      return m.reply(`🎵 *TikTok Downloader*

📌 Usage:
• ${prefix}tiktok <link>
• ${prefix}tiktokmp3 <link>
• ${prefix}tiktokmp4 <link>`);
    }

    if (!text.includes("tiktok")) {
      await doReact("❌");
      return m.reply("❌ Please provide a valid TikTok link!");
    }

    try {

      // ================= MAIN MENU =================
      if (inputCMD === "tiktok" || inputCMD === "tt" || inputCMD === "tiktokdl") {
        await doReact("🎵");

        const data = await Tiktok(text);

        let caption = `🎵 *TikTok Downloader*

👤 *Author:* ${data.author}
📝 *Title:* ${data.title}

📌 *Select Format:*
• ${prefix}tiktokmp4 ${text}
• ${prefix}tiktokmp3 ${text}
`;

        return Atlas.sendMessage(m.from, {
          image: { url: data.thumbnail },
          caption
        }, { quoted: m });
      }

      // ================= MP4 =================
      if (inputCMD === "tiktokmp4" || inputCMD === "ttmp4") {
        await doReact("🎥");

        const data = await Tiktok(text);

        await Atlas.sendMessage(m.from, {
          video: { url: data.nowm }, // 🔥 no watermark
          mimetype: "video/mp4",
          caption: `🎬 *TikTok Video*

👤 ${data.author}
📝 ${data.title}

> ${global.botName || "ATLAS"}`
        }, { quoted: m });

        await doReact("✅");
        return;
      }

      // ================= MP3 =================
      if (inputCMD === "tiktokmp3" || inputCMD === "ttmp3") {
        await doReact("🎶");

        const data = await Tiktok(text);

        await Atlas.sendMessage(m.from, {
          audio: { url: data.audio },
          mimetype: "audio/mpeg",
          contextInfo: {
            externalAdReply: {
              title: data.title,
              body: data.author,
              thumbnailUrl: data.thumbnail,
              mediaType: 2,
              renderLargerThumbnail: true
            }
          }
        }, { quoted: m });

        await doReact("✅");
        return;
      }

      // ================= DOCUMENT =================
      if (inputCMD === "tiktokdoc") {
        await doReact("📄");

        const data = await Tiktok(text);

        await Atlas.sendMessage(m.from, {
          document: { url: data.audio },
          mimetype: "audio/mpeg",
          fileName: `${data.title}.mp3`,
          caption: `📄 TikTok Audio Document`
        }, { quoted: m });

        await doReact("✅");
        return;
      }

    } catch (e) {
      console.error(e);
      await doReact("❌");
      m.reply(`❌ Error: ${e.message}`);
    }
  },
};