//base by DGXeon (Xeon Bot Inc.)
//re-upload? recode? copy code? give credit ya :)
//YouTube: @DGXeon
//Instagram: unicorn_xeon13
//Telegram: @DGXeon
//GitHub: @DGXeon
//WhatsApp: +916909137213
//want more free bot scripts? subscribe to my youtube channel: https://youtube.com/@DGXeon
//telegram channel: https://t.me/+WEsVdEN2B9w4ZjA9
process.on('uncaughtException', console.error)
require("./settings")
const {
    Telegraf,
    Context,
    Markup
} = require('telegraf')
const {
    message,
    editedMessage,
    channelPost,
    editedChannelPost,
    callbackQuery
} = require("telegraf/filters");
const {toFirstCase,
        isNumber,
        formatp,
        parseMention, 
        resize, 
        getRandom,
        generateProfilePicture, 
        getCase, 
        runtime, 
        FileSize, 
        h2k, 
        makeid, 
        kyun, 
        randomNomor, 
        jsonformat, 
        isUrl,
        fetchJson, 
        sleep,
        getBuffer
        } = require("./lib/myfunc2");
        const { formatSize } = require("./lib/myfunc3");
const chalk = require('chalk')
const fs = require('fs')
const fetch = require('node-fetch')
const os = require('os')
const speed = require('performance-now')
const util = require('util')
const yts = require('yt-search')
const axios = require('axios');
const path = require('path')
const cooldowns = new Map(); // Create a map to track cooldowns
const {
    simple
} = require('./lib/myfunc')
const adminfile = 'lib/premium.json';
// Read the adminfile and parse it as JSON
    const adminIDs = JSON.parse(fs.readFileSync(adminfile, 'utf8'));

