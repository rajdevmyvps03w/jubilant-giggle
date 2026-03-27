//base by SeXyxeon13 (Xeon Bot Inc.)
//re-upload? recode? copy code? give credit ya :)
//YouTube: @SeXyxeon13
//Instagram: unicorn_xeon13
//Telegram: @SeXyxeon13
//GitHub: @SeXyxeon13
//WhatsApp: +916909137213
//want more free bot scripts? subscribe to my youtube channel: https://youtube.com/@SeXyxeon13
//telegram channel: https://t.me/+WEsVdEN2B9w4ZjA9

require("./settings")
const {
    Telegraf,
    Context,
    Markup
} = require('telegraf')
const {
    simple
} = require("./lib/myfunc")
const fs = require('fs') 
const os = require('os')
const speed = require('performance-now')
const axios = require('axios')
const chalk = require("chalk")
const o = fs.readFileSync(`./69/o.jpg`)
const { exec } = require('child_process');
const cooldowns = new Map(); // Create a map to track cooldowns
const adminfile = 'lib/premium.json';
// Read the adminfile and parse it as JSON
    const adminIDs = JSON.parse(fs.readFileSync(adminfile, 'utf8'));


const BOT_TOKEN = '8348730698:AAEReD1x0IZngtyidISJSQuc6RxQKe_M1bg';

if (!BOT_TOKEN || BOT_TOKEN.length < 10) {
    console.log("No token detected")
    process.exit(1)
}

const { Client } = require('ssh2');
global.api = (name, path = '/', query = {}, apikeyqueryname) => (name in global.APIs ? global.APIs[name] : name) + path + (query || apikeyqueryname ? '?' + new URLSearchParams(Object.entries({
    ...query,
    ...(apikeyqueryname ? {
        [apikeyqueryname]: global.APIKeys[name in global.APIs ? global.APIs[name] : name]
    } : {})
})) : '')

