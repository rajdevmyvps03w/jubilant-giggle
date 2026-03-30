import { plugin } from '../../utils/plugin.js'
import { getBuffer, capitalize, getRandomInt, fetch } from '../../functions/helpler.js'

const reactions = [
    'bully',
    'cuddle',
    'cry',
    'hug',
    'kiss',
    'lick',
    'pat',
    'smug',
    'yeet',
    'blush',
    'bonk',
    'smile',
    'wave',
    'highfive',
    'bite',
    'handhold',
    'nom',
    'glomp',
    'kill',
    'kick',
    'slap',
    'happy',
    'wink',
    'poke',
    'dance',
    'cringe',
    'tickle',
    'baka',
    'bored',
    'laugh',
    'punch',
    'pout',
    'stare',
    'thumbsup',
    'facepalm',
    'sleep',
    'shrug',
    'think',
    'angry',
    'confused',
    'cheer',
    'clap',
    'salute',
    'scream'
]

const getWords = (reaction, single = true) => {
    switch (reaction) {
        case 'bite':
            return 'Bit'
        case 'blush':
            return 'Blushed at'
        case 'bonk':
            return 'Bonked'
        case 'bully':
            return 'Bullied'
        case 'cringe':
            return 'Cringed at'
        case 'cry':
            return single ? 'Cried by' : 'Cried in front of'
        case 'cuddle':
            return 'Cuddled'
        case 'dance':
            return 'Danced with'
        case 'glomp':
            return 'Glomped at'
        case 'handhold':
            return 'Held the hands of'
        case 'happy':
            return single ? 'is happy by' : 'is happy with'
        case 'highfive':
            return 'High-fived'
        case 'hug':
            return 'Hugged'
        case 'kick':
            return 'Kicked'
        case 'kill':
            return 'Killed'
        case 'kiss':
            return 'Kissed'
        case 'lick':
            return 'Licked'
        case 'nom':
            return 'Nomed'
        case 'pat':
            return 'Patted'
        case 'poke':
            return 'Poked'
        case 'slap':
            return 'Slapped'
        case 'smile':
            return 'Smiled at'
        case 'smug':
            return 'Smugged at'
        case 'tickle':
            return 'Tickled'
        case 'wave':
            return 'Waved at'
        case 'wink':
            return 'Winked at'
        case 'yeet':
            return 'Yeeted at'
        case 'baka':
            return 'Yelled BAKA at'
        case 'bored':
            return 'is bored of'
        case 'laugh':
            return 'Laughed at'
        case 'punch':
            return 'Punched'
        case 'pout':
            return 'Pouted at'
        case 'stare':
            return 'Stared at'
        case 'thumbsup':
            return 'Thumbs-upped at'
        case 'facepalm':
            return 'Facepalmed at'
        case 'sleep':
            return 'Fell asleep near'
        case 'shrug':
            return 'Shrugged at'
        case 'think':
            return 'Thought about'
        case 'angry':
            return 'Got angry at'
        case 'confused':
            return 'Got confused by'
        case 'cheer':
            return 'Cheered for'
        case 'clap':
            return 'Clapped for'
        case 'salute':
            return 'Saluted'
        case 'scream':
            return 'Screamed at'
    }
}

/* ---------------- COMMAND ---------------- */

plugin(
    {
        name: 'reaction',
        aliases: ['r', ...reactions],
        category: 'fun',
        description: {
            usage: '<reaction> <mention | reply>',
            content: 'Send a reaction GIF toward someone or yourself.',
            example: 'clap @user'
        }
    },
    async (_, M, { cmd }) => {
        try {
            if (M.quotedMessage?.participant) {
                M.mentioned.push(M.quotedMessage.participant)
            }

            if (!M.mentioned.length) {
                M.mentioned.push(M.sender.id)
            }

            const target = M.mentioned[0]

            if (cmd === 'reaction' || cmd === 'r') {
                const list =
                    `💫 *Available Reactions:*\n\n- ` +
                    reactions.map((r) => capitalize(r)).join('\n- ') +
                    `\n\n🔗 *Usage:* ${global.config.prefix}<reaction> @user\nExample: ${global.config.prefix}pat`

                return M.reply(list)
            }

            if (!reactions.includes(cmd)) {
                return M.reply('❌ Invalid reaction.')
            }

            let url
            try {
                const data = await fetch(`https://g.tenor.com/v1/search?q=${cmd}&key=LIVDSRZULELA&limit=8`)

                url = data?.results?.[getRandomInt(0, (data.results?.length || 1) - 1)]?.media?.[0]?.mp4?.url
            } catch {
                return M.reply('❌ Failed to fetch reaction GIF.')
            }

            if (!url) {
                return M.reply('❌ No GIF found.')
            }

            let buffer
            try {
                buffer = await getBuffer(url, true)
            } catch {
                return M.reply('❌ Failed to download GIF.')
            }

            const single = target === M.sender.id
            const words = getWords(cmd, single)

            const caption =
                `*@${M.sender.id.split('@')[0]} ${words} ` + `${single ? 'themselves' : `@${target.split('@')[0]}`}*`

            return M.replyRaw({
                video: buffer,
                gifPlayback: true,
                caption,
                mentions: [M.sender.id, target]
            })
        } catch (err) {
            console.error('[REACTION ERROR]', err)
            return M.reply('❌ Unexpected error while sending reaction.')
        }
    }
)
