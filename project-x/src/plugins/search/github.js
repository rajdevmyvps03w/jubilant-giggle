import { plugin } from '../../utils/plugin.js'
import { fetch, getBuffer } from '../../functions/helpler.js'

plugin(
    {
        name: 'github',
        aliases: ['gh'],
        category: 'search',
        description: {
            content: 'Fetch public information of a GitHub user.',
            usage: '<github_username>',
            example: 'torvalds'
        }
    },
    async (_, M, { text }) => {
        /* ---------- SAFETY: username required ---------- */
        if (!text) {
            return M.reply(`❌ Provide a GitHub username.\nExample: ${global.config.prefix}github torvalds`)
        }

        const username = text.trim()
        let user

        try {
            user = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}`)
        } catch {
            return M.reply('❌ Failed to reach GitHub API. Try again later.')
        }
        if (!user?.login) {
            return M.reply('❌ GitHub user not found.')
        }
        const message =
            `🐙 *GitHub User Info*\n\n` +
            `👤 *Username:* ${user.login}\n\n` +
            `📝 *Name:* ${user.name || 'Not available'}\n` +
            `📖 *Bio:* ${user.bio || 'Not available'}\n\n` +
            `👥 *Followers:* ${user.followers}\n\n` +
            `➡️ *Following:* ${user.following}\n\n` +
            `📦 *Public Repos:* ${user.public_repos}\n\n` +
            `🗂 *Public Gists:* ${user.public_gists}\n\n` +
            `📍 *Location:* ${user.location || 'Not available'}\n\n` +
            `🏢 *Company:* ${user.company || 'Not available'}\n\n` +
            `🌐 *Website:* ${user.blog || 'Not available'}`

        /* ---------- AVATAR BUFFER ---------- */
        let avatar = null
        try {
            avatar = await getBuffer(user.avatar_url)
        } catch {}

        /* ---------- RESPONSE ---------- */
        if (avatar) {
            return M.reply(avatar, 'image', null, message)
        }

        return M.reply(message)
    }
)
