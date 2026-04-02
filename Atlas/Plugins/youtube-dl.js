import YT from "../System/Ytdl-Core.js";
import axios from "axios";
import yts from "youtube-yts";

let mergedCommands = ["play", "song", "video", "ytmp4", "music", "audio", "mp3"];

export default {
  name: "mediaDownloader",
  alias: [...mergedCommands],
  uniquecommands: ["play", "song", "video"],
  description: "YouTube Audio and Video Downloader",

  start: async (Atlas, m, { inputCMD, text, doReact, prefix }) => {
    const query = text.trim();
    const botName = global.botName || "Marin MD";

    if (!query) {
      await doReact("❌");
      return m.reply(
        `Please provide a song name or link!\n\nExample: *${prefix}${inputCMD} despacito*`
      );
    }

    switch (inputCMD) {

      // 🔥 AUDIO SECTION
      case "play":
      case "song":
      case "music":
      case "audio":
      case "mp3":
        await doReact("📥");
        try {
          const search = await yts(query);
          if (!search.videos.length)
            return m.reply("❌ No results found.");

          const video = search.videos[0];

          await Atlas.sendMessage(
            m.from,
            {
              image: { url: video.thumbnail },
              caption: `\n🎶 *${video.title}*

_🕛 Duration:_ *${video.timestamp}*
_🎀 Channel:_ *${video.author.name}*
_🏮 Uploaded:_ *${video.ago}*

⏳ *Downloading Audio...*`,
            },
            { quoted: m }
          );

          const audioData = await YT.downloadWithRetry(video.url, "mp3");

          let thumbnailBuffer;
          if (inputCMD === "play") {
            try {
              const img = await axios.get(video.thumbnail, {
                responseType: "arraybuffer",
              });
              thumbnailBuffer = Buffer.from(img.data);
            } catch {}
          }

          await Atlas.sendMessage(
            m.from,
            {
              audio: { url: audioData.downloadUrl },
              mimetype: "audio/mpeg",
              fileName: `${video.title}.mp3`,
              ptt: false,
              contextInfo: inputCMD === "play"
                ? {
                    externalAdReply: {
                      title: video.title,
                      body: `Downloaded by ${botName}`,
                      thumbnail: thumbnailBuffer,
                      mediaType: 2,
                      sourceUrl: video.url,
                    },
                  }
                : {},
            },
            { quoted: m }
          );

          await doReact("✅");

        } catch (err) {
          console.error(err);
          m.reply(`❌ Audio download failed!\nReason: ${err.message}`);
        }
        break;


      // 🔥 VIDEO SECTION
      case "video":
      case "ytmp4":
      case "ytvideo":
      case "ytdl":
        await doReact("🎥");
        try {
          const search = await yts(query);
          if (!search.videos.length)
            return m.reply("❌ No videos found!");

          const video = search.videos[0];

          await Atlas.sendMessage(
            m.from,
            {
              image: { url: video.thumbnail },
              caption: `\n🎬 *${video.title}*

_🕛 Duration:_ *${video.timestamp}*
_🎀 Channel:_ *${video.author.name}*
_🏮 Uploaded:_ *${video.ago}*

⏳ *Downloading Video...*`,
            },
            { quoted: m }
          );

          // 🎥 Download video (360p)
          const videoData = await YT.downloadWithRetry(video.url, "360");

          await Atlas.sendMessage(
            m.from,
            {
              video: { url: videoData.downloadUrl },
              mimetype: "video/mp4",
              caption: `🎬 *${video.title}*

_🕛 Duration:_ *${video.timestamp}*
_🎀 Channel:_ *${video.author.name}*

> *_Downloaded by ${botName}_*`,
            },
            { quoted: m }
          );

          await doReact("✅");

        } catch (err) {
          console.error(err);
          m.reply(`❌ Video download failed!\nReason: ${err.message}`);
        }
        break;
    }
  },
};