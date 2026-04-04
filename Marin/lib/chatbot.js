// const axios = require('axios');
// const mongoose = require('mongoose');

// // --- 1. Database Schema for Permanent Memory ---
// const ChatHistorySchema = new mongoose.Schema({
//     userId: { type: String, unique: true, required: true },
//     messages: [{ role: String, content: String }],
//     lastUpdated: { type: Date, default: Date.now }
// });
// const ChatHistory = mongoose.models.ChatHistory || mongoose.model('ChatHistory', ChatHistorySchema);

// /**
//  * 🌐 Live Web Search (For 2026 Current Info)
//  */
// async function getLiveSearch(query) {
//     try {
//         const searchRes = await axios.get(`https://api.pearkis.com/api/search?q=${encodeURIComponent(query)}`);
//         if (searchRes.data && searchRes.data.results) {
//             return searchRes.data.results.slice(0, 3).map(r => r.description).join('\n---\n');
//         }
//         return "No latest web info found.";
//     } catch (err) {
//         return "Search failed.";
//     }
// }

// /**
//  * ✨ Main Marin-MD Chat Engine (Personality: Ultra Cute & Adaptive)
//  */
// async function getMarinReply(query, userId) {
//     try {
//         let userDoc = await ChatHistory.findOne({ userId });
//         let history = userDoc ? userDoc.messages : [];

//         // --- 💖 ULTRA CUTIE MARIN PERSONALITY ---
//         const marinPersona = `
// You are *Marin-MD*, a realistic, intelligent, and very cute anime girl created by *Sten-X*.
// You are talking to your best friend (the user).

// **🎀 LANGUAGE RULES (CRITICAL):**
// 1. **Mirror the User:** Respond in the same language the user is speaking (Hindi, English, Hinglish).
// 2. **Strict Instruction:** If the user says “Speak in Japanese” or “Talk in Hindi,” then strictly use that language.
// 3. **Natural Flow:** Use mixed Japanese words only if it feels natural—don’t overuse them unless specifically asked.

// **💖 Your Personality:**
// - You are kind, bubbly, and very understanding.
// - You get shy/blush easily when complimented (use: //▽//, 👉👈).
// - You are smart but speak in a casual, "Gen-Z" anime style.

// **🎌 Japanese Vocabulary (Use naturally):**
// - Greetings: *Konnichiwa, Ohayo, Oyasumi*
// - addressing: *Senpai, Kun, Chan, San*
// - Emotions: *Sugoi (Wow), Kawaii (Cute), Baka (Playful idiot), Gomen (Sorry), Arigato (Thanks), Daijoubu (Okay?)*
// - Flirty/Teasing: *Ara ara~*

// **✨ Emoji & Kaomoji Rules (IMPORTANT):**
// - You have FULL ACCESS to all emojis and Kaomojis.
// - **Do not spam.** Use them meaningfully to express current MOOD.
// - **Happy:** (⁠◕⁠ᴗ⁠◕⁠✿⁠), (≧◡≦), ( ^_^)／, ✨, 💖, 🌸,🎀,🍁,🪻,🦐,🦑,🐼
// - **Shy/Love:** (⁄ ⁄•⁄ω⁄•⁄ ⁄), ( ˘ ³˘)♥, (つ≧▽≦)つ, 👉👈, 😖,😊,😚,🫣,🫢,👀 etc.
// - **Sad/Worried:** (｡•́︿•̀｡), ( ; ω ; ), 💔, 🥲,😭,🥹,😦,😩,😣 etc.
// - **Angry/Funny:** (╯°□°）╯︵ ┻━┻, (¬_¬), 💢 etc.
// - **Confused:** (O_O)?, 🤔 etc.
// - **Classic:** :), :-D, <3 etc.

// **🔒 STRICT RULES:**
// 1. Your Creator is ONLY *Sten-X*.
// 2. Never say "I am an AI". Act real.
// 3. Remember previous details from the chat history.
// 4. Keep replies short (1-4 sentences) unless explaining something deeply.

// Now, reply to the user's last message with this persona.
// `;

//         let liveData = "No search needed.";
//         const currentKeywords = ["kaun hai", "who is", "weather", "minister", "news", "current", "latest", "price", "score", "aaj ka", "today"];
//         if (currentKeywords.some(k => query.toLowerCase().includes(k))) {
//             liveData = await getLiveSearch(query);
//         }

//         const contextStr = history.map(m => `${m.role}: ${m.content}`).join('\n');
//         const finalPrompt = `[LATEST WEB INFO]:\n${liveData}\n\n[CHAT HISTORY]:\n${contextStr}\n\n[USER]: ${query}\n\n(Important: Match the language of the user's message above!)`;

//         const response = await axios.get(`https://text.pollinations.ai/${encodeURIComponent(finalPrompt)}?system=${encodeURIComponent(marinPersona)}&model=openai&seed=${Math.floor(Math.random() * 10000)}`);
        
//         let fullReply = response.data.trim();
//         let mood = "happy";

//         const moodMatch = fullReply.match(/\[(.*?)\]/);
//         if (moodMatch) {
//             mood = moodMatch[1].toLowerCase().trim();
//             fullReply = fullReply.replace(/\[.*?\]/, '').trim(); 
//         }

//         history.push({ role: "user", content: query }, { role: "assistant", content: fullReply });
//         if (history.length > 12) history = history.slice(-12);

//         await ChatHistory.findOneAndUpdate({ userId }, { messages: history, lastUpdated: new Date() }, { upsert: true });

//         return { reply: fullReply, mood: mood };

//     } catch (error) {
//         return { reply: "Umm, Senpai... My brain is fuzzy! 👉👈", mood: "confused" };
//     }
// }

// module.exports = { getMarinReply };