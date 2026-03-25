const fs = require("fs");
const yts = require("yt-search");

module.exports = {
  name: "play",
  alias: ["play"],
  desc: "Play a song from YouTube directly",
  category: "Media",
  usage: `play <song name>`,
  react: "🍁",

  start: async (Miku, m, { args, text, prefix, pushName }) => {
    if (!args[0]) {
      return Miku.sendMessage(
        m.from,
        {
          text: `Konichiwa *${pushName}-chan*! Please tell me a song name nya 💖  
Example: * ${prefix} play Suzume no Tojimari『Suzume』Theme Song* 🎶`,
        },
        { quoted: m }
      );
    }

    try {
      // 🔎 YouTube search
      const searchTerm = args.join(" ");
      const search = await yts(searchTerm);

      if (!search.videos || search.videos.length === 0) {
        return Miku.sendMessage(
          m.from,
          {
            text: `❌ Gomenasai *${pushName}-chan*… I couldn’t find anything for *${searchTerm}* 😭  
Try using different keywords nya~ ✨`,
          },
          { quoted: m }
        );
      }

      const song = search.videos[0]; // ✅ Moved before usage

      let desc = song.description ? song.description.split("\n")[0] : "No description available nya~";


      let buttons = [
        {
          buttonId: `${prefix}ytad ${song.url}`,
          buttonText: { displayText: " Play Audio" },
          type: 1,
        },
        {
          buttonId: `${prefix}ytvd ${song.url}`,
          buttonText: { displayText: " Play Video" },
          type: 1,
        },
      ];

      let buttonMessage = {
        image: { url: song.thumbnail },
        caption: `
*『 ${botName} Media Player 』*

✨ *Song:* ${song.title}  
🕒 *Duration:* ${song.timestamp}  
📺 *Channel:* ${song.author?.name || "Unknown"}  
👀 *Views:* ${song.views.toLocaleString()}  
📅 *Uploaded:* ${song.ago}  
📂 *Category:* ${song.type || "Music"}  
📝 *Description:* ${desc}  

🔗 *Watch it here:* ${song.url}`,
        
        footer: `Powered by *© ${botName}*`,
        buttons: buttons,
        headerType: 4,
      };

      // ✅ Send button message
      await Miku.sendMessage(m.from, buttonMessage, { quoted: m });

    
        { quoted: m }
        
    } catch (err) {
      console.error("❌ Error in play command:", err);
      await Miku.sendMessage(
        m.from,
        {
          text: `⚠️ Sorry *${pushName}-chan*, something went wrong while fetching the song 😢  
Please try again later or use a different song title.`,
        },
        { quoted: m }
      );
    }
  },
};