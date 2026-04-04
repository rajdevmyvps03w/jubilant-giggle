const axios = require("axios");

module.exports = {
  name: "wallpaper",
  alias: ["wallpaper"],
  desc: "Search 4K Wallpapers (With Buttons)",
  category: "Weeb",
  usage: "wallpaper <query>",
  react: "🍁",

  start: async (Miku, m, { text, prefix }) => {

    if (!text) {
      return m.reply(
        `⚠️ What kind of wallpaper do you want?\nExample: *${prefix}wallpaper Naruto*`
      );
    }

    try {
      // 2. Call the external Wallpaper API (Bing Bypass API hosted on Vercel)
      const apiUrl = `https://stenx-apis.vercel.app/api/wallpaper?query=${text}`;
      const { data } = await axios.get(apiUrl);

      // If API returns false status
      if (!data.status) {
        return m.reply("❌ No wallpaper found.");
      }

      const result = data.result;

      // 3. Button Configuration
      // Button ID is same command so user can fetch next image easily
      const buttons = [
        {
          buttonId: `${prefix}wallpaper ${text}`,
          buttonText: { displayText: '🔄 Next Image' },
          type: 1
        }
      ];

      // 4. Message object with image + button
      const buttonMessage = {
        image: { url: result.image },
        caption: ` *${result.title}*\n\n🔗 *Image URL:* ${result.image}`,
        footer: `*${botName}*`,
        buttons: buttons,
        headerType: 4
      };

      // 5. Send wallpaper with interactive button
      await Miku.sendMessage(m.from, buttonMessage, { quoted: m });

    } catch (error) {
      console.error("Wallpaper Error:", error);
      m.reply("❌ Error while fetching wallpaper.");
    }
  }
};