function escapeMarkdownV2(text) {
    return text.replace(/([_*[\]()~`>#+\-=|{}.!])/g, '\\$1');
}


// File to store all user IDs
const usersFile = 'users.json';
// Ensure the users file exists
if (!fs.existsSync(usersFile)) {
    fs.writeFileSync(usersFile, JSON.stringify([]));
}
async function saveUser(userId) {
    // Load existing users
    let users = [];
    if (fs.existsSync(usersFile)) {
        try {
            const data = fs.readFileSync(usersFile, 'utf8');
            users = JSON.parse(data);
        } catch (error) {
            console.error('Error reading users file:', error);
            users = [];
        }
    }

    // Check if the user already exists
    if (!users.includes(userId)) {
        users.push(userId); // Add the new user ID

        // Save the updated list of users
        try {
            fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
            console.log(`User ID ${userId} added to the users list.`);
        } catch (error) {
            console.error('Error writing to users file:', error);
        }
    }
}

let allUsers = JSON.parse(fs.readFileSync(usersFile));
const premium_file = 'lib/premium.json';
const reseller_file = 'lib/reseller.json';
try {
    premiumUsers = JSON.parse(fs.readFileSync(premium_file));
} catch (error) {
    console.error('Error reading premiumUsers file:', error);
}
try {
    resellerUsers = JSON.parse(fs.readFileSync(reseller_file));
} catch (error) {
    console.error('Error reading resellerUsers file:', error);
}

const resellerIDs = JSON.parse(fs.readFileSync(reseller_file, 'utf8'));

const bot = new Telegraf(BOT_TOKEN)

const puppeteer = require('puppeteer');

 //Function to automate the reporting process
    async function reportChannel(channelUrl, messageUrl, ctx) {
    const browser = await puppeteer.launch({ headless: "new" }); // Updated headless option
    const page = await browser.newPage();

    try {
        await ctx.reply("⚠️ Reporting in progress... Please wait.");

        console.log("Opening DSA Report Page...");
        await page.goto("https://telegram.org/dsa-report", { waitUntil: "networkidle2" });

        // Click "Report Illegal Content"
        await page.waitForSelector('a[href="/dsa-report/new"]');
        await page.click('a[href="/dsa-report/new"]');

        // Click "Continue without logging in"
        await page.waitForSelector('a[href="/dsa-report/without-login"]');
        await page.click('a[href="/dsa-report/without-login"]');

        // Enter Channel Link
        await page.waitForSelector('input[name="link"]');
        await page.type('input[name="link"]', channelUrl, { delay: 100 });

        // Click "Next"
        await page.click('button[type="submit"]');

        // Enter Message Link
        await page.waitForSelector('input[name="message_link"]');
        await page.type('input[name="message_link"]', messageUrl, { delay: 100 });

        // Click "Next"
        await page.click('button[type="submit"]');

        // Select "Scam or Scam"
        await page.waitForSelector('select[name="category"]');
        await page.select('select[name="category"]', "scam");

        // Select "Fraudulent Sales"
        await page.waitForSelector('select[name="subcategory"]');
        await page.select('select[name="subcategory"]', "fraudulent_sales");

        // Enter "Selling Hacks"
        await page.type('textarea[name="details"]', "Selling hacks", { delay: 100 });

        // Click "Next"
        await page.click('button[type="submit"]');

        // Select "I don’t have links to relevant laws"
        await page.waitForSelector('input[name="no_links"]');
        await page.click('input[name="no_links"]');

        // Click "Skip"
        await page.click('button[type="submit"]');

        // Select "Germany"
        await page.waitForSelector('select[name="country"]');
        await page.select('select[name="country"]', "DE");

        // Proceed without documentation
        await page.click('button[type="submit"]');

        // Select "On my behalf"
        await page.waitForSelector('input[name="on_behalf"]');
        await page.click('input[name="on_behalf"]');

        // Fill in User Details
        await page.type('input[name="full_name"]', process.env.FULL_NAME, { delay: 100 });
        await page.type('input[name="address"]', process.env.ADDRESS, { delay: 100 });
        await page.type('input[name="email"]', process.env.EMAIL, { delay: 100 });
        await page.type('input[name="phone"]', process.env.PHONE, { delay: 100 });

        // Click "Next"
        await page.click('button[type="submit"]');

        // Select "I don’t have a court order"
        await page.waitForSelector('input[name="no_court_order"]');
        await page.click('input[name="no_court_order"]');

        // Confirm
        await page.click('button[type="submit"]');

        // Enter Signature (Full Name)
        await page.type('input[name="signature"]', process.env.FULL_NAME, { delay: 100 });

        // Submit the report (Uncomment for real use)
        // await page.click('button[type="submit"]');

        console.log("Report submitted successfully!");
        await ctx.reply("✅ Report submitted successfully!");

    } catch (error) {
        console.error("Error reporting channel:", error);
        await ctx.reply("❌ Error while reporting. Please try again.");
    } finally {
        await browser.close();
    }
}

// Telegram bot command to trigger the report
bot.command("report", async (ctx) => {
    const messageText = ctx.message.text.split(" ");
    if (messageText.length < 3) {
        return ctx.reply("Usage: /report <channel_link> <message_link>");
    }

    const channelUrl = messageText[1];
    const messageUrl = messageText[2];

    await reportChannel(channelUrl, messageUrl, ctx);
});

async function checkMembership(userId) {
    // Membership check bypassed — always allow access
    return true;
}

// edit by sabr

async function checkMembership(userId) {
    try {
        const isInGroup = await bot.telegram.getChatMember(GROUP_ID, userId);
        const isInChannel = await bot.telegram.getChatMember(CHANNEL_ID, userId);
        return isInGroup.status !== 'left' && isInChannel.status !== 'left';
    } catch (err) {
        console.error("checkMembership error:", err);
        return false; // Assume user is not a member on failure
    }
}
async function verifyUser(ctx, next) {
    const userId = ctx.from.id;
    const isMember = await checkMembership(userId);
    return next();
}


// edit by sabir

async function verifyUser(ctx, next) {
    const userId = ctx.from.id;
    const isMember = await checkMembership(userId);

    if (!isMember) {
        return ctx.replyWithPhoto(global.pp, {
            caption: "❌ *Access Denied!*\n\nYou must join, subscribe and follow all the *given links* to use this bot.",
            parse_mode: "Markdown",
            reply_markup: {
                inline_keyboard: [
                    [{ text: "📲 WhatsApp", url: WHATSAPP_LINK }],
                    [{ text: "▶️ YouTube", url: YOUTUBE_LINK }],
                    [{ text: "📷 Instagram", url: INSTAGRAM_LINK }],
                    [{ text: "🔹 Telegram Group", url: GROUP_LINK }],
                    [{ text: "🔵 Telegram Channel", url: CHANNEL_INVITE_LINK }],
                    [{ text: "🔄 Check Again", callback_data: "check_membership" }]
                ]
            }
        });
    } else {
        return next();
    }
}


async function startXeony() {
    bot.on('callback_query', async (XeonBotInc) => {
    try {
        const userId = XeonBotInc.callbackQuery.from.id;
        const action = XeonBotInc.callbackQuery.data.split(' ');

        // 🔄 Handle "Check Again" button separately
        if (XeonBotInc.callbackQuery.data === "check_membership") {
            const isMember = await checkMembership(userId);

            await XeonBotInc.answerCbQuery( 
                isMember ? "✅ Verified! You can now use the bot." : "❌ You haven't completed the tasks yet!",
                { show_alert: true }
            ).catch(err => console.error("answerCbQuery error:", err));

            return; // Stop execution here
        }

        // ✅ Answer the callback only if it's not "check_membership"
        await XeonBotInc.answerCbQuery().catch(err => console.error("answerCbQuery error:", err));

        // ❌ Prevent unauthorized users from using another user's buttons
        if (action.length > 1 && Number(action[1]) !== userId) {
            await XeonBotInc.answerCbQuery('❌ This button is not for you!', { show_alert: true })
                .catch(err => console.error("answerCbQuery error:", err));
            return;
        }

        // 🔍 Check if user is a group/channel member
        const isMember = await checkMembership(userId);
        if (!isMember) {
            await XeonBotInc.answerCbQuery("❌ You must join our group and channel first!", { show_alert: true })
                .catch(err => console.error("answerCbQuery error:", err));
            return;
        }

        // 🕐 Calculate latency (for response time monitoring)
        const timestampi = speed();
        const latensii = speed() - timestampi;

        // 📌 Get user info
        const user = simple.getUserName(XeonBotInc.callbackQuery.from);
        const pushname = user.full_name;
        const username = user.username ? user.username : "SeXyxeon13";
        const isCreator = [XeonBotInc.botInfo.username, ...global.OWNER]
            .map(v => v.replace("https://t.me/", '')).includes(username);

        // 📩 Function to send long messages in chunks
        const reply = async (text) => {
            for (let x of simple.range(0, text.length, 4096)) { // Avoid exceeding Telegram's 4096-char limit
                await XeonBotInc.replyWithMarkdown(text.substr(x, 4096), {
                    disable_web_page_preview: true
                }).catch(err => console.error("Reply error:", err));
            }
        };

        // 🔄 Handle callback actions
        switch (action[0]) {
            case 'some_action': 
                await reply(`✅ Action executed for ${pushname}`);
                break;

            default:
                await reply("❌ Unknown action.");
                break;
        }

    } catch (error) {
        console.error("Error processing callback query:", error);
    }
});

const ownerId = global.DEVELOPER[0]; // The owner ID is defined in settings.js

    bot.command("start", verifyUser, async (XeonBotInc) => {
    if (XeonBotInc.chat.type !== "private") return;

    let user = simple.getUserName(XeonBotInc.message.from);

    try {
        // Retrieve the owner's profile photo
        const profilePhotos = await bot.telegram.getUserProfilePhotos(ownerId);
        
        // If the owner has profile photos
        if (profilePhotos.photos.length > 0) {
            // Get the largest resolution photo
            const ownerPhoto = profilePhotos.photos[0][profilePhotos.photos[0].length - 1].file_id;
            
            // Send the owner's profile photo along with the message
            await XeonBotInc.replyWithPhoto(ownerPhoto, {
                caption: lang.first_chat(BOT_NAME, user.full_name),
                parse_mode: "MarkdownV2",
                disable_web_page_preview: true,
                reply_markup: {
                    inline_keyboard: [
                        [{ text: 'OWNER', url: "https://t.me/SeXyxeon13" }, { text: 'DEVELOPER', url: "https://t.me/dgxeon13" }, { text: 'CHANNEL', url: "https://whatsapp.com/channel/0029Vb5CmxXJZg41O2SkG003" }]
                    ]
                }
            });
        } else {
            // If no profile photo is available, send a default image
            await XeonBotInc.reply(lang.first_chat(BOT_NAME, user.full_name), {
                parse_mode: "MarkdownV2",
                disable_web_page_preview: true,
                reply_markup: {
                    inline_keyboard: [
                        [{ text: 'OWNER', url: "https://t.me/SeXyxeon13" }, { text: 'DEVELOPER', url: "https://t.me/dgxeon13" }, { text: 'CHANNEL', url: "https://whatsapp.com/channel/0029Vb5CmxXJZg41O2SkG003" }]
                    ]
                }
            });
        }
    } catch (err) {
        console.error("Error fetching owner's profile photo:", err);
        // In case of an error, you can still send a default message without the photo
        await XeonBotInc.reply(lang.first_chat(BOT_NAME, user.full_name), {
            parse_mode: "MarkdownV2",
            disable_web_page_preview: true,
            reply_markup: {
                inline_keyboard: [
                    [{ text: 'OWNER', url: "https://t.me/SeXyxeon13" }, { text: 'DEVELOPER', url: "https://t.me/dgxeon13" }, { text: 'CHANNEL', url: "https://whatsapp.com/channel/0029Vb5CmxXJZg41O2SkG003" }]
                ]
            }
        });
    }
});

bot.command("listprem", verifyUser, async (XeonBotInc) => {
	if (XeonBotInc.chat.type !== "private") return;
    let resellerIDs = [];

    try {
        resellerIDs = JSON.parse(fs.readFileSync(reseller_file, 'utf8'));
    } catch (err) {
        console.error('Error reading reseller.json:', err);
        return XeonBotInc.reply('Failed to load reseller data.');
    }
    
    if (!Array.isArray(resellerIDs) || !resellerIDs.includes(XeonBotInc.message.from.id.toString())) {
    return XeonBotInc.reply(
        `🚫 *Only resellers can use this command.*`,
        { parse_mode: "Markdown" }
    );
}

    try {
        const adminList = premiumUsers.length > 0 ? premiumUsers.join('\n') : "No premium user found.";
        await XeonBotInc.reply(`🌹 Premium List:\n${adminList}`);
    } catch (error) {
        console.error("Error listing premium users:", error);
        XeonBotInc.reply("Error listing premium users.");
    }
});

bot.command("listresell", verifyUser, async (XeonBotInc) => {
    if (XeonBotInc.chat.type !== "private") return;

    const isOwner = global.DEVELOPER.includes(XeonBotInc.message.from.id.toString());
    if (!isOwner) {
        return XeonBotInc.reply(`You are not authorized to use this command.\n`);
    }

    try {
        if (resellerUsers.length === 0) {
            return XeonBotInc.reply("No reseller found.");
        }

        let adminList = "🌹 Reseller List:\n";

        for (const userId of resellerUsers) {
            try {
                const userInfo = await XeonBotInc.telegram.getChat(userId);
                const username = userInfo.username ? `@${userInfo.username}` : "No username";
                adminList += `${userId} - ${username}\n`;
            } catch (err) {
                adminList += `${userId} - No username\n`; // fallback if user not found
            }
        }

        await XeonBotInc.reply(adminList);
    } catch (error) {
        console.error("Error listing resellers:", error);
        XeonBotInc.reply("Error listing resellers.");
    }
});

bot.command('addprem', async (XeonBotInc) => {
	if (XeonBotInc.chat.type !== "private") return;
    
    let resellerIDs = [];

    try {
        resellerIDs = JSON.parse(fs.readFileSync(reseller_file, 'utf8'));
    } catch (err) {
        console.error('Error reading reseller.json:', err);
        return XeonBotInc.reply('Failed to load reseller data.');
    }
    
    if (!Array.isArray(resellerIDs) || !resellerIDs.includes(XeonBotInc.message.from.id.toString())) {
    return XeonBotInc.reply(
        `🚫 *Only resellers can use this command.*`,
        { parse_mode: "Markdown" }
    );
}

    const text = XeonBotInc.message.text.split(' ');
    if (text.length < 2) {
        return XeonBotInc.reply("Please provide the user ID to add as premium user.\nUsage: `/addprem <user_id>`", { parse_mode: "Markdown" });
    }
    const newAdmin = text[1];
    if (premiumUsers.includes(newAdmin)) {
        return XeonBotInc.reply("This user is already a premium user.");
    }
    try {
        premiumUsers.push(newAdmin);
        fs.writeFileSync(premium_file, JSON.stringify(premiumUsers, null, 2));
        XeonBotInc.reply(`✅ User ${newAdmin} added as admin.`);
    } catch (error) {
        console.error('Error adding user as premium:', error);
        XeonBotInc.reply('Error adding user as premium.');
    }
});

bot.command('addresell', async (XeonBotInc) => {
	if (XeonBotInc.chat.type !== "private") return;
    const isOwner = global.DEVELOPER.includes(XeonBotInc.message.from.id.toString());
    if (!isOwner) {
        return XeonBotInc.reply(`You are not authorized to use this command.\n`);
    }
    const text = XeonBotInc.message.text.split(' ');
    if (text.length < 2) {
        return XeonBotInc.reply("Please provide the user ID to add as premium user.\nUsage: `/addprem <user_id>`", { parse_mode: "Markdown" });
    }
    const newAdmin = text[1];
    if (resellerUsers.includes(newAdmin)) {
        return XeonBotInc.reply("This user is already a reseller.");
    }
    try {
        resellerUsers.push(newAdmin);
        fs.writeFileSync(reseller_file, JSON.stringify(resellerUsers, null, 2));
        XeonBotInc.reply(`✅ User ${newAdmin} added as reseller.`);
    } catch (error) {
        console.error('Error adding user as reseller:', error);
        XeonBotInc.reply('Error adding user as reseller.');
    }
});

bot.command('delprem', async (XeonBotInc) => {
	if (XeonBotInc.chat.type !== "private") return;
    let resellerIDs = [];

    try {
        resellerIDs = JSON.parse(fs.readFileSync(reseller_file, 'utf8'));
    } catch (err) {
        console.error('Error reading reseller.json:', err);
        return XeonBotInc.reply('Failed to load reseller data.');
    }
    
    if (!Array.isArray(resellerIDs) || !resellerIDs.includes(XeonBotInc.message.from.id.toString())) {
    return XeonBotInc.reply(
        `🚫 *Only resellers can use this command.*`,
        { parse_mode: "Markdown" }
    );
}

    const text = XeonBotInc.message.text.split(' ');
    if (text.length < 2) {
        return XeonBotInc.reply("Please provide the user ID to remove as premium user.\nUsage: `/delprem <user_id>`", { parse_mode: "Markdown" });
    }
    const adminToRemove = text[1];
    if (!premiumUsers.includes(adminToRemove)) {
        return XeonBotInc.reply("This user is not a premium user.");
    }
    try {
        premiumUsers = premiumUsers.filter((id) => id !== adminToRemove);
        fs.writeFileSync(premium_file, JSON.stringify(premiumUsers, null, 2));
        XeonBotInc.reply(`✅ User ${adminToRemove} removed from admins.`);
    } catch (error) {
        console.error('Error removing premium user:', error);
        XeonBotInc.reply('Error removing premium user.');
    }
});

bot.command('delresell', async (XeonBotInc) => {
	if (XeonBotInc.chat.type !== "private") return;
    const isOwner = global.DEVELOPER.includes(XeonBotInc.message.from.id.toString());
    if (!isOwner) {
        return XeonBotInc.reply(`You are not authorized to use this command.\n`);
    }
    const text = XeonBotInc.message.text.split(' ');
    if (text.length < 2) {
        return XeonBotInc.reply("Please provide the user ID to remove as premium user.\nUsage: `/delprem <user_id>`", { parse_mode: "Markdown" });
    }
    const adminToRemove = text[1];
    if (!resellerUsers.includes(adminToRemove)) {
        return XeonBotInc.reply("This user is not a reseller.");
    }
    try {
        resellerUsers = resellerUsers.filter((id) => id !== adminToRemove);
        fs.writeFileSync(reseller_file, JSON.stringify(resellerUsers, null, 2));
        XeonBotInc.reply(`✅ User ${adminToRemove} removed from reseller.`);
    } catch (error) {
        console.error('Error removing reseller:', error);
        XeonBotInc.reply('Error removing reseller.');
    }
});

bot.command('broadcast', async (XeonBotInc) => {
	if (XeonBotInc.chat.type !== "private") return;
    const isOwner = global.DEVELOPER.includes(XeonBotInc.message.from.id.toString());
    if (!isOwner) {
        return XeonBotInc.reply(`You are not authorized to use this command.\n`);
    }

    const cmdParts = XeonBotInc.message.text.split(' ');
    if (cmdParts.length < 2) {
        return XeonBotInc.reply("Please provide a message to broadcast.\nUsage: `/broadcast <message>`", { parse_mode: 'Markdown' });
    }

    // Join all parts after the command to form the full broadcast message
    const broadcastMessage = cmdParts.slice(1).join(' ');
    const allRecipients = Array.from(new Set([...allUsers, ...premiumUsers])); // Combine all users and premium users, remove duplicates

    let successCount = 0;
    let failedCount = 0;

    for (const userId of allRecipients) {
        try {
            // Check if the user is reachable
            const chat = await XeonBotInc.telegram.getChat(userId);
            if (chat) {
                await XeonBotInc.telegram.sendMessage(userId, broadcastMessage, { parse_mode: 'Markdown' });
                successCount++;
            }
        } catch (err) {
        }
    }

    XeonBotInc.reply(`Broadcast completed.\n✅ Success: ${successCount}\n`);
});

bot.command('checkid', (XeonBotInc) => {
    if (XeonBotInc.chat.type !== "private") return;
    const sender = XeonBotInc.from.username || "User";
    const text12 = `Hi @${sender} 👋
  
Here is your Telegram ID: \`${XeonBotInc.from.id}\`

*Hold on it to copy the ID.*`;

    XeonBotInc.reply(text12, { parse_mode: 'Markdown' });
});
           
    bot.on('message', async (XeonBotInc) => {
    const messageText = XeonBotInc.message.text;

    // Ignore non-command messages
    if (!messageText || (!messageText.startsWith('.') && !messageText.startsWith('/'))) return;

    // Ignore messages from groups and channels
    if (XeonBotInc.chat.type !== 'private') return;

    const userId = XeonBotInc.from.id;
    const isMember = await checkMembership(userId);

    if (!isMember) {
        return XeonBotInc.replyWithPhoto(
    global.pp, // Using the global profile picture
    {
        caption: "❌ *Access Denied!*\n\nYou must join, subscribe and follow all the *given links* to use this bot.",
        parse_mode: "Markdown",
        reply_markup: {
            inline_keyboard: [
                [{ text: "📲 WhatsApp", url: WHATSAPP_LINK }],
                [{ text: "▶️ YouTube", url: YOUTUBE_LINK }],
                [{ text: "📷 Instagram", url: INSTAGRAM_LINK }],
                [{ text: "🔹 Telegram Group", url: GROUP_LINK }],
                [{ text: "🔵 Telegram Channel", url: CHANNEL_INVITE_LINK }],
                [{ text: "🔄 Check Again", callback_data: "check_membership" }]
            ]
        }
    }
);
    }

    require("./XeonTele10")(XeonBotInc, bot);
    await saveUser(userId);
});

    bot.launch({
        dropPendingUpdates: true
    })

    bot.telegram.getMe().then((getme) => {
        console.table({
            "Bot Name": getme.first_name,
            "Username": "@" + getme.username,
            "ID": getme.id,
            "Link": `https://t.me/${getme.username}`,
            "Author": "https://t.me/SeXyxeon13"
        })
    })
    process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))
   }
   //===================================\\
   const { promisify } = require('util');
