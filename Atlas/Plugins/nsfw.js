import axios from "axios";
import {
  checkNSFW,
  setNSFW,
  delNSFW
} from "../System/MongoDB/MongoDb_Core.js";

const NSFW_COMMANDS = {
  animal: "animal",
  animalears: "animalears",
  anusview: "anusview",
  ass: "ass",
  barefoot: "barefoot",
  bed: "bed",
  bell: "bell",
  bikini: "bikini",
  blonde: "blonde",
  bondage: "bondage",
  bra: "bra",
  breasthold: "breasthold",
  breasts: "breasts",
  bunnygirl: "bunnygirl",
  bunnyears: "bunnyears",
  chain: "chain",
  closeview: "closeview",
  cloudsview: "cloudseview",
  cum: "cum",
  dress: "dress",
  elbowgloves: "elbowgloves",
  erectnipples: "erectnipples",
  fateseries: "fateserie",
  fingering: "fingering",
  flatchest: "flatchest",
  food: "food",
  nsfwfoxgirl: "nsfwfoxgirl",
  gamecg: "gamecg",
  genshin: "genshin",
  glasses: "glasses",
  gloves: "gloves",
  greenhair: "greenhair",
  hatsunemiku: "hatsunemiku",
  hcatgirl: "hcatgirl",
  headband: "headband",
  headdress: "headdress",
  headphones: "headphones",
  hloli: "hloli",
  hneko: "hnek",
  hololove: "hololove",
  horns: "horns",
  inshorts: "inshorts",
  japanesecloths: "japanesecloths",
  necklace: "necklace",
  nipples: "nipples",
  nobra: "nobra",
  hbeach: "hbeach",
  hbell: "hbell",
  hdemon: "hdemon",
  hidol: "hidol",
  hmaid: "hmaid",
  hvampire: "hvampire",
  nude: "hvmpire",
  origial: "original",
  sex: "sex",
};

export default {
  name: "nsfw",
  alias: ["nsfw", ...Object.keys(NSFW_COMMANDS)],
  description: "High Quality NSFW Images",

  start: async (Atlas, m, { prefix, inputCMD, args, isAdmin }) => {
    
    if (inputCMD === "nsfw") {
      if (!m.isGroup) return m.reply("Group only ❌");
      if (!isAdmin) return m.reply("Admin only ❌");
      if (!args[0]) {
        return m.reply(
          `Use:\n\n${prefix}nsfw on\n${prefix}nsfw off`
        );
      }
      if (args[0] === "on") {
        await setNSFW(m.from);
        return m.reply("NSFW Enabled ✅");
      }
      if (args[0] === "off") {
        await delNSFW(m.from);
        return m.reply("NSFW Disabled ❌");
      }
    }
    if (m.isGroup) {
      const nsfw = await checkNSFW(m.from);
      if (!nsfw) {
        return m.reply(
          `NSFW disabled ❌\n\nEnable using:\n*${prefix}nsfw on*`
        );
      }
    }
    const endpoint = NSFW_COMMANDS[inputCMD];
    if (!endpoint) return;
    try {
      await m.reply("Fetching... 🔞");
      const res = await axios.get(
        `https://stenx-apis.vercel.app/api/nsfw/${endpoint}`
      );
      if (!res.data || !res.data.url) {
        return m.reply("API failed ❌");
      }
      const img = await axios.get(res.data.url, {
        responseType: "arraybuffer",
      });
      await Atlas.sendMessage(
        m.from,
        {
          image: Buffer.from(img.data),
          caption: `🔞 NSFW: ${endpoint}`,
        },
        { quoted: m }
      );
    } catch (err) {
      console.log("NSFW ERROR:", err.message);
      m.reply("Failed to fetch image ❌");
    }
  },
};