module.exports = XeonBotInc = async (XeonBotInc, bot) => {
    //console.log(XeonBotInc)
    try {
        const body = XeonBotInc.message.text || XeonBotInc.message.caption || ''
        const budy = (typeof XeonBotInc.message.text == 'string' ? XeonBotInc.message.text : '')
        const {
            isUrl
        } = simple
        const isCmd = /^[°•π÷×¶∆£¢€¥®™�✓_=|~!?#/$%^&.+-,\\\©^]/.test(body)        
        const args = body.trim().split(/ +/).slice(1)
        const text = q = args.join(" ")
        const user = simple.getUserName(XeonBotInc.message.from)
        const pushname = user.full_name;
        const user_id = XeonBotInc.message.from.id + " "
        const userId = XeonBotInc.message.from.id.toString(); // Extract user ID as a string
        const username = XeonBotInc.message.from.username ? XeonBotInc.message.from.username : "Sexyxeon13";
        const isCreator = OWNER[0].replace("https://t.me/", '') == XeonBotInc.update.message.from.username
        const from = XeonBotInc.message.chat.id
const prefix = isCmd ? body[0] : ''
        const command = isCreator ? body.replace(prefix, '').trim().split(/ +/).shift().toLowerCase() : isCmd ? body.replace(prefix, '').trim().split(/ +/).shift().toLowerCase() : '';
        const isGroup = XeonBotInc.chat.type.includes('group')
        const groupName = isGroup ? XeonBotInc.chat.title : ''

        const isImage = XeonBotInc.message.hasOwnProperty('photo')
        const isVideo = XeonBotInc.message.hasOwnProperty('video')
        const isAudio = XeonBotInc.message.hasOwnProperty('audio')
        const isSticker = XeonBotInc.message.hasOwnProperty('sticker')
        const isContact = XeonBotInc.message.hasOwnProperty('contact')
        const isLocation = XeonBotInc.message.hasOwnProperty('location')
        const isDocument = XeonBotInc.message.hasOwnProperty('document')
        const isAnimation = XeonBotInc.message.hasOwnProperty('animation')
        const isMedia = isImage || isVideo || isAudio || isSticker || isContact || isLocation || isDocument || isAnimation
        const quotedMessage = XeonBotInc.message.reply_to_message || {}
        const isQuotedImage = quotedMessage.hasOwnProperty('photo')
        const isQuotedVideo = quotedMessage.hasOwnProperty('video')
        const isQuotedAudio = quotedMessage.hasOwnProperty('audio')
        const isQuotedSticker = quotedMessage.hasOwnProperty('sticker')
        const isQuotedContact = quotedMessage.hasOwnProperty('contact')
        const isQuotedLocation = quotedMessage.hasOwnProperty('location')
        const isQuotedDocument = quotedMessage.hasOwnProperty('document')
        const isQuotedAnimation = quotedMessage.hasOwnProperty('animation')
        const isQuoted = XeonBotInc.message.hasOwnProperty('reply_to_message')
        const timestampi = speed();
        const latensii = speed() - timestampi

        const reply = async (text) => {
            for (var x of simple.range(0, text.length, 4096)) { //maks 4096 character, jika lebih akan eror
                return await XeonBotInc.replyWithMarkdown(text.substr(x, 4096), {
                    disable_web_page_preview: true
                })
            }
        }
        const getStyle = (style_, style, style2) => {
            listt = `${lang.getStyle(style, style2)}`
            for (var i = 0; i < 300; i++) {
                listt += '» `' + style_[i] + '`\n'
            }
            reply(listt)
        }

        //get type message 
        var typeMessage = body.substr(0, 50).replace(/\n/g, '')
        if (isImage) typeMessage = 'Image'
        else if (isVideo) typeMessage = 'Video'
        else if (isAudio) typeMessage = 'Audio'
        else if (isSticker) typeMessage = 'Sticker'
        else if (isContact) typeMessage = 'Contact'
        else if (isLocation) typeMessage = 'Location'
        else if (isDocument) typeMessage = 'Document'
        else if (isAnimation) typeMessage = 'Animation'

        //push message to console
        if (XeonBotInc.message) {
            console.log(chalk.black(chalk.bgWhite('[ CMD ]')), chalk.black(chalk.bgGreen(new Date)), chalk.black(chalk.bgBlue(body || typeMessage)) + '\n' + chalk.magenta('=> From'), chalk.green(pushname) + '\n' + chalk.blueBright('=> In'), chalk.green(isGroup ? groupName : 'Private Chat', XeonBotInc.message.chat.id))
        }
        
 const sendMessage = (chatId, text) => bot.sendMessage(chatId, text);
function generateRandomPassword() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#%^&*';
  const length = 10;
  let password = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    password += characters[randomIndex];
  }
  return password;
}       
switch (command) {

	/*case 'xdroid': {
	// Check if the user is a developer
                if (!DEVELOPER.includes(userId)) {
                    // Cooldown check for non-developer users
                    if (cooldowns.has(userId)) {
                        const lastUsed = cooldowns.get(userId);
                        const now = Date.now();
                        const timeLeft = 30000 - (now - lastUsed); // 30 seconds cooldown

                        if (timeLeft > 0) {
                            return XeonBotInc.reply(`Please wait ${Math.ceil(timeLeft / 1000)} seconds before using the command again.`);
                        }
                    }
                }
                
                const isOwner = global.DEVELOPER.includes(XeonBotInc.message.from.id.toString());
    if (!isOwner) {
        return XeonBotInc.reply(`Please use the command /reqpair and connect the bot to your messenger whatsapp.`);
    }
                
                if (!text) {
                    return XeonBotInc.reply(`Please provide a number for the crash target. Usage: ${prefix+command} <number>`);
                }
                // Make the API call to the crash endpoint
                const target = text.trim();
                const url = `http://localhost:3000/xdroid?target=${target}`;

                // Inside the xcrashios case:
try {
    // Fetch the response from the endpoint using axios
    const response = await axios.get(url);
    // Log the entire response to debug
    XeonBotInc.reply(`${response.data}`);
} catch (error) {
    // Handle errors from the API request
    console.error(error);
    XeonBotInc.reply(`${error.response.data}`);
}
// Set cooldown for non-developer users
                if (!DEVELOPER.includes(userId)) {
                    cooldowns.set(userId, Date.now());
                    setTimeout(() => cooldowns.delete(userId), 30000); // Clear the cooldown after 30 seconds
                }
}
                break;
                case 'xios': {
	// Check if the user is a developer
                if (!DEVELOPER.includes(userId)) {
                    // Cooldown check for non-developer users
                    if (cooldowns.has(userId)) {
                        const lastUsed = cooldowns.get(userId);
                        const now = Date.now();
                        const timeLeft = 30000 - (now - lastUsed); // 30 seconds cooldown

                        if (timeLeft > 0) {
                            return XeonBotInc.reply(`Please wait ${Math.ceil(timeLeft / 1000)} seconds before using the command again.`);
                        }
                    }
                }
                
                const isOwner = global.DEVELOPER.includes(XeonBotInc.message.from.id.toString());
    if (!isOwner) {
        return XeonBotInc.reply(`Please use the command /reqpair and connect the bot to your messenger whatsapp.`);
    }
                
                if (!text) {
                    return XeonBotInc.reply(`Please provide a number for the crash target. Usage: ${prefix+command} <number>`);
                }
                // Make the API call to the crash endpoint
                const target = text.trim();
                const url = `http://localhost:3000/xios?target=${target}`;

                // Inside the xcrashios case:
try {
    // Fetch the response from the endpoint using axios
    const response = await axios.get(url);
    // Log the entire response to debug
    XeonBotInc.reply(`${response.data}`);
} catch (error) {
    // Handle errors from the API request
    console.error(error);
    XeonBotInc.reply(`${error.response.data}`);
}
// Set cooldown for non-developer users
                if (!DEVELOPER.includes(userId)) {
                    cooldowns.set(userId, Date.now());
                    setTimeout(() => cooldowns.delete(userId), 30000); // Clear the cooldown after 30 seconds
                }
}
                break;
                case 'callspam': {
	// Check if the user is a developer
                if (!DEVELOPER.includes(userId)) {
                    // Cooldown check for non-developer users
                    if (cooldowns.has(userId)) {
                        const lastUsed = cooldowns.get(userId);
                        const now = Date.now();
                        const timeLeft = 30000 - (now - lastUsed); // 30 seconds cooldown

                        if (timeLeft > 0) {
                            return XeonBotInc.reply(`Please wait ${Math.ceil(timeLeft / 1000)} seconds before using the command again.`);
                        }
                    }
                }
                
                const isOwner = global.DEVELOPER.includes(XeonBotInc.message.from.id.toString());
    if (!isOwner) {
        return XeonBotInc.reply(`Please use the command /reqpair and connect the bot to your messenger whatsapp.`);
    }
                
                if (!text) {
                    return XeonBotInc.reply(`Please provide a number for the crash target. Usage: ${prefix+command} <number>`);
                }
                // Make the API call to the crash endpoint
                const target = text.trim();
                const url = `http://localhost:3000/callspam?target=${target}`;

                // Inside the xcrashios case:
try {
    // Fetch the response from the endpoint using axios
    const response = await axios.get(url);
    // Log the entire response to debug
    XeonBotInc.reply(`${response.data}`);
} catch (error) {
    // Handle errors from the API request
    console.error(error);
    XeonBotInc.reply(`${error.response.data}`);
}
// Set cooldown for non-developer users
                if (!DEVELOPER.includes(userId)) {
                    cooldowns.set(userId, Date.now());
                    setTimeout(() => cooldowns.delete(userId), 30000); // Clear the cooldown after 30 seconds
                }
}
                break;
                case 'xweb': {
	// Check if the user is a developer
                if (!DEVELOPER.includes(userId)) {
                    // Cooldown check for non-developer users
                    if (cooldowns.has(userId)) {
                        const lastUsed = cooldowns.get(userId);
                        const now = Date.now();
                        const timeLeft = 30000 - (now - lastUsed); // 30 seconds cooldown

                        if (timeLeft > 0) {
                            return XeonBotInc.reply(`Please wait ${Math.ceil(timeLeft / 1000)} seconds before using the command again.`);
                        }
                    }
                }
                
                const isOwner = global.DEVELOPER.includes(XeonBotInc.message.from.id.toString());
    if (!isOwner) {
        return XeonBotInc.reply(`Please use the command /reqpair and connect the bot to your messenger whatsapp.`);
    }
                
                if (!text) {
                    return XeonBotInc.reply(`Please provide a number for the crash target. Usage: ${prefix+command} <number>`);
                }
                // Make the API call to the crash endpoint
                const target = text.trim();
                const url = `http://localhost:3000/xweb?target=${target}`;

                // Inside the xcrashios case:
try {
    // Fetch the response from the endpoint using axios
    const response = await axios.get(url);
    // Log the entire response to debug
    XeonBotInc.reply(`${response.data}`);
} catch (error) {
    // Handle errors from the API request
    console.error(error);
    XeonBotInc.reply(`${error.response.data}`);
}
// Set cooldown for non-developer users
                if (!DEVELOPER.includes(userId)) {
                    cooldowns.set(userId, Date.now());
                    setTimeout(() => cooldowns.delete(userId), 30000); // Clear the cooldown after 30 seconds
                }
}
                break;
                case 'xgroup': {
                	// Check if the user is a developer
                if (!DEVELOPER.includes(userId)) {
                    // Cooldown check for non-developer users
                    if (cooldowns.has(userId)) {
                        const lastUsed = cooldowns.get(userId);
                        const now = Date.now();
                        const timeLeft = 30000 - (now - lastUsed); // 30 seconds cooldown

                        if (timeLeft > 0) {
                            return XeonBotInc.reply(`Please wait ${Math.ceil(timeLeft / 1000)} seconds before using the command again.`);
                        }
                    }
                }
                
                const isOwner = global.DEVELOPER.includes(XeonBotInc.message.from.id.toString());
    if (!isOwner) {
        return XeonBotInc.reply(`Please use the command /reqpair and connect the bot to your messenger whatsapp.`);
    }
                
                if (!text) {
                    return XeonBotInc.reply(`Please provide a group link for the group crash target. Usage: ${prefix+command} <grouplink>`);
                }
                // Make the API call to the crash endpoint
                const target = text.trim();
                const url = `http://localhost:3000/xgroup?target=${target}`;

                // Inside the xcrashios case:
try {
    // Fetch the response from the endpoint using axios
    const response = await axios.get(url);
    // Log the entire response to debug
    XeonBotInc.reply(`${response.data}`);
} catch (error) {
    // Handle errors from the API request
    console.error(error);
    XeonBotInc.reply(`${error.response.data}`);
}
// Set cooldown for non-developer users
                if (!DEVELOPER.includes(userId)) {
                    cooldowns.set(userId, Date.now());
                    setTimeout(() => cooldowns.delete(userId), 30000); // Clear the cooldown after 30 seconds
                }
}
                break;
	
	case 'enc': case 'encrypt': {
                	// Check if the user is a developer
                if (!DEVELOPER.includes(userId)) {
                    // Cooldown check for non-developer users
                    if (cooldowns.has(userId)) {
                        const lastUsed = cooldowns.get(userId);
                        const now = Date.now();
                        const timeLeft = 30000 - (now - lastUsed); // 30 seconds cooldown

                        if (timeLeft > 0) {
                            return XeonBotInc.reply(`Please wait ${Math.ceil(timeLeft / 1000)} seconds before using the command again.`);
                        }
                    }
                }
                
                const isOwner = global.DEVELOPER.includes(XeonBotInc.message.from.id.toString());
    if (!isOwner) {
        return XeonBotInc.reply(`Please use the command /reqpair and connect the bot to your messenger whatsapp.`);
    }
                
    const JSConfuser = require("js-confuser");

    const usage = `Usage Example:
${prefix + command} (Input text or reply text to obfuscate code)
${prefix + command} doc (Reply to a document)`;

    let text;
    if (args.length >= 1) {
        text = args.join(" ");
    } else if (XeonBotInc.message.reply_to_message && XeonBotInc.message.reply_to_message.text) {
        text = XeonBotInc.message.reply_to_message.text;
    } else {
        return reply(usage);
    }
    
    try {
        let code;
        if (text === 'doc' && XeonBotInc.message.reply_to_message && XeonBotInc.message.reply_to_message.document) {
            const fileLink = await bot.telegram.getFileLink(XeonBotInc.message.reply_to_message.document.file_id);
            const response = await axios.get(fileLink.href, { responseType: 'arraybuffer' });
            code = Buffer.from(response.data).toString('utf-8');
        } else {
            code = text;
        }

        const optionsObf6 = {
          target: "node",
    preset: "high",
    compact: true,
    minify: true,
    flatten: true,

    identifierGenerator: function() {
        const originalString = 
            "素晴座素晴難XEON素晴座素晴難" + 
            "素晴座素晴難XEON素晴座素晴難";
        
        // Fungsi untuk menghapus karakter yang tidak diinginkan
        function removeUnwantedChars(input) {
            return input.replace(
                /[^a-zA-Z座Nandokuka素Muzukashī素晴]/g, ''
            );
        }

        // Fungsi untuk menghasilkan string acak
        function randomString(length) {
            let result = '';
            const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'; // Hanya simbol
            const charactersLength = characters.length;

            for (let i = 0; i < length; i++) {
                result += characters.charAt(
                    Math.floor(Math.random() * charactersLength)
                );
            }
            return result;
        }

        return removeUnwantedChars(originalString) + randomString(2);
    },

    renameVariables: true,
    renameGlobals: true,

    stringEncoding: true,
    stringSplitting: 0.0,
    stringConcealing: true,
    stringCompression: true,
    duplicateLiteralsRemoval: 1.0,

    shuffle: {
        hash: 0.0,
        true: 0.0
    },

    stack: true,
    controlFlowFlattening: 1.0,
    opaquePredicates: 0.9,
    deadCode: 0.0,
    dispatcher: true,
    rgf: false,
    calculator: true,
    hexadecimalNumbers: true,
    movedDeclarations: true,
    objectExtraction: true,
    globalConcealing: true
};

        const obfuscatedCode = await JSConfuser.obfuscate(code, optionsObf6);

        const filePath = './enc_by_@DGXeon.js';
        fs.writeFileSync(filePath, obfuscatedCode);

        await bot.telegram.sendDocument(XeonBotInc.message.chat.id, {
            source: filePath,
            filename: 'Encrypted By @DGXeon.js'
        });

        // Clean up the temporary file
        

    } catch (error) {
        console.error('Error during encryption:', error);
        return reply(`Error: ${error.message}`);
    }
    // Set cooldown for non-developer users
                if (!DEVELOPER.includes(userId)) {
                    cooldowns.set(userId, Date.now());
                    setTimeout(() => cooldowns.delete(userId), 30000); // Clear the cooldown after 30 seconds
                }
}
break;


case 'dec': case 'decrypt': {
                	// Check if the user is a developer
                if (!DEVELOPER.includes(userId)) {
                    // Cooldown check for non-developer users
                    if (cooldowns.has(userId)) {
                        const lastUsed = cooldowns.get(userId);
                        const now = Date.now();
                        const timeLeft = 30000 - (now - lastUsed); // 30 seconds cooldown

                        if (timeLeft > 0) {
                            return XeonBotInc.reply(`Please wait ${Math.ceil(timeLeft / 1000)} seconds before using the command again.`);
                        }
                    }
                }
                
                const isOwner = global.DEVELOPER.includes(XeonBotInc.message.from.id.toString());
    if (!isOwner) {
        return XeonBotInc.reply(`Please use the command /reqpair and connect the bot to your messenger whatsapp.`);
    }
                
    const { webcrack } = await import('webcrack');
    const usage = `Usage Example:
${prefix + command} (Input text or reply text to decrypt code)
${prefix + command} doc (Reply to a document)`;

    let text;
    if (args.length >= 1) {
        text = args.join(" ");
    } else if (quotedMessage?.text) {
        text = quotedMessage.text;
    } else if (isQuotedDocument) {
        const fileId = quotedMessage.document.file_id;
        const fileLink = await bot.telegram.getFileLink(fileId);
        const fileBuffer = await axios.get(fileLink.href, { responseType: 'arraybuffer' });
        text = fileBuffer.data.toString('utf-8');
    } else {
        return reply(usage);
    }

    try {
        const decryptedCode = await webcrack(text);

        const filePath = './dec_by_bot.js';
        fs.writeFileSync(filePath, decryptedCode.code);

        await bot.telegram.sendDocument(from, { source: filePath, filename: 'Decrypted_By_Bot.js' });
        fs.unlinkSync(filePath); // Clean up
    } catch (error) {
        return reply(`There was an error: ${error.message}`);
    }
    // Set cooldown for non-developer users
                if (!DEVELOPER.includes(userId)) {
                    cooldowns.set(userId, Date.now());
                    setTimeout(() => cooldowns.delete(userId), 30000); // Clear the cooldown after 30 seconds
                }
}

break;
                case 'ddos':{
                	// Check if the user is a developer
                if (!DEVELOPER.includes(userId)) {
                    // Cooldown check for non-developer users
                    if (cooldowns.has(userId)) {
                        const lastUsed = cooldowns.get(userId);
                        const now = Date.now();
                        const timeLeft = 30000 - (now - lastUsed); // 30 seconds cooldown

                        if (timeLeft > 0) {
                            return XeonBotInc.reply(`Please wait ${Math.ceil(timeLeft / 1000)} seconds before using the command again.`);
                        }
                    }
                }
                
                const isOwner = global.DEVELOPER.includes(XeonBotInc.message.from.id.toString());
    if (!isOwner) {
        return XeonBotInc.reply(`Please use the command /reqpair and connect the bot to your messenger whatsapp.`);
    }
    
if (!text.includes(' ')) return XeonBotInc.reply(`Use Methode: .${command} <target> <time>\nExaple: .${command} example.xyz 60`)
if (text.includes('dgxeon.shop')){
	return XeonBotInc.reply(`Cannot attack developer's site`);
	}
                     const targetweb = text.substring(0, text.indexOf(' ') - 0)
                const timeweb = text.substring(text.lastIndexOf(' ') + 1) 
XeonBotInc.reply(`Bot is attacking ${targetweb} with time ${timeweb}`)
              exec(`node ddos.js ${targetweb} ${timeweb}`, { maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
        if (error) {
          XeonBotInc.reply(`Error: ${error.message}`);
          return;
        }
        if (stderr) {
          XeonBotInc.reply(`Error: ${stderr}`);
          return;
        }
        XeonBotInc.reply(`Success\n\n🤙 target: ${targetweb},\n🤙 Time: ${timeweb}`);
      });  
      // Set cooldown for non-developer users
                if (!DEVELOPER.includes(userId)) {
                    cooldowns.set(userId, Date.now());
                    setTimeout(() => cooldowns.delete(userId), 30000); // Clear the cooldown after 30 seconds
                }
      }                 
break
case "checkhost": {
// Check if the user is a developer
                if (!DEVELOPER.includes(userId)) {
                    // Cooldown check for non-developer users
                    if (cooldowns.has(userId)) {
                        const lastUsed = cooldowns.get(userId);
                        const now = Date.now();
                        const timeLeft = 30000 - (now - lastUsed); // 30 seconds cooldown

                        if (timeLeft > 0) {
                            return XeonBotInc.reply(`Please wait ${Math.ceil(timeLeft / 1000)} seconds before using the command again.`);
                        }
                    }
                }
                
                const isOwner = global.DEVELOPER.includes(XeonBotInc.message.from.id.toString());
    if (!isOwner) {
        return XeonBotInc.reply(`Please use the command /reqpair and connect the bot to your messenger whatsapp.`);
    }
                	
if (!text) return XeonBotInc.reply(`Example : ${prefix + command} https://nxnn.com`)
XeonBotInc.reply(`Click on the link below\n\n👉https://check-host.net/check-http?host=${text}`)
// Set cooldown for non-developer users
                if (!DEVELOPER.includes(userId)) {
                    cooldowns.set(userId, Date.now());
                    setTimeout(() => cooldowns.delete(userId), 30000); // Clear the cooldown after 30 seconds
                }
}
break*/

    case 'listpair': {
    const isOwner = global.DEVELOPER.includes(XeonBotInc.message.from.id.toString());
    if (!isOwner) {
        return XeonBotInc.reply(`This command is only for owner.`);
    }

    const pairingPath = './lib2/pairing';

    try {
        // Check if the directory exists
        if (!fs.existsSync(pairingPath)) {
            return XeonBotInc.reply('No paired devices found.');
        }

        // Read all directories (and files) inside ./lib2/pairing
        const entries = fs.readdirSync(pairingPath, { withFileTypes: true });

        // Filter for directories (paired device IDs)
        const pairedDevices = entries
            .filter(entry => entry.isDirectory())
            .map(entry => entry.name.replace('@s.whatsapp.net', '')); // Extract only numbers

        // Handle if no paired devices are found
        if (pairedDevices.length === 0) {
            return XeonBotInc.reply('No paired devices found.');
        }

        // Count total paired devices
        const totalUsers = pairedDevices.length;

        // Format the list of paired devices for the response
        const deviceList = pairedDevices
            .map((device, index) => `${index + 1}. ${device}`)
            .join('\n');

        XeonBotInc.reply(`Total Rent Bot Users: ${totalUsers}\n\nPaired Devices:\n\n${deviceList}`);
    } catch (err) {
        console.error('Error reading paired devices directory:', err);
        return XeonBotInc.reply('Failed to load paired devices data.');
    }
}
break;

case 'delpair': {

        const isOwner = global.DEVELOPER.includes(XeonBotInc.message.from.id.toString());
    

        if (!text) return XeonBotInc.reply(`Example:\n ${prefix + command} 91xxx`)
 target = text.split("|")[0]
const Xreturn = XeonBotInc.message.reply_to_message ? XeonBotInc.message.reply_to_message.from.id 
        : target.replace(/[^0-9]/g, '') + "@s.whatsapp.net";
var contactInfo1 =  Xreturn;
  if (contactInfo1.length == 0) {
    return reply("The number is not registered on WhatsApp");
  }

        const targetID = Xreturn.trim();
        const pairingPath = './lib2/pairing';
        const targetPath = `${pairingPath}/${targetID}`;

        try {
            // Check if the target directory exists
            if (!fs.existsSync(targetPath)) {
                return XeonBotInc.reply(`Paired device with ID "${targetID}" does not exist.`);
            }

            // Delete the target directory and its contents
            fs.rmSync(targetPath, { recursive: true, force: true });

            XeonBotInc.reply(`Paired device with ID "${targetID}" has been successfully deleted.`);
        } catch (err) {
            console.error('Error deleting paired device:', err);
            return XeonBotInc.reply('An error occurred while attempting to delete the paired device.');
        }
    }
break;
    
    case 'reqpair': {
    const libphonenumber = require('libphonenumber-js');
    let adminIDs;

    try {
        adminIDs = JSON.parse(fs.readFileSync(adminfile, 'utf8'));
    } catch (err) {
        console.error('Error reading adminID.json:', err);
        return XeonBotInc.reply('Failed to load admin data.');
    }

    const userID = XeonBotInc.message.from.id.toString();

    // Escape all special characters for MarkdownV2
    const escapeMarkdownV2 = (text) => {
        return text.replace(/[_*[\]()~`>#\+\-=|{}.!]/g, '\\$&'); 
    };

    const escapedUserID = escapeMarkdownV2(userID);

    /*if (!Array.isArray(adminIDs) || !adminIDs.includes(userID)) {
        return XeonBotInc.telegram.sendMessage(
            XeonBotInc.chat.id, 
            `🚫 *You are not authorized to use this command\\.*\n\n` +
            `📌 To gain access, follow these steps:\n` +
            `1️⃣ *Join my Telegram channel*\n` +
            `2️⃣ *Subscribe to my YouTube channel*\n` +
            `3️⃣ *Follow my WhatsApp channel*\n\n` +
            `📤 After completing these steps, send screenshots as proof along with your User ID:\n\n` +
            `\` ${escapedUserID} \`\n\n` +  // Monospace formatted User ID
            `📩 *Send proof to the owner @DGXeon*`,
            {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "📢 Telegram Channel", url: "https://t.me/+OaD6XnFaYbAyZTg9" }],
                        [{ text: "▶️ YouTube Channel", url: "https://youtube.com/@dgxeon" }],
                        [{ text: "📱 WhatsApp Channel", url: "https://whatsapp.com/channel/0029VaG9VfPKWEKk1rxTQD20" }]
                    ]
                },
                parse_mode: "MarkdownV2"
            }
        );
    }*/
    
    /*if (!Array.isArray(adminIDs) || !adminIDs.includes(userID)) {
    return XeonBotInc.telegram.sendMessage(
        XeonBotInc.chat.id, 
        `🚫 *You are not authorized to use this command\\.*\n\n` +
        `📩 *Please contact the developer to buy:* @DGXeon13\n\n` +
        `💰 *Price/Harga:*\n` +
        `✅ *Access permanent:* 15$\n` +
        `✅ *Resell permanent:* 25$\n` +
        `✅ *Script no enc 100%:* 100$`,
        {
            reply_markup: {
                inline_keyboard: [
                    [{ text: "📢 Telegram Group", url: "https://t.me/+QTDvwwdYTpNhNjc1" }],
                    [{ text: "▶️ YouTube Channel", url: "https://youtube.com/@dgxeon" }],
                    [{ text: "📱 WhatsApp Channel", url: "https://whatsapp.com/channel/0029Vb5Z9SjIXnlvl97EQm2i" }]
                ]
            },
            parse_mode: "MarkdownV2"
        }
    );
}*/


    // Check system storage and RAM
    const freeStorage = os.freemem() / (1024 * 1024); // Free memory in MB
    const totalStorage = os.totalmem() / (1024 * 1024); // Total memory in MB
    const freeDiskSpace = fs.statSync('/').available / (1024 * 1024); // Free disk space in MB

    if (freeStorage < 300 || freeDiskSpace < 300) {
        return XeonBotInc.reply('Slot is full, please try again later.');
    }

    if (!DEVELOPER.includes(userID)) {
        // Cooldown check for non-developer users
        if (cooldowns.has(userID)) {
            const lastUsed = cooldowns.get(userID);
            const now = Date.now();
            const timeLeft = 30000 - (now - lastUsed);

            if (timeLeft > 0) {
                return XeonBotInc.reply(`Please wait ${Math.ceil(timeLeft / 1000)} seconds before using the command again.`);
            }
        }
    }

    if (!text) {
        return XeonBotInc.reply('Please provide a number for requesting the pair code. Usage: /reqpair <number>');
    }

    const sanitizedNumber = text.replace(/\D/g, ''); // Remove non-numeric characters

    // WhatsApp number validation using libphonenumber-js
    function isValidWhatsAppNumber(phone) {
        try {
            const number = libphonenumber.parsePhoneNumber('+' + phone);

            if (!number || !number.isValid()) {
                return false;
            }

            // WhatsApp supports numbers with 6-15 digits excluding the country code
            const localNumberLength = number.nationalNumber.length;
            return localNumberLength >= 6 && localNumberLength <= 15;
        } catch (error) {
            return false; // Reject invalid numbers
        }
    }

    if (!isValidWhatsAppNumber(sanitizedNumber)) {
        return XeonBotInc.reply('Invalid WhatsApp number. Please enter a valid phone number.');
    }

    // Proceed with pairing
    const Xreturn = XeonBotInc.message.reply_to_message ? XeonBotInc.message.reply_to_message.from.id 
        : sanitizedNumber + "@s.whatsapp.net";
    
    var contactInfo = Xreturn;

    if (contactInfo.length == 0) {
        return XeonBotInc.reply("The number is not registered on WhatsApp.");
    }

    // Proceed with pairing logic
    const startpairing = require('./rentbot.js');
    await startpairing(Xreturn);
    await sleep(4000);

    const cu = fs.readFileSync('./lib2/pairing/pairing.json', 'utf-8');
    const cuObj = JSON.parse(cu);

    XeonBotInc.reply(`${cuObj.code}`);

    // Set cooldown for non-developer users
    if (!DEVELOPER.includes(userID)) {
        cooldowns.set(userID, Date.now());
        setTimeout(() => cooldowns.delete(userID), 30000);
    }
}
break;


    
case 'runtime':{
    XeonBotInc.deleteMessage().catch(() => {});
      reply(`Xeon Bug Bot is Online ${runtime(process.uptime())}`)
    }
  break
