const { mk } = require("../../Database/dataschema.js");

module.exports = {
    name: "add",
    alias: ["invite", "addmember"],
    desc: "Add a user to the group",
    category: "Group",
    usage: "add <number>",
    react: "➕",

    start: async (Miku, m, { text, args, prefix, groupAdmin, botNumber, pushName }) => {

        // Manual admin check (because core sometimes misdetects bot admin status)
        const amIAdmin = groupAdmin.includes(botNumber);

        if (!amIAdmin) {
            return m.reply(`❌ Aww... I’m not a group admin yet!  
Please make me an admin first so I can add new members 🥺💖`);
        }

        // Extracting target number
        let userToAdd = "";
        
        if (m.quoted) {
            userToAdd = m.quoted.sender;
        } else {
            if (!text) {
                return m.reply(`⚠️ Please provide a phone number!  
Example: *${prefix}add 919876543210* 💕`);
            }

            let cleanNumber = text.replace(/[^0-9]/g, '');
            if (cleanNumber.length < 5) {
                return m.reply(`⚠️ This number doesn't look valid, cutie! 🧐`);
            }

            userToAdd = cleanNumber + "@s.whatsapp.net";
        }

        try {
            // Try adding user
            const response = await Miku.groupParticipantsUpdate(m.from, [userToAdd], "add");

            // Privacy restriction (403)
            if (response[0].status === '403') {

                const groupLink = await Miku.groupInviteCode(m.from);
                const inviteLink = `https://chat.whatsapp.com/${groupLink}`;
                const groupMetadata = await Miku.groupMetadata(m.from);

                let inviteMsg = `👋 Hey there!  
*${pushName}* wants to add you to **"${groupMetadata.subject}"** 💬 

But your privacy settings are blocking direct add.  
So here’s your special invite link ✨👇  
🔗 ${inviteLink}

Hope to see you soon! 😊💖`;

                await Miku.sendMessage(userToAdd, {
                    text: inviteMsg,
                    image: {url : botImage6} 
                });

                return m.reply(`⚠️ This user has *privacy settings* enabled.  
I have sent them the group invite link in DM 💌✨`);
            }

            // Successfully added
            else if (response[0].status === '200') {
                return m.reply(`✅ Yay! The user has been added successfully 🎉🥳`);
            }

            // Other errors
            else {
                return m.reply(`❌ Oops! I couldn’t add this number.  
Maybe they are not on WhatsApp or they blocked the group 😢`);
            }

        } catch (err) {
            console.error(err);
            return m.reply(`❌ Uh-oh! Something went wrong while adding the user 😭`);
        }
    }
};
