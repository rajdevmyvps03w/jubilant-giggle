import { getBuffer } from '../../functions/helpler.js'
import { plugin } from '../../utils/plugin.js'
import mumaker from 'mumaker'
const TEXTPRO = {
    stone: { url: 'https://textpro.me/3d-stone-cracked-cool-text-effect-1029.html', dual: false },
    wolf: { url: 'https://textpro.me/create-wolf-logo-galaxy-online-936.html', dual: true },
    breakwall: { url: 'https://textpro.me/break-wall-text-effect-871.html', dual: false },
    transformer: { url: 'https://textpro.me/create-a-transformer-text-effect-online-1035.html', dual: false },
    thunder: { url: 'https://textpro.me/create-thunder-text-effect-online-881.html', dual: false },
    neon: { url: 'https://textpro.me/neon-text-effect-online-879.html', dual: false },
    matrix: { url: 'https://textpro.me/matrix-style-text-effect-online-884.html', dual: false },
    magma: { url: 'https://textpro.me/create-a-magma-hot-text-effect-online-1030.html', dual: false },
    lion: { url: 'https://textpro.me/create-lion-logo-mascot-online-938.html', dual: true },
    glitch: { url: 'https://textpro.me/create-glitch-text-effect-style-tik-tok-983.html', dual: true },
    cloud: { url: 'https://textpro.me/create-a-cloud-text-effect-on-the-sky-online-1004.html', dual: false },
    horror: { url: 'https://textpro.me/horror-blood-text-effect-online-883.html', dual: false },
    blackpink: { url: 'https://textpro.me/create-blackpink-logo-style-online-1001.html', dual: false },
    space: { url: 'https://textpro.me/create-space-3d-text-effect-online-985.html', dual: true },
    neon3d: { url: 'https://textpro.me/create-3d-neon-light-text-effect-online-1028.html', dual: false },
    christmas: { url: 'https://textpro.me/3d-christmas-text-effect-by-name-1055.html', dual: false }
}
plugin(
    {
        name: 'textpro',
        aliases: Object.keys(TEXTPRO),
        category: 'image',
        description: {
            content:
                'Generate high-quality styled text images using TextPro effects.\n' +
                'Run command alone to view all available styles.',
            usage: '<style> <text> OR <style> <text1> | <text2>',
            example: 'stone Das\nwolf Das|King'
        }
    },
    async (_, M, { cmd, text }) => {
        if (cmd === 'textpro' && (!text || !text.trim())) {
            const list = Object.keys(TEXTPRO)
                .map((e) => `• *${global.config.prefix}${e}*`)
                .join('\n')

            return M.reply(
                `🎨 *TextPro Styles*\n\n${list}\n\n` +
                    `Examples:\n` +
                    `• *${global.config.prefix}stone Das*\n` +
                    `• *${global.config.prefix}wolf Das|King*`
            )
        }

        const style = TEXTPRO[cmd]
        if (!style) {
            return M.reply(`❌ *Invalid style.*\nUse *${global.config.prefix}textpro* to view available styles.`)
        }

        if (!text || !text.trim()) {
            return M.reply(`❌ *Missing text input.*\n\nUsage:\n*${global.config.prefix}${cmd} <text>*`)
        }

        try {
            let result
            if (style.dual) {
                const [t1, t2] = text.split('|').map((t) => t?.trim())

                if (!t1 || !t2) {
                    return M.reply(
                        `❌ This style requires *two texts*.\n` +
                            `Example:\n*${global.config.prefix}${cmd} Text1|Text2*`
                    )
                }

                result = await mumaker.textpro(style.url, [t1, t2])
            } else {
                result = await mumaker.textpro(style.url, [text.trim()])
            }

            if (!result) {
                throw new Error('No image returned')
            }

            return await M.replyRaw({
                image: await getBuffer(result.image, true),
                caption: `✨ *${cmd.toUpperCase()}* style generated`
            })
        } catch (err) {
            console.error('[TEXTPRO]', err)

            return M.reply('❌ Failed to generate the styled text image.\nPlease try again later.')
        }
    }
)
