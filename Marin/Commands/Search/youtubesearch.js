const yts = require("yt-search");

module.exports = {
  name: "youtubesearch",
  alias: ["ytsearch", "youtube", "yts"],
  desc: "Search for videos on YouTube ",
  category: "Search",
  usage: `yts <query>`,
  react: "🍁",
  start: async (Miku, m, { text, prefix, args }) => {

    // 1. Check if user provided a query
    if (!args[0]) {
      return Miku.sendMessage(
        m.from,
        { text: `Kya search karna hai senpai? 🤔\nUsage: *${prefix}yts Linkin Park Numb*` },
        { quoted: m }
      );
    }

    // 2. Search Query
    const query = args.join(" ");
    await Miku.sendMessage(m.from, { react: { text: '⏳', key: m.key } });

    try {
        // 3. Perform Search using yt-search
        const searchResult = await yts(query);
        const videos = searchResult.videos.slice(0, 10); // Top 10 results

        if (!videos || videos.length === 0) {
            return Miku.sendMessage(m.from, { text: `❌ No results found for "${query}"` }, { quoted: m });
        }

        // 4. Format the Output List
        let outputText = `🎬 *YouTube Search Results for:* "${query}"\n\n`;

        videos.forEach((v, index) => {
            outputText += `*${index + 1}. ${v.title}*\n`;
            outputText += `⏱️ Duration: ${v.timestamp} | 👀 Views: ${v.views}\n`;
            outputText += `👤 Author: ${v.author.name}\n`;
            outputText += `🔗 Link: ${v.url}\n\n`;
        });

        outputText += `🧣 *Powered by ${botName}*`;

        // 5. Send Message (Image of 1st result + List)
        // Hum pehle result ka thumbnail bhejenge list ke saath
        await Miku.sendMessage(
            m.from,
            {
                image: { url: videos[0].thumbnail },
                caption: outputText
            },
            { quoted: m }
        );

        await Miku.sendMessage(m.from, { react: { text: '✅', key: m.key } });

    } catch (error) {
        console.error("YTS Error:", error);
        await Miku.sendMessage(
            m.from,
            { text: `❌ Search failed due to an error. Please try again!` },
            { quoted: m }
        );
    }
  }
};