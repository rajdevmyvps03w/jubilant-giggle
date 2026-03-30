import { plugin } from '../../utils/plugin.js'
import { findUser, editUser } from '../../database/db.js'

// Blacklisted fields that should never be directly edited (security)
const BLACKLISTED_FIELDS = ['jid', 'lid', '_id', '__v']

plugin(
    {
        name: 'editdb',
        aliases: ['edituserdb', 'setdb'],
        category: 'dev',
        isDev: true,
        description: {
            content:
                "Dev: Edit a specific field in a user's database record.\n" +
                'Supports dot notation. Value is parsed as JSON if possible, otherwise treated as string.\n' +
                "Use --view to inspect a user's data first.",
            usage: '<@user> <field> <value> [--view]',
            example: '@user wallet 50000  |  @user ban.status false  |  --view @user exp'
        }
    },
    async (_, M, { text, flags }) => {
        try {
            // 1. Resolve target user
            let targetJid = M.mentioned?.[0] || (M.isQuoted ? M.quotedMessage?.participant : null)
            if (!targetJid) {
                return M.reply('❌ Please mention or reply to the user whose database you want to edit.')
            }

            const cleanText = text.replace(/@\d+/g, '').trim()

            // 2. --view mode: inspect user data
            if ('view' in flags) {
                const fieldPath = cleanText || null
                const userData = await findUser(targetJid, fieldPath || 'name wallet exp ban cards.deck bank')

                if (!userData) {
                    return M.reply('❌ User not found in the database.')
                }

                let displayData
                if (fieldPath) {
                    // Navigate nested path
                    const parts = fieldPath.split('.')
                    let val = userData
                    for (const part of parts) {
                        val = val?.[part]
                        if (val === undefined) break
                    }
                    displayData = val
                } else {
                    displayData = {
                        name: userData.name,
                        jid: userData.jid,
                        exp: userData.exp,
                        wallet: userData.wallet,
                        bankValue: userData.bank?.value,
                        bankCapacity: userData.bank?.capacity,
                        ban: userData.ban,
                        deckSize: userData.cards?.deck?.length ?? 0
                    }
                }

                const output = JSON.stringify(displayData, null, 2)
                const MAX = 3000
                const display = output.length > MAX ? output.slice(0, MAX) + '\n...[truncated]' : output

                return M.reply(
                    `🔍 *DB VIEW: ${userData.name}*\n` +
                        (fieldPath ? `📌 *Field:* ${fieldPath}\n` : '') +
                        `\n\`\`\`\n${display}\n\`\`\``
                )
            }

            // 3. Edit mode: parse "field value"
            const spaceIdx = cleanText.indexOf(' ')
            if (spaceIdx === -1) {
                return M.reply(
                    `❌ Please provide both a field and a value.\n` +
                        `Usage: *${global.config.prefix}editdb @user <field> <value>*\n` +
                        `Example: *${global.config.prefix}editdb @user wallet 50000*\n\n` +
                        `To view user data first: *${global.config.prefix}editdb --view @user*`
                )
            }

            const field = cleanText.slice(0, spaceIdx).trim()
            const rawValue = cleanText.slice(spaceIdx + 1).trim()

            // 4. Security: block blacklisted fields
            const rootField = field.split('.')[0]
            if (BLACKLISTED_FIELDS.includes(rootField)) {
                return M.reply(`🔒 Field *${rootField}* is protected and cannot be edited directly.`)
            }

            // 5. Parse value (JSON or string)
            let parsedValue
            try {
                parsedValue = JSON.parse(rawValue)
            } catch {
                // Treat as plain string
                parsedValue = rawValue
            }

            // 6. Check user exists
            const targetUser = await findUser(targetJid, 'name')
            if (!targetUser) {
                return M.reply('❌ That user is not registered in the bot.')
            }

            // 7. Apply the update
            const updateObj = { [field]: parsedValue }
            const success = await editUser(targetJid, updateObj)

            if (!success) {
                return M.reply(`❌ Failed to update field *${field}*. Double-check the field path and value.`)
            }

            return M.reply(
                `✅ *DATABASE UPDATED*\n\n` +
                    `👤 *User:* ${targetUser.name}\n` +
                    `🆔 *JID:* ${targetJid.split('@')[0]}\n` +
                    `📌 *Field:* \`${field}\`\n` +
                    `📝 *New Value:* \`${JSON.stringify(parsedValue)}\`\n\n` +
                    `_Edited by: @${M.sender.id.split('@')[0]}_`
            )
        } catch (err) {
            console.error('[EDITDB ERROR]', err)
            return M.reply('❌ An error occurred while editing the database.')
        }
    }
)
