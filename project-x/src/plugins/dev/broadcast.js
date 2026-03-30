import { plugin } from '../../utils/plugin.js'

plugin(
    {
        name: 'broadcast',
        aliases: ['bc', 'bcast'],
        category: 'dev',
        isDev: true,
        description: {
            content: 'Broadcast a message to all groups the bot is in. Bot mod/admin only.',
            usage: '<message>',
            example: 'Server will restart in 5 minutes!'
        }
    },
    async (client, M, { text }) => {
        if (!text?.trim()) {
            return M.reply(
                `❌ *Please provide a message to broadcast.*\n\n` +
                    `📝 *Usage:* ${global.config.prefix}broadcast <message>\n` +
                    `💡 *Example:* ${global.config.prefix}broadcast Hello everyone!`
            )
        }

        // Fetch all groups the bot is currently in
        let allChats
        try {
            allChats = await client.groupFetchAllParticipating()
        } catch (err) {
            console.error('[BROADCAST] Failed to fetch groups:', err)
            return M.reply('❌ Failed to fetch group list. Please try again.')
        }

        const groupIds = Object.keys(allChats)

        if (groupIds.length === 0) {
            return M.reply('⚠️ The bot is not in any groups.')
        }

        // Build the broadcast message
        const broadcastMsg =
            `📢 *BROADCAST MESSAGE*\n` +
            `━━━━━━━━━━━━━━━━━━\n\n` +
            `${text.trim()}\n\n` +
            `━━━━━━━━━━━━━━━━━━\n` +
            `👤 *From:* ${M.sender.name}\n` +
            `🕐 *Time:* ${new Date().toLocaleString('en-GB', { timeZone: 'Asia/Jakarta' })}`

        // Send status update to the sender first
        await M.reply(`📤 *Starting broadcast...*\n` + `📋 *Total groups:* ${groupIds.length}\n\n` + `_Please wait..._`)

        let success = 0
        let failed = 0

        for (const jid of groupIds) {
            try {
                await client.sendMessage(jid, { text: broadcastMsg })
                success++
                // Small delay to avoid getting rate-limited / banned
                await new Promise((r) => setTimeout(r, 500))
            } catch (err) {
                console.error(`[BROADCAST] Failed to send to ${jid}:`, err.message)
                failed++
            }
        }

        return M.reply(
            `✅ *Broadcast Complete!*\n\n` +
                `📊 *Results:*\n` +
                `├ ✅ Sent: *${success}* group(s)\n` +
                `└ ❌ Failed: *${failed}* group(s)\n\n` +
                `📋 *Total:* ${groupIds.length} group(s)`
        )
    }
)