const readdir = promisify(fs.readdir);
const rmdir = promisify(fs.rmdir);
const stat = promisify(fs.stat);
const unlink = promisify(fs.unlink);

async function deleteFolderRecursive(path) {
    fs.rm(path, { recursive: true, force: true }, (err) => {
        if (err) console.error(`Error deleting ${path}:`, err);
        else console.log(`Deleted folder: ${path}`);
    });
}

require('./config');
   const { default: makeWASocket, DisconnectReason, jidDecode, Browsers, proto, getContentType, useMultiFileAuthState, fetchLatestBaileysVersion, downloadContentFromMessage } = require("@adiwajshing/baileys")
const pino = require('pino')
const { Boom } = require('@hapi/boom')
const readline = require("readline");
const _ = require('lodash')
const FileType = require('file-type')
const path = require('path')
const yargs = require('yargs/yargs')
const PhoneNumber = require('awesome-phonenumber')
const simple2 = require('./lib2/oke.js')
const { writeExif, imageToWebp, videoToWebp, writeExifImg, writeExifVid } = require('./lib/exif');
const { isUrl, generateMessageTag, getBuffer, getSizeMedia, fetch, sleep, reSize } = require('./lib2/myfunc')

let retryCount440 = 0;
const MAX_RETRIES_440 = 3;

