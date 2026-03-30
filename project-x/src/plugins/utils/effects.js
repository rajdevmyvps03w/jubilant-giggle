import { plugin } from '../../utils/plugin.js'
import { applyAudioEffects, getAudioEffects, randomString } from '../../functions/helpler.js'

plugin(
    {
        name: 'effect',
        aliases: ['audiofx', 'fx'],
        category: 'utils',
        description: {
            content: 'Apply one or multiple audio effects to a replied audio message.',
            usage: '<effect1> <effect2> <effect3> ...',
            example: 'slow nightcore reverse'
        }
    },
    async (_, M, { args }) => {
        if (!args.length) {
            return M.reply(
                `❌ Provide at least one effect.\n\n` + `Available effects:\n*${getAudioEffects().join(', ')}*`
            )
        }

        if (!M.quotedMessage || M.quotedMessage.type !== 'audio') {
            return M.reply('❌ Reply to an *audio message* to apply effects.')
        }

        const available = new Set(getAudioEffects())
        const invalid = args.filter((e) => !available.has(e))

        if (invalid.length) {
            return M.reply(
                `❌ Invalid effect(s): *${invalid.join(', ')}*\n\n` + `Available:\n*${[...available].join(', ')}*`
            )
        }

        try {
            const buffer = await M.quotedMessage.download()
            const output = await applyAudioEffects(buffer, args)

            await M.replyRaw({
                audio: output,
                mimetype: 'audio/mpeg',
                fileName: `${args.join('_')}_${randomString(6)}.mp3`,
                ptt: false
            })
        } catch (err) {
            console.error('[AUDIO EFFECT]', err)
            return M.reply('❌ Failed to process audio. Please try again.')
        }
    }
)
