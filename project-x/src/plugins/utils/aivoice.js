import { plugin } from '../../utils/plugin.js'
import axios from 'axios'
import { getBuffer, randomString } from '../../functions/helpler.js'

plugin(
    {
        name: 'aivoice',
        aliases: ['tts', 'voice'],
        category: 'utils',
        description: {
            content: 'Convert text into AI voice audio.',
            usage: '<text>',
            example: 'Hello, this is an AI voice'
        }
    },
    async (_, M, { text }) => {
        if (!text || !text.trim()) {
            return M.reply('❌ Provide text to convert into voice.')
        }

        const input = text.trim()
        if (input.length > 500) {
            return M.reply('❌ Text too long. Limit is 500 characters.')
        }

        try {
            const payload = new URLSearchParams({
                msg: input,
                lang: 'Joey',
                source: 'ttsmp3'
            })

            const { data } = await axios.post('https://ttsmp3.com/makemp3_new.php', payload.toString(), {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            })

            if (!data || data.Error !== 0 || !data.URL) {
                throw new Error(data?.Text || 'TTS service failed')
            }
            const audioBuffer = await getBuffer(data.URL)
            return await M.replyRaw({
                audio: audioBuffer,
                mimetype: 'audio/mpeg',
                fileName: `${randomString(6)}.mp3`,
                ptt: false
            })
        } catch (err) {
            console.error('[AIVOICE]', err)
            return M.reply('❌ Failed to generate AI voice.')
        }
    }
)
