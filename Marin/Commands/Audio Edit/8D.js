const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const { getRandom } = require("../../lib/myfunc");

module.exports = {
  name: "8d",
  alias: ["8deffect", "surround"],
  desc: "🎧 Convert normal audio into 8D Surround Sound",
  category: "Audio Edit",
  usage: "8d <reply to audio>",
  react: "🍁",

  start: async (Miku, m, { quoted, mime, pushName, prefix }) => {
    try {
      // ✅ Check if replied to audio
     if (!quoted || !/audio/.test(mime)) {
        return m.reply(
          `🎶 Hey *${pushName}-chan*!  
Reply to an *audio file* to apply the *8D Surround Sound Effect* 🎧  

💡 Example: *${prefix}8d* (reply to an audio)`
        );
      }

      // ✅ Download input audio
      let media = await Miku.downloadAndSaveMediaMessage(quoted);
      if (!media || !fs.existsSync(media)) {
        return m.reply("❌ Couldn't download the audio file 😿 Try again~");
      }

      let ran = getRandom(".mp3");
      let outputPath = path.resolve(ran);

      // 🎚️ FFmpeg 8D filter (stereo rotation effect)
      let set = `-af "apulsator=hz=0.125"`; // sound moves around headphones

      await m.reply(
        `⏳ Applying *8D Surround Effect* for you, ${pushName}-chan 🎶  
Please wait... 🔄`
      );

      // ✅ Run ffmpeg
      exec(`ffmpeg -y -i "${media}" ${set} "${outputPath}"`, async (err) => {
        if (fs.existsSync(media)) fs.unlinkSync(media);

        if (err) {
          console.error(err);
          return m.reply("❌ Oops! Error while applying 8D effect 😭");
        }

        try {
          let buff = fs.readFileSync(outputPath);
          await Miku.sendMessage(
            m.from,
            { audio: buff, mimetype: "audio/mpeg" },
            { quoted: m }
          );

          await m.reply(
            `✅ Done~ Here’s your *8D Surround Audio* *${pushName}-chan* 🎧✨  

 Effect applied: *Rotating surround sound (best with headphones)*  
💡 Try it and feel the audio moving around your head 🔊`
          );
        } catch (e) {
          console.error(e);
          m.reply("❌ Failed to send audio 😿");
        } finally {
          if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        }
      });
    } catch (e) {
      console.error(e);
      m.reply("⚠️ Please reply with a valid audio file nya~ 🎵");
    }
  },
};