import { Tiktok } from "../System/Tiktokscraper.js";

let mergedCommands = [
  "tiktok",
  "tiktokdl",
  "tiktokmp3",
  "tiktokmp4",
  "tiktokdoc",
];

export default {
  name: "tiktokDl",
  alias: [...mergedCommands],
  uniquecommands: ["tiktok", "tiktokmp3", "tiktokmp4", "tiktokdoc"],
  description: "All Tiktok Downloader Commands",
  start: async (
    Atlas,
    m,
    {
      inputCMD,
      text,
      prefix,
      doReact,
      args,
    }
  ) => {
    if (!text) {
      await doReact("❌");
      return m.reply(
        `Please provide a Tiktok video link !\n\nExample: ${prefix}tiktok <link>`
      );
    }
    if (!text.includes("tiktok")) {
      await doReact("❌");
      return m.reply("Please provide a valid Tiktok link!");
    }

    switch (inputCMD) {
      case "tiktok":
      case "tiktokdl": {
        await doReact("📥");
        const txtmain = `
          *『 Tiktok Downloader 』*

*🧩 Video Url :* _${text}_\n\n
*📌 Select the format*
*${prefix}tiktokmp3 <link>*
*${prefix}tiktokmp4 <link>*
*${prefix}tiktokdoc <link>*`;

        Atlas.sendMessage(
          m.from,
          { image: { url: botImage1 }, caption: txtmain },
          { quoted: m }
        );
        break;
      }

      case "tiktokmp3": {
        await doReact("📥");
        try {
          const data = await Tiktok(args[0]);
          Atlas.sendMessage(
            m.from,
            { audio: { url: data.audio }, mimetype: "audio/mpeg" },
            { quoted: m }
          );
        } catch (e) {
          await doReact("❌");
          m.reply(`Failed to download TikTok audio: ${e.message}`);
        }
        break;
      }

      case "tiktokmp4": {
        await doReact("📥");
        try {
          const data = await Tiktok(args[0]);
          Atlas.sendMessage(
            m.from,
            {
              video: { url: data.watermark },
              caption: `Downloaded by: *${botName}*`,
            },
            { quoted: m }
          );
        } catch (e) {
          await doReact("❌");
          m.reply(`Failed to download TikTok video: ${e.message}`);
        }
        break;
      }

      case "tiktokdoc": {
        await doReact("📥");
        try {
          const data = await Tiktok(args[0]);
          Atlas.sendMessage(
            m.from,
            {
              document: { url: data.audio },
              mimetype: "audio/mpeg",
              fileName: `Downloaded by ${botName}.mp3`,
            },
            { quoted: m }
          );
        } catch (e) {
          await doReact("❌");
          m.reply(`Failed to download TikTok document: ${e.message}`);
        }
        break;
      }

      default:
        break;
    }
  },
};
