import { plugin } from '../../utils/plugin.js'
import { getRandomInt } from '../../functions/helpler.js'

const checks = [
    'awesomecheck',
    'greatcheck',
    'gaycheck',
    'cutecheck',
    'lesbiancheck',
    'hornycheck',
    'prettycheck',
    'lovelycheck',
    'uglycheck',
    'beautifulcheck',
    'handsomecheck',
    'charactercheck'
]

const types = [
    'Compassionate',
    'Generous',
    'Grumpy',
    'Forgiving',
    'Obedient',
    'Good',
    'Simp',
    'Kind-Hearted',
    'Patient',
    'UwU',
    'Top energy',
    'Helpful'
]

plugin(
    {
        name: 'checkuser',
        aliases: ['cu', ...checks],
        category: 'fun',
        description: {
            usage: '<check> <mention | reply>',
            content: 'Run fun personality and vibe checks on yourself or another user.',
            example: 'prettycheck @user'
        }
    },
    async (_, M, { text, cmd }) => {
        try {
            let raw = true
            if (cmd === 'checkuser' || cmd === 'cu') raw = false

            // ---------- SHOW LIST ----------
            if (!raw && !text) {
                const list =
                    `🎃 *Available Checks:*\n\n- ` +
                    checks.join('\n- ') +
                    `\n\n🛠️ *Usage:* ${global.config.prefix}checkuser <check> @user\n` +
                    `or ${global.config.prefix}awesomecheck @user`

                return M.reply(list)
            }

            // ---------- CHECK NAME ----------
            const check = raw ? cmd : text.split(' ')[0]?.trim()?.toLowerCase()

            if (!checks.includes(check)) {
                return M.reply(`❌ Invalid check.\nUse *${global.config.prefix}checkuser* to see all available checks.`)
            }

            // ---------- TARGET ----------
            if (M.quotedMessage?.participant) {
                M.mentioned.push(M.quotedMessage.participant)
            }

            if (!M.mentioned.length) {
                M.mentioned.push(M.sender.id)
            }

            const target = M.mentioned[0]

            // ---------- RANDOM RESULT ----------
            const percentage = getRandomInt(1, 100)
            const character = types[getRandomInt(0, types.length - 1)]

            const base = check.replace('check', '')
            const result = check === 'charactercheck' ? `${percentage}% ${character}` : `${percentage}% ${base}`

            // ---------- MESSAGE ----------
            const msg =
                `🎆 *${check.toUpperCase()}* 🎆\n\n` +
                `@${target.split('@')[0]} is\n` +
                `\`\`\`${result.toUpperCase()}\`\`\``

            return M.reply(msg, 'text', null, null, [target])
        } catch (err) {
            console.error('[CHECKUSER ERROR]', err)
            return M.reply('❌ Failed to run check.')
        }
    }
)
