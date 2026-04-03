import { setNSFW, delNSFW } from "../System/MongoDB/MongoDb_Core.js";

export default {
  name: "nsfw",
  alias: [],
  description: "Enable/Disable NSFW",

  start: async (Atlas, m, { text, isAdmin, isBotAdmin }) => {
    if (!m.isGroup) return m.reply("Group only ❌");
    if (!isAdmin) return m.reply("Admin only ❌");
    if (!isBotAdmin) return m.reply("Bot must be admin ❌");

    if (!text) return m.reply("Use: nsfw on/off");

    if (text === "on") {
      await setNSFW(m.from);
      return m.reply("NSFW Enabled 🔥");
    }

    if (text === "off") {
      await delNSFW(m.from);
      return m.reply("NSFW Disabled ❌");
    }
  },
};