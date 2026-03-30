import { plugin } from '../../utils/plugin.js'
import { addSupportGroup } from '../../database/db.js'

const VALID_CATEGORIES = ['economy', 'cards', 'common']

plugin(
    {
        name: 'addsupportgroup',
        aliases: ['addsupport', 'addsg'],
        category: 'dev',
        isDev: true,
        isGroup: true,
        description: {
            content: 'Register the current group as a support group. Run this command inside the group.',
            usage: '<category> <label>',
            example: 'economy Economy Support'
        }
    },
    async (client, M, { text }) => {
        try {
            const prefix = global.config.prefix

            if (!text) {
                return M.reply(
                    `❌ *Usage:* ${prefix}addsupportgroup <category> <label>\n\n` +
                        `📋 *Valid categories:* ${VALID_CATEGORIES.join(', ')}\n\n` +
                        `📌 *Example:*\n` +
                        `${prefix}addsupportgroup economy Economy Support\n\n` +
                        `_Run this command inside the group you want to register._`
                )
            }

            const parts = text.trim().split(/\s+/)
            const category = parts[0]?.toLowerCase()
            const label = parts.slice(1).join(' ').trim()

            if (!VALID_CATEGORIES.includes(category)) {
                return M.reply(`❌ Invalid category. Must be one of: *${VALID_CATEGORIES.join(', ')}*`)
            }

            if (!label) {
                return M.reply(
                    `❌ Please provide a display label.\n\nExample: *${prefix}addsupportgroup economy Economy Support*`
                )
            }

            const jid = M.from

            // Check bot is admin — required to fetch the invite link
            if (!M.isBotAdmin) {
                return M.reply(
                    `❌ *Bot is not an admin in this group.*\n\n` +
                        `Make the bot an admin first so it can generate the invite link.`
                )
            }

            // Fetch the current invite link via the bot
            const code = await client.groupInviteCode(jid).catch(() => null)
            if (!code) {
                return M.reply('❌ Failed to fetch the group invite link. Make sure the bot is an admin.')
            }

            const invite = `https://chat.whatsapp.com/${code}`

            const success = await addSupportGroup({ jid, label, invite, category })

            if (!success) {
                return M.reply(
                    `⚠️ This group is already registered as a support group.\n\n` +
                        `Use *${prefix}listsupportgroups* to see all registered groups.`
                )
            }

            return M.reply(
                `✅ *Support Group Registered!*\n\n` +
                    `🏷️ *Label:* ${label}\n` +
                    `🗂️ *Category:* ${category}\n` +
                    `🔗 *Invite:* ${invite}\n` +
                    `🆔 *JID:* ${jid}\n\n` +
                    `_Invite link was auto-fetched. It will refresh automatically when someone uses ${prefix}support._`
            )
        } catch (err) {
            console.error('[ADDSUPPORTGROUP ERROR]', err)
            return M.reply('❌ An error occurred while registering the support group.')
        }
    }
)
