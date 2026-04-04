const axios = require("axios");

module.exports = {
  name: "igdl",
  alias: ["instagram", "instadl", "instagramdl", "ig", "insta"],
  desc: "To download an Instagram video or image (Powered by Marin-MD API) 🧣🥰",
  category: "Media",
  usage: `igdl <video|image link>`,
  react: "🍁",
  start: async (Miku, m, { text, prefix, args }) => {

    // 💡 Cute tip if no link provided
    if (!args[0])
      return Miku.sendMessage(
        m.from,
        { text: `Oops! You forgot to provide a link!\nUsage: ${prefix}igdl <Instagram Video/Image link>` },
        { quoted: m }
      );

    // ❌ Invalid link message with cute words
    if (!args[0].match(/(instagram\.com|instg\.am)/gi))
      return Miku.sendMessage(
        m.from,
        { text: `⚠️ Hmm... That doesn't look like a valid Instagram link, cutie! 😅` },
        { quoted: m }
      );

    // Link Cleaning
    let InstaLink = args[0];
    if (InstaLink.includes("?")) InstaLink = InstaLink.split("?")[0];

    // ⏳ Loading Message
    await Miku.sendMessage(
      m.from,
      { text: `⏳ Hold on Senpai I'm fetching your Instagram media... 💖` },
      { quoted: m }
    );

    try {
        // 🔥 Using Your Working Private Server
        const apiUrl = `https://media.cypherxbot.space/download/instagram/video?url=${encodeURIComponent(InstaLink)}`;
        const { data } = await axios.get(apiUrl, { timeout: 30000 });

        if (!data || !data.success || !data.result?.download_url) {
            return Miku.sendMessage(
                m.from,
                { text: `❌ Oops! Could not fetch media. Maybe it's private or the link is wrong 😢` },
                { quoted: m }
            );
        }

        const { download_url, title } = data.result;
        const botName = Miku.user?.name || "Marin-MD";

        // VIDEO MESSAGE 🎬
        // (Aapka output structure same rakha hai)
        await Miku.sendMessage(
            m.from,
            {
                video: { url: download_url },
                caption: `🎬 Yay! Your video has been downloaded by *${botName}* 💖\n\n📝 *Title:* ${title || "Instagram Post"}\n\nTip: You can save it or share with friends! ✨`
            },
            { quoted: m }
        );

    } catch (error) {
        console.error("IG Error:", error);
        Miku.sendMessage(
            m.from, 
            { text: `❌ Server Error! My systems are overwhelmed. Try again later! 🧣` }, 
            { quoted: m }
        );
    }
  }
};