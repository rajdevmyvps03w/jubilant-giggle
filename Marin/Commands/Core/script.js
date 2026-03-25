const axios = require('axios')
const fs = require('fs')

module.exports = {
    name: "script",
    alias: ["repo","sc","sourcecode"],
    desc: "Say hello to bot.",
    react: "🍁",
    category: "Core",
    start: async(Miku, m,{pushName,prefix}) => {
        let picURL = fs.readFileSync('./Page/BG.jpg')
        let repoInfo = await axios.get('https://api.github.com/repos/Sten-X/Marin-Kitagawa-MD')
        let repo = repoInfo.data
        let txt = `      🧣 *${botName}'s Script* 🧣\n\n*🎀 Total Forks:* ${repo.forks_count}\n*✧ Total Stars:* ${repo.stargazers_count}\n*📜 License:* ${repo.license.name}\n*📁 Repo Size:* ${(repo.size/1024).toFixed(2)} MB\n*📅 Last Updated:* ${repo.updated_at}\n\n*🔗 Repo Link:* ${repo.html_url}\n\n❝ Dont forget to give a Star ⭐ to the repo. It's made with restless harkwork by *Team Marin*. ❞\n\n*©️ Team Marin- 2023*`
        await Miku.sendMessage(m.from,{image:picURL, caption:txt},{quoted:m});
    }
}