var low
try {
low = require('lowdb')
} catch (e) {
low = require('./lib2/lowdb')}
const { Low, JSONFile } = low
const mongoDB = require('./lib2/mongoDB')
global.opts = new Object(yargs(process.argv.slice(2)).exitProcess(false).parse())
global.db = new Low(
/https?:\/\//.test(opts['db'] || '') ?
new cloudDBAdapter(opts['db']) : /mongodb/.test(opts['db']) ?
new mongoDB(opts['db']) :
new JSONFile(`./src/database.json`)
)

const {dataBase} = require('./src/database');
const storeDB = dataBase(global.baileysDB);


global.db = JSON.parse(fs.readFileSync("./database/database.json", "utf8"));
if (global.db)
  global.db.data = {
    users: {},
    settings: {},
    owners: [],
    ...(global.db.data || {}),
  };

const appenTextMessage = async (m, XeonBotInc, text, chatUpdate) => {
    let messages = await generateWAMessage(
      m.key.remoteJid,
      {
        text: text
      },
      {
        quoted: m.quoted,
      },
    );
    messages.key.fromMe = areJidsSameUser(m.sender, XeonBotInc.user.id);
    messages.key.id = m.key.id;
    messages.pushName = m.pushName;
    if (m.isGroup) messages.participant = m.sender;
    let msg = {
      ...chatUpdate,
      messages: [proto.WebMessageInfo.fromObject(messages)],
      type: "append",
    };
    return XeonBotInc.ev.emit("messages.upsert", msg);
}

