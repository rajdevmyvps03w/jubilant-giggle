import axios from "axios";
import { checkNSFW } from "../System/MongoDB/MongoDb_Core.js";

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
  alias: Object.keys(NSFW_COMMANDS),
  description: "High Qualit NSFW Images",

  start: async (Atlas, m, { prefix, inputCMD }) => {
    if (m.isGroup) {
      const nsfw = await checkNSFW(m.from);

      if (!nsfw) {
        return m.reply(
          `NSFW disabled ❌\n\nEnable using:\n*${prefix}nsfw on*`
        );
      }
    }

    try {
      // command check
      const endpoint = NSFW_COMMANDS[inputCMD];

      if (!endpoint) {
        return m.reply("Invalid NSFW command ❌");
      }

      // loading
      await m.reply("Fetching... 🔞");

      // api call
      const res = await axios.get(
        `https://stenx-apis.vercel.app/api/nsfw/${endpoint}`
      );
      const img = res.data.url;
      await Atlas.sendMessage(
        m.from,
        {
          image: { url: img },
          caption: `🔞 NSFW: ${endpoint}`
        },
        { quoted: m }
      );

    } catch (e) {
      console.log(e);
      m.reply("Error fetching NSFW ❌");
    }
  },
};