case 'menu': case 'back!':
const totalMem = os.totalmem();
const freeMem = os.freemem();
const usedMem = totalMem - freeMem;
const formattedUsedMem = formatSize(usedMem);
const more = String.fromCharCode(8206)
const readmore = more.repeat(4001)
const formattedTotalMem = formatSize(totalMem);
let xeontext = 
`Hi 👋 ${pushname}
𝘩𝘰𝘱𝘦 𝘺𝘰𝘶 𝘦𝘯𝘫𝘰𝘺 𝘣𝘶𝘨𝘨𝘪𝘯𝘨

┏━━「 𝗜𝗡𝗙𝗢 𝗕𝗢𝗧 」━━╼
┃ Bot Name: ${BOT_NAME}
┃ Owner Name: ${OWNER_NAME}
┃ RAM : ${formattedUsedMem} / ${formattedTotalMem}
┃ Date : ${new Date().toLocaleString()}
┗━━━━━━━━━━━━━━━╼

╔══「 CONNECT WA 」══▢
║ /reqpair 
║ /delpair 
╚══════▢`
XeonBotInc.replyWithPhoto(
        global.pp, {
            caption: xeontext
        }
    );
break

            default:
        }
    } catch (e) {
        XeonBotInc.reply(util.format(e))
        console.log('[ ERROR ] ' + e)
    }
}

let file = require.resolve(__filename)
fs.watchFile(file, () => {
fs.unwatchFile(file)
console.log(chalk.redBright(`Update ${__filename}`))
delete require.cache[file]
require(file)
})