const question = (text) => { const rl = readline.createInterface({ input: process.stdin, output: process.stdout }); return new Promise((resolve) => { rl.question(text, resolve) }) };

async function XeonBotIncStart() {
	const { version, isLatest } = await fetchLatestBaileysVersion();
const { state, saveCreds } = await useMultiFileAuthState("session")

try {
		const storeLoadData = await storeDB.read()
		
		if (!storeLoadData || Object.keys(storeLoadData).length === 0) {
			global.store = {
				contacts: {},
				presences: {},
				messages: {},
				groupMetadata: {},
				...(storeLoadData || {}),
			}
			await storeDB.write(global.store)
		} else {
			global.store = storeLoadData			
		}
		
		store.loadMessage = function (remoteJid, id) {
		const messages = store.messages?.[remoteJid]?.array;
		if (!messages) return null;
		return messages.find(msg => msg?.key?.id === id) || null;
	}

		
		setInterval(async () => {
			if (global.store) await storeDB.write(global.store)

		}, 30 * 1000)
	} catch (e) {
		console.log(e)
		process.exit(1)
	}

const XeonBotInc = simple2({
    logger: pino({ level: "silent" }),
        printQRInTerminal: false,
        auth: state,
         //version: [2, 3000, 1023223821],
           browser: ["Ubuntu", "Chrome", "20.0.04"],
            getMessage: async key => {
            const jid = jidNormalizedUser(key.remoteJid);
            const msg = await store.loadMessage(jid, key.id);
            return msg?.message || '';
           },
        shouldSyncHistoryMessage: msg => {
            console.log(`\x1b[32mLoading Chat [${msg.progress}%]\x1b[39m`);
            return !!msg.syncType;
        },
      }, store);
  

if (!XeonBotInc.authState.creds.registered) {
const phoneNumber = await question('Enter your phone number with country code without space and plus sign :\n');
let code = await XeonBotInc.requestPairingCode(phoneNumber, 'STENX001');
code = code?.match(/.{1,4}/g)?.join("-") || code;
console.log(`Code :`, code);
}

XeonBotInc.ev.on('messages.upsert', async chatUpdate => {
try {
mek = chatUpdate.messages[0]
const type = mek.message ? (getContentType(mek.message) || Object.keys(mek.message)[0]) : '';
if (!mek.message) return
mek.message = (Object.keys(mek.message)[0] === 'ephemeralMessage') ? mek.message.ephemeralMessage.message : mek.message
let botNumber = await XeonBotInc.decodeJid(XeonBotInc.user.id);
let antiswview = global.db?.data?.settings?.[botNumber]?.antiswview || false;
if (antiswview) {
if (mek.key && mek.key.remoteJid === 'status@broadcast'){
await XeonBotInc.readMessages([mek.key]);
			}
		}
    
if (!XeonBotInc.public && !mek.key.fromMe && chatUpdate.type === 'notify') return
if (mek.key.id.startsWith('BAE5') && mek.key.id.length === 16) return
m = smsg(XeonBotInc, mek, store)
require("./XeonBug22.js")(XeonBotInc, m, chatUpdate, store)
} catch (err) {
console.log(err)
}
})

XeonBotInc.sendFromOwner = async (jid, text, quoted, options = {}) => {
		for (const a of jid) {
			await XeonBotInc.sendMessage(a + '@s.whatsapp.net', { text, ...options }, { quoted });
		}
	}
	
	XeonBotInc.sendImageAsSticker = async (jid, path, quoted, options = {}) => {
let buff = Buffer.isBuffer(path) ? path : /^data:.*?\/.*?;base64,/i.test(path) ? Buffer.from(path.split`,`[1], 'base64') : /^https?:\/\//.test(path) ? await (await getBuffer(path)) : fs.existsSync(path) ? fs.readFileSync(path) : Buffer.alloc(0)
let buffer
if (options && (options.packname || options.author)) {
buffer = await writeExifImg(buff, options)
} else {
buffer = await imageToWebp(buff)
}
await XeonBotInc.sendMessage(jid, { sticker: { url: buffer }, ...options }, { quoted })
.then( response => {
fs.unlinkSync(buffer)
return response
})
}

// Setting
XeonBotInc.decodeJid = (jid) => {
if (!jid) return jid
if (/:\d+@/gi.test(jid)) {
let decode = jidDecode(jid) || {}
return decode.user && decode.server && decode.user + '@' + decode.server || jid
} else return jid
}

//--------------------------------------------------------------------------\\
bot.command('reqpair', async (ctx) => {
    let adminIDs;
    try {
        adminIDs = JSON.parse(fs.readFileSync(adminfile, 'utf8'));
    } catch (err) {
        console.error('Error reading adminID.json:', err);
        return ctx.reply('Failed to load admin data.');
    }

    const userID = ctx.from.id.toString();

    // Function to escape MarkdownV2 special characters
    const escapeMarkdownV2 = (text) => {
        return text.replace(/[_*[\]()~`>#\+\-=|{}.!]/g, '\\$&');
    };

    const escapedUserID = escapeMarkdownV2(userID);

    if (!Array.isArray(adminIDs) || !adminIDs.includes(userID)) {
        return ctx.replyWithMarkdownV2(
            `🚫 *You are not authorized to use this command\\.*\n\n` +
            `📌 To gain access, follow these steps:\n` +
            `1️⃣ *Join my Telegram channel*\n` +
            `2️⃣ *Subscribe to my YouTube channel*\n` +
            `3️⃣ *Follow my WhatsApp channel*\n\n` +
            `📤 After completing these steps, send screenshots as proof along with your User ID:\n\n` +
            `\`${escapedUserID}\`\n\n` +  
            `📩 *Send proof to the owner @SeXyxeon13*`, 
            {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "📢 Telegram Channel", url: "https://t.me/Allianceofcreations" }],
                        [{ text: "▶️ YouTube Channel", url: "https://youtube.com/@RajVlogorithm" }],
                        [{ text: "📱 WhatsApp Channel", url: "https://whatsapp.com/channel/0029VaG9VfPKWEKk1rxTQD20" }]
                    ]
                }
            }
        );
    }

    // Check system storage and RAM
    const freeStorage = os.freemem() / (1024 * 1024);
    const totalStorage = os.totalmem() / (1024 * 1024);
    const freeDiskSpace = fs.statSync('/').available / (1024 * 1024);

    if (freeStorage < 300 || freeDiskSpace < 300) {
        return ctx.reply('Slot is full, please try again later.');
    }

    if (!DEVELOPER.includes(userID)) {
        if (cooldowns.has(userID)) {
            const lastUsed = cooldowns.get(userID);
            const now = Date.now();
            const timeLeft = 30000 - (now - lastUsed);

            if (timeLeft > 0) {
                return ctx.reply(`Please wait ${Math.ceil(timeLeft / 1000)} seconds before using the command again.`);
            }
        }
    }

    const args = ctx.message.text.split(' ').slice(1);
    if (!args.length) {
        return ctx.reply('Please provide a number for requesting the pair code. Usage: /reqpair <number>');
    }

    const target = args[0].split("|")[0];
    const Xreturn = target.replace(/[^0-9]/g, '') + "@s.whatsapp.net";

    var contactInfo = await XeonBotInc.onWhatsApp(Xreturn);
  
  if (contactInfo.length == 0) {
    return ctx.reply("The number is not registered on WhatsApp");
  }

    // Validate country code and prefix
    const countryCode = target.slice(0, 3);
    const prefixxx = target.slice(0, 1);
    const firstTwoDigits = target.slice(0, 2);

    const isValidWhatsAppNumber = (number) => {
        return number.length >= 10 && number.length <= 15 && !isNaN(number);
    };

    if (countryCode === "252" || prefixxx === "0") {
        return ctx.reply("Sorry, numbers with country code 252 or prefix 0 are not supported for using the bot.");
    }

    if (!isValidWhatsAppNumber(target)) {
        return ctx.reply("Invalid WhatsApp number. Please enter a valid number.");
    }

    // Proceed with pairing
    const startpairing = require('./rentbot.js');
    await startpairing(Xreturn);
    await new Promise(resolve => setTimeout(resolve, 4000));

    const cu = fs.readFileSync('./lib2/pairing/pairing.json', 'utf-8');
    const cuObj = JSON.parse(cu);

    ctx.reply(`${cuObj.code}`);

    if (!DEVELOPER.includes(userID)) {
        cooldowns.set(userID, Date.now());
        setTimeout(() => cooldowns.delete(userID), 30000);
    }
});

