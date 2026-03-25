const Groq = require("groq-sdk");
const groq = new Groq({ apiKey: "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" });

module.exports = {
  name: "roastme",
  alias: ["roast", "insultme"],
  desc: "Let AI roast you 🔥",
  category: "Fun",
  usage: "roastme",
  react: "😈",

  start: async (Miku, m, { pushName }) => {
    await Miku.sendMessage(m.from, { text: `😏 Charging up roast lasers for ${pushName}-chan... 🔥` }, { quoted: m });

    try {
      const chat = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content:
              "I'm An AI That's Roast users playfully using humor, without being mean.",
          },
          { role: "user", content: `Roast ${pushName} in 2-3 funny lines.` },
        ],
      });

      const roast = chat.choices[0].message.content;

      await Miku.sendMessage(
        m.from,
        {
          text: `*🔥『 ${botName} Roast Engine 』*\n\n${roast}\n\n🤣 *Created by Sten-X*`,
          footer: `Powered by *© ${botName}*`,
        },
        { quoted: m }
      );
    } catch (err) {
      await Miku.sendMessage(m.from, { text: `⚠️ Error: ${err.message}` }, { quoted: m });
    }
  },
};