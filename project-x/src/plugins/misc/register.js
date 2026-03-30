import { plugin } from '../../utils/plugin.js'
// Importing state and database handlers
import { setUser, getState, deleteState } from '../../database/db.js'

plugin(
    {
        name: 'register',
        aliases: ['signup'],
        category: 'misc',
        description: {
            usage: '<code> <name> <age> <gender>',
            content: 'Register yourself using the code, name, age and gender.',
            example: 'm9g8z1tp2c4w Debanjan 19 male'
        }
    },
    async (_, M, { args }) => {
        try {
            if (args.length < 4) {
                return M.reply(
                    `⚠️ Please use the correct format:\n` +
                        `*${global.config.prefix}register <code> <name> <age> <gender>*\n\n` +
                        `*Example:* ${global.config.prefix}register m9g8z1tp2c4w Debanjan 19 male`
                )
            }

            const code = args[0]
            const name = args[1]
            const age = parseInt(args[2])
            const gender = args[3].toLowerCase()

            /* ---------- STATE RETRIEVAL (DB) ---------- */
            // Fetching the state we saved in the getreg command
            const data = await getState(`reg:${code}`)

            if (!data) {
                return M.reply(
                    `❌ Invalid or expired registration code.\n` +
                        `Please use *${global.config.prefix}getreg* to generate a new one.`
                )
            }

            /* ---------- SECURITY CHECK ---------- */

            // Verify the person using the code is the one who requested it
            if (data.id !== M.sender.id || data.jid !== M.sender.jid) {
                return M.reply(`🚫 This code was generated for another user. Please generate your own.`)
            }

            /* ---------- VALIDATION ---------- */
            if (name.length < 3 || name.length > 20 || /[^a-zA-Z]/.test(name)) {
                return M.reply(`🤨 Name "${name}" is invalid. Use 3-20 letters only (no numbers/symbols).`)
            }

            if (isNaN(age) || age < 10 || age > 40) {
                return M.reply(`😤 Age "${args[2]}" is invalid. Age must be between 10 and 40.`)
            }

            if (!['male', 'female'].includes(gender)) {
                return M.reply(`🤔 Gender must be "male" or "female".`)
            }

            /* ---------- DATA PERSISTENCE ---------- */
            const userData = {
                jid: data.jid,
                lid: data.id, // Assuming lid matches jid for compatibility
                name,
                age,
                gender,
                wallet: 500, // Starter bonus
                bank: { value: 0, capacity: 50000 },
                exp: 0,
                inventory: []
            }

            await setUser(userData)

            // Clean up the registration code from DB so it can't be reused
            await deleteState(`reg:${code}`)

            /* ---------- RESPONSE ---------- */
            return M.reply(
                `✅ *Registration Successful!*\n\n` +
                    `👤 *Name:* ${userData.name}\n` +
                    `🎂 *Age:* ${userData.age}\n` +
                    `🚻 *Gender:* ${userData.gender.toUpperCase()}\n` +
                    `💰 *Starter Bonus:* ₹500 added to wallet!\n\n` +
                    `Welcome to the economy! Use *${global.config.prefix}help* to see what you can do.`
            )
        } catch (err) {
            console.error('[REGISTER ERROR]', err)
            return M.reply('❌ An error occurred during registration. Please try again.')
        }
    }
)