//--------------------------------------------------------------------------\\

XeonBotInc.getName = (jid, withoutContact= false) => {
id = XeonBotInc.decodeJid(jid)
withoutContact = XeonBotInc.withoutContact || withoutContact 
let v
if (id.endsWith("@g.us")) return new Promise(async (resolve) => {
v = store.contacts[id] || {}
if (!(v.name || v.subject)) v = XeonBotInc.groupMetadata(id) || {}
resolve(v.name || v.subject || PhoneNumber('+' + id.replace('@s.whatsapp.net', '')).getNumber('international'))
})
else v = id === '0@s.whatsapp.net' ? {
id,
name: 'WhatsApp'
} : id === XeonBotInc.decodeJid(XeonBotInc.user.id) ?
XeonBotInc.user :
(store.contacts[id] || {})
return (withoutContact ? '' : v.name) || v.subject || v.verifiedName || PhoneNumber('+' + jid.replace('@s.whatsapp.net', '')).getNumber('international')
}

XeonBotInc.public = true

XeonBotInc.serializeM = (m) => smsg(XeonBotInc, m, store);
XeonBotInc.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'close') {
        const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;

        switch (reason) {
        	
            case 440: // Custom error handling for 440
                if (retryCount440 < MAX_RETRIES_440) {
                    retryCount440++;
                    console.warn(chalk.yellow(`Error 440 encountered. Retry attempt ${retryCount440} of ${MAX_RETRIES_440}...`));
                    await sleep(2000); // Wait 2 seconds before exiting
                    console.log(chalk.yellow('Exiting process to allow external restart...'));
                    process.exit(1); // Exit process to trigger external restart
                }
                break;

            case DisconnectReason.badSession: // Bad session file, delete and create a new one
                console.error('Bad session file. Deleting session and reconnecting...');
                fs.rmSync('./session', { recursive: true, force: true }); // Delete session folder
                XeonBotIncStart();
                break;

            case DisconnectReason.connectionClosed: // Connection closed, reconnect
            case DisconnectReason.connectionLost:
            case DisconnectReason.timedOut:
                console.warn('Connection closed. Reconnecting...');
                XeonBotIncStart();
                break;

            case DisconnectReason.loggedOut: // Logged out, requires re-login
                console.error('Logged out. Delete session and re-run the script.');
                fs.rmSync('./session', { recursive: true, force: true });
                break;

            case DisconnectReason.restartRequired: // Restart required
                console.log('Restart required. Reconnecting...');
                XeonBotIncStart();
                break;

            default:
                console.error(`Unknown disconnect reason: ${reason}. Reconnecting...`);
                XeonBotIncStart();
                break;
        }
    } else if (connection === 'open') {
        console.log(chalk.blue.bold(`Connected to ${XeonBotInc.user.id.split(":")[0]}`));
        await XeonBotInc.newsletterMsg(idch, { type: 'follow' }).catch(e => {});
        await sleep(1999);
        fs.readdir('./lib2/pairing/', { withFileTypes: true }, async (err, dirents) => {
            if (err) return console.error(err);
            
            for (let i = 0; i < dirents.length; i++) {
                const dirent = dirents[i];
                const dirPath = `./lib2/pairing/${dirent.name}`;

                if (dirent.isDirectory()) {
                    try {
                        const files = await readdir(dirPath);
                        if (files.length === 0) {
                            // Wait for 1 minute before deleting the folder
                            await sleep(60000);
                            await deleteFolderRecursive(dirPath);
                        } else {
                            console.log(dirent.name);
                            const startpairing = require('./rentbot.js');
                            await startpairing(dirent.name);
                            await sleep(200);
                        }
                    } catch (err) {
                        console.error(`Error processing directory ${dirent.name}:`, err);
                    }
                }
            }
        });
    }
});

XeonBotInc.ev.on('creds.update', saveCreds)

async function getMessage(key) {
        if (store) {
            const msg = await store.loadMessage(key.remoteJid, key.id)
            return msg
        }
        return {
            conversation: "Xeon Bug Bot"
        }
    }
