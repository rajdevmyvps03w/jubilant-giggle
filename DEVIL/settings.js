//base by DGXeon (Xeon Bot Inc.)
//re-upload? recode? copy code? give credit ya :)
//YouTube: @DGXeon
//Instagram: unicorn_xeon13
//Telegram: @DGXeon
//GitHub: @DGXeon
//WhatsApp: +916909137213
//want more free bot scripts? subscribe to my youtube channel: https://youtube.com/@DGXeon
//telegram channel: https://t.me/+WEsVdEN2B9w4ZjA9

const fs = require("fs");
const chalk = require("chalk")

global.BOT_TOKEN = "" // create bot here https://t.me/Botfather and get bot token
global.BOT_NAME = "Xeon Tele Bot V10" //your bot name
global.OWNER_NAME = "@SexyXeon13" //your name with sign @
global.OWNER = ["https://t.me/+QTDvwwdYTpNhNjc1", "https://youtube.com/@dgxeon?si=Ogk_T5DMcDjTQjNF"] // Make sure the username is correct so that the special owner features can be used.
global.DEVELOPER = ["5103483585"] //developer telegram id to operate addprem delprem and listprem
global.pp = 'https://i.ibb.co/ydRKHnw/thumb.jpg' //your bot pp


//approval
global.GROUP_ID = -1003703147587; // Replace with your group ID
global.CHANNEL_ID = -1003867874821; // Replace with your channel ID
global.GROUP_LINK = "https://t.me/+Cmb8ruA-qjliNzc1"; // Replace with your group link
global.CHANNEL_INVITE_LINK = "https://t.me/Allianceofcreations"; // Replace with your private channel invite link
global.WHATSAPP_LINK = "https://whatsapp.com/channel/0029Vb5Z9SjIXnlvl97EQm2i"; // Replace with your group link
global.YOUTUBE_LINK = "https://youtube.com/@dgxeon"; // Replace with your youtube link
global.INSTAGRAM_LINK = "https://www.instagram.com/unicorn_xeon13"; // Replace with your ig link

global.owner = global.owner = ['584266331519'] //owner whatsapp

const {
   english
} = require("./lib");
global.language = english
global.lang = language

let file = require.resolve(__filename)
fs.watchFile(file, () => {
fs.unwatchFile(file)
console.log(chalk.redBright(`Update ${__filename}`))
delete require.cache[file]
require(file)
})