import { plugin } from '../../utils/plugin.js'
import { fetch } from '../../functions/helpler.js' // your helper fetch wrapper

plugin(
    {
        name: 'translate',
        aliases: ['trt'],
        category: 'utils',
        description: {
            content: 'Translate text into another language. Works by replying to a message or providing text directly.',
            usage: '<lang> or <text> | <lang>',
            example: 'hello fr | hi es'
        }
    },
    async (_, M, { text }) => {
        const input = text.trim()
        let textToTranslate = ''
        let lang = ''

        if (M.quotedMessage?.text) {
            textToTranslate = M.quotedMessage.text.trim()
            lang = input
        } else {
            if (!text) {
                return M.reply(
                    `*TRANSLATOR USAGE*\n\n` +
                        `Reply mode:\n${global.config.prefix}translate <lang>\n\n` +
                        `Direct mode:\n${global.config.prefix}translate <text> | <lang>\n\n` +
                        `Examples:\n` +
                        `${global.config.prefix}translate hello | fr\n` +
                        `${global.config.prefix}trt hi | es\n\n` +
                        `Common codes: fr, es, de, it, pt, ru, ja, ko, zh, ar, hi`
                )
            }
            const [t, l] = input.split('|').map((s) => s.trim())
            lang = l
            textToTranslate = t
        }

        if (!textToTranslate || !lang) {
            return M.reply('❌ Provide text and target language.')
        }

        let translated = null
        try {
            const data = await fetch(
                `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${lang}&dt=t&q=${encodeURIComponent(textToTranslate)}`
            )
            translated = data?.[0]?.[0]?.[0] || null
        } catch {}
        if (!translated) {
            try {
                const data = await fetch(
                    `https://api.mymemory.translated.net/get?q=${encodeURIComponent(textToTranslate)}&langpair=auto|${lang}`
                )
                translated = data?.responseData?.translatedText || null
            } catch {}
        }
        if (!translated) {
            try {
                const data = await fetch(
                    `https://api.dreaded.site/api/translate?text=${encodeURIComponent(textToTranslate)}&lang=${lang}`
                )
                translated = data?.translated || null
            } catch {}
        }

        if (!translated) {
            return M.reply('❌ Failed to translate text. Try again later.')
        }
        return M.reply(
            `🌐 *Translation*\n\n` + `📝 *Original:* ${textToTranslate}\n` + `🔤 *Result (${lang}):* ${translated}`
        )
    }
)