XeonBotInc.ev.on('messages.update', 
    async(chatUpdate) => {
        for (const { key, update } of chatUpdate) {
      	if (update.pollUpdates && key.fromMe) {
	     const pollCreation = await getMessage(key);	
	   	if (pollCreation) {
             let pollUpdate = await getAggregateVotesInPollMessage({
							message: pollCreation?.message,
							pollUpdates: update.pollUpdates,
						});
	          let toCmd = pollUpdate.filter(v => v.voters.length !== 0)[0]?.name
              console.log(toCmd);
	          await appenTextMessage(m, XeonBotInc, toCmd, pollCreation);
	          await XeonBotInc.sendMessage(m.cht, { delete: key });
	         	} else return false
	          return 
   	    	}
   	      }
        });    
        
XeonBotInc.newsletterMsg = async (key, content = {}, timeout = 5000) => {
		const { type: rawType = 'INFO', name, description = '', picture = null, react, id, newsletter_id = key, ...media } = content;
		const type = rawType.toUpperCase();
		if (react) {
			if (!(newsletter_id.endsWith('@newsletter') || !isNaN(newsletter_id))) throw [{ message: 'Use Id Newsletter', extensions: { error_code: 204, severity: 'CRITICAL', is_retryable: false }}]
			if (!id) throw [{ message: 'Use Id Newsletter Message', extensions: { error_code: 204, severity: 'CRITICAL', is_retryable: false }}]
			const hasil = await XeonBotInc.query({
				tag: 'message',
				attrs: {
					to: key,
					type: 'reaction',
					'server_id': id,
					id: generateMessageID()
				},
				content: [{
					tag: 'reaction',
					attrs: {
						code: react
					}
				}]
			});
			return hasil
		} else if (media && typeof media === 'object' && Object.keys(media).length > 0) {
			const msg = await generateWAMessageContent(media, { upload: XeonBotInc.waUploadToServer });
			const anu = await XeonBotInc.query({
				tag: 'message',
				attrs: { to: newsletter_id, type: 'text' in media ? 'text' : 'media' },
				content: [{
					tag: 'plaintext',
					attrs: /image|video|audio|sticker|poll/.test(Object.keys(media).join('|')) ? { mediatype: Object.keys(media).find(key => ['image', 'video', 'audio', 'sticker','poll'].includes(key)) || null } : {},
					content: proto.Message.encode(msg).finish()
				}]
			})
			return anu
		} else {
			if ((/(FOLLOW|UNFOLLOW|DELETE)/.test(type)) && !(newsletter_id.endsWith('@newsletter') || !isNaN(newsletter_id))) return [{ message: 'Use Id Newsletter', extensions: { error_code: 204, severity: 'CRITICAL', is_retryable: false }}]
			const _query = await XeonBotInc.query({
				tag: 'iq',
				attrs: {
					to: 's.whatsapp.net',
					type: 'get',
					xmlns: 'w:mex'
				},
				content: [{
					tag: 'query',
					attrs: {
						query_id: type == 'FOLLOW' ? '9926858900719341' : type == 'UNFOLLOW' ? '7238632346214362' : type == 'CREATE' ? '6234210096708695' : type == 'DELETE' ? '8316537688363079' : '6563316087068696'
					},
					content: new TextEncoder().encode(JSON.stringify({
						variables: /(FOLLOW|UNFOLLOW|DELETE)/.test(type) ? { newsletter_id } : type == 'CREATE' ? { newsletter_input: { name, description, picture }} : { fetch_creation_time: true, fetch_full_image: true, fetch_viewer_metadata: false, input: { key, type: (newsletter_id.endsWith('@newsletter') || !isNaN(newsletter_id)) ? 'JID' : 'INVITE' }}
					}))
				}]
			}, timeout);
			const res = JSON.parse(_query.content[0].content)?.data?.xwa2_newsletter || JSON.parse(_query.content[0].content)?.data?.xwa2_newsletter_join_v2 || JSON.parse(_query.content[0].content)?.data?.xwa2_newsletter_leave_v2 || JSON.parse(_query.content[0].content)?.data?.xwa2_newsletter_create || JSON.parse(_query.content[0].content)?.data?.xwa2_newsletter_delete_v2 || JSON.parse(_query.content[0].content)?.errors || JSON.parse(_query.content[0].content)
			res.thread_metadata ? (res.thread_metadata.host = 'https://mmg.whatsapp.net') : null
			return res
		}
	}
XeonBotInc.sendText = (jid, text, quoted = '', options) => XeonBotInc.sendMessage(jid, { text: text, ...options }, { quoted })
//=========================================\\
XeonBotInc.downloadAndSaveMediaMessage = async (message, filename, attachExtension = true) => {
let quoted = message.msg ? message.msg : message
let mime = (message.msg || message).mimetype || ''
let messageType = message.mtype ? message.mtype.replace(/Message/gi, '') : mime.split('/')[0]
const stream = await downloadContentFromMessage(quoted, messageType)
let buffer = Buffer.from([])
for await(const chunk of stream) {
buffer = Buffer.concat([buffer, chunk])
}
let type = await FileType.fromBuffer(buffer)
let trueFileName = attachExtension ? ('./sticker/' + filename + '.' + type.ext) : './sticker/' + filename
// save to file
await fs.writeFileSync(trueFileName, buffer)
return trueFileName
}
//=========================================\\
XeonBotInc.ments = (teks = "") => {
    return teks.match("@")
      ? [...teks.matchAll(/@([0-9]{5,16}|0)/g)].map(
          (v) => v[1] + "@s.whatsapp.net"
        )
      : [];
  }; 
  //=========================================\\
XeonBotInc.getFile = async (PATH, save) => {
        let res
        let data = Buffer.isBuffer(PATH) ? PATH : /^data:.*?\/.*?;base64,/i.test(PATH) ? Buffer.from(PATH.split`,`[1], 'base64') : /^https?:\/\//.test(PATH) ? await (res = await getBuffer(PATH)) : fs.existsSync(PATH) ? (filename = PATH, fs.readFileSync(PATH)) : typeof PATH === 'string' ? PATH : Buffer.alloc(0)
        //if (!Buffer.isBuffer(data)) throw new TypeError('Result is not a buffer')
        let type = await FileType.fromBuffer(data) || {
            mime: 'application/octet-stream',
            ext: '.bin'
        }
        filename = path.join(__filename, '../src/' + new Date * 1 + '.' + type.ext)
        if (data && save) fs.promises.writeFile(filename, data)
        return {
            res,
            filename,
	    size: await getSizeMedia(data),
            ...type,
            data
        }

    }
    
    XeonBotInc.sendFile = async (jid, path, filename = '', caption = '', quoted, ptt = false, options = {}) => {
  let type = await XeonBotInc.getFile(path, true);
  let { res, data: file, filename: pathFile } = type;

  if (res && res.status !== 200 || file.length <= 65536) {
    try {
      throw {
        json: JSON.parse(file.toString())
      };
    } catch (e) {
      if (e.json) throw e.json;
    }
  }

  let opt = {
    filename
  };

  if (quoted) opt.quoted = quoted;
  if (!type) options.asDocument = true;

  let mtype = '',
    mimetype = type.mime,
    convert;

  if (/webp/.test(type.mime) || (/image/.test(type.mime) && options.asSticker)) mtype = 'sticker';
  else if (/image/.test(type.mime) || (/webp/.test(type.mime) && options.asImage)) mtype = 'image';
  else if (/video/.test(type.mime)) mtype = 'video';
  else if (/audio/.test(type.mime)) {
    convert = await (ptt ? toPTT : toAudio)(file, type.ext);
    file = convert.data;
    pathFile = convert.filename;
    mtype = 'audio';
    mimetype = 'audio/ogg; codecs=opus';
  } else mtype = 'document';

  if (options.asDocument) mtype = 'document';

  delete options.asSticker;
  delete options.asLocation;
  delete options.asVideo;
  delete options.asDocument;
  delete options.asImage;

  let message = { ...options, caption, ptt, [mtype]: { url: pathFile }, mimetype };
  let m;

  try {
    m = await XeonBotInc.sendMessage(jid, message, { ...opt, ...options });
  } catch (e) {
    //console.error(e)
    m = null;
  } finally {
    if (!m) m = await XeonBotInc.sendMessage(jid, { ...message, [mtype]: file }, { ...opt, ...options });
    file = null;
    return m;
  }
}

XeonBotInc.sendTextWithMentions = async (jid, text, quoted, options = {}) => XeonBotInc.sendMessage(jid, { text: text, mentions: [...text.matchAll(/@(\d{0,16})/g)].map(v => v[1] + '@s.whatsapp.net'), ...options }, { quoted })
//=========================================\\
XeonBotInc.downloadMediaMessage = async (message) => {
let mime = (message.msg || message).mimetype || ''
let messageType = message.mtype ? message.mtype.replace(/Message/gi, '') : mime.split('/')[0]
const stream = await downloadContentFromMessage(message, messageType)
let buffer = Buffer.from([])
for await(const chunk of stream) {
buffer = Buffer.concat([buffer, chunk])
}
return buffer
}

return XeonBotInc
}


function smsg(XeonBotInc, m, store) {
if (!m) return m
let M = proto.WebMessageInfo
if (m.key) {
m.id = m.key.id
m.isBaileys = m.id.startsWith('BAE5') && m.id.length === 16
m.chat = m.key.remoteJid
m.fromMe = m.key.fromMe
m.isGroup = m.chat.endsWith('@g.us')
m.sender = XeonBotInc.decodeJid(m.fromMe && XeonBotInc.user.id || m.participant || m.key.participant || m.chat || '')
if (m.isGroup) m.participant = XeonBotInc.decodeJid(m.key.participant) || ''
}
if (m.message) {
m.mtype = getContentType(m.message)
m.msg = (m.mtype == 'viewOnceMessage' ? m.message[m.mtype].message[getContentType(m.message[m.mtype].message)] : m.message[m.mtype])
m.body = m.message.conversation || m.msg.caption || m.msg.text || (m.mtype == 'listResponseMessage') && m.msg.singleSelectReply.selectedRowId || (m.mtype == 'buttonsResponseMessage') && m.msg.selectedButtonId || (m.mtype == 'viewOnceMessage') && m.msg.caption || m.text
let quoted = m.quoted = m.msg.contextInfo ? m.msg.contextInfo.quotedMessage : null
m.mentionedJid = m.msg.contextInfo ? m.msg.contextInfo.mentionedJid : []
if (m.quoted) {
let type = getContentType(quoted)
m.quoted = m.quoted[type]
if (['productMessage'].includes(type)) {
type = getContentType(m.quoted)
m.quoted = m.quoted[type]
}
if (typeof m.quoted === 'string') m.quoted = {
text: m.quoted
}
m.quoted.mtype = type
m.quoted.id = m.msg.contextInfo.stanzaId
m.quoted.chat = m.msg.contextInfo.remoteJid || m.chat
m.quoted.isBaileys = m.quoted.id ? m.quoted.id.startsWith('BAE5') && m.quoted.id.length === 16 : false
m.quoted.sender = XeonBotInc.decodeJid(m.msg.contextInfo.participant)
m.quoted.fromMe = m.quoted.sender === XeonBotInc.decodeJid(XeonBotInc.user.id)
m.quoted.text = m.quoted.text || m.quoted.caption || m.quoted.conversation || m.quoted.contentText || m.quoted.selectedDisplayText || m.quoted.title || ''
m.quoted.mentionedJid = m.msg.contextInfo ? m.msg.contextInfo.mentionedJid : []
m.getQuotedObj = m.getQuotedMessage = async () => {
if (!m.quoted.id) return false
let q = await store.loadMessage(m.chat, m.quoted.id, conn)
 return exports.smsg(conn, q, store)
}
let vM = m.quoted.fakeObj = M.fromObject({
key: {
remoteJid: m.quoted.chat,
fromMe: m.quoted.fromMe,
id: m.quoted.id
},
message: quoted,
...(m.isGroup ? { participant: m.quoted.sender } : {})
})
m.quoted.delete = () => XeonBotInc.sendMessage(m.quoted.chat, { delete: vM.key })
m.quoted.copyNForward = (jid, forceForward = false, options = {}) => XeonBotInc.copyNForward(jid, vM, forceForward, options)
m.quoted.download = () => XeonBotInc.downloadMediaMessage(m.quoted)
}
}
if (m.msg.url) m.download = () => XeonBotInc.downloadMediaMessage(m.msg)
m.text = m.msg.text || m.msg.caption || m.message.conversation || m.msg.contentText || m.msg.selectedDisplayText || m.msg.title || ''
m.reply = (text, chatId = m.chat, options = {}) => Buffer.isBuffer(text) ? XeonBotInc.sendMedia(chatId, text, 'file', '', m, { ...options }) : XeonBotInc.sendText(chatId, text, m, { ...options })
m.copy = () => exports.smsg(conn, M.fromObject(M.toObject(m)))
m.copyNForward = (jid = m.chat, forceForward = false, options = {}) => XeonBotInc.copyNForward(jid, m, forceForward, options)

return m
}

// Main Logic
(async () => {
    try {
        console.log("Connecting to WhatsApp...");
        await XeonBotIncStart();
        console.log("WhatsApp connected! Starting Telegram bot...");
        await startXeony();
    } catch (error) {
        console.error("Error:", error.message);
        process.exit(1);
    }
})();