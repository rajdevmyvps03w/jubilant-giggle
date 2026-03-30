import { plugin } from '../../utils/plugin.js'
import { getRandomInt, getBuffer } from '../../functions/helpler.js'
import nodeHtmlToImage from 'node-html-to-image'

/* ---------- LOVE IMAGE GENERATOR (COMBINED) ---------- */

async function generateLoveImage(avatarBuf1, avatarBuf2, percent = 0) {
    const avatar1 = `data:image/png;base64,${avatarBuf1.toString('base64')}`
    const avatar2 = `data:image/png;base64,${avatarBuf2.toString('base64')}`

    let heart = '❤️'
    if (percent <= 30) heart = '💔'
    if (percent <= 10) heart = '💀'

    let text = ''
    if (percent <= 10) text = 'No chance at all 💀'
    else if (percent <= 25) text = 'Very low love 💔'
    else if (percent <= 40) text = 'Only friendship 🤝'
    else if (percent <= 55) text = 'Something forming 🙂'
    else if (percent <= 70) text = 'Nice bond ❤️'
    else if (percent <= 85) text = 'Strong love 💖'
    else if (percent <= 95) text = 'Crazy together 🔥'
    else text = 'Perfect soulmates 👑'

    const html = `
    <html>
    <body style="
        margin:0;
        width:800px;
        height:400px;
        display:flex;
        align-items:center;
        justify-content:center;
        background:#0f0f0f;
        font-family:Arial;
        color:white;
    ">
        <div style="
            width:720px;
            height:300px;
            background:linear-gradient(135deg,#1a1a1a,#262626);
            border-radius:24px;
            padding:25px;
            display:flex;
            flex-direction:column;
            align-items:center;
            justify-content:center;
        ">
            <div style="display:flex;align-items:center;gap:18px;">
                <img src="${avatar1}" style="width:90px;height:90px;border-radius:50%;border:3px solid #ff4d6d;">
                <div style="font-size:36px;">${heart}</div>
                <img src="${avatar2}" style="width:90px;height:90px;border-radius:50%;border:3px solid #ff4d6d;">
            </div>
            <div style="font-size:64px;font-weight:bold;margin-top:10px;">${percent}%</div>
            <div style="margin-top:8px;font-size:18px;opacity:.85;">${text}</div>
        </div>
    </body>
    </html>`

    return await nodeHtmlToImage({
        html,
        type: 'png',
        encoding: 'buffer',
        puppeteerArgs:
            process.env.PREFIX?.includes('com.termux') ||
            process.env.HOME?.includes('/data/data/com.termux') ||
            process.platform === 'android'
                ? {
                      executablePath: '/data/data/com.termux/files/home/chrome',
                      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
                  }
                : {
                      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
                  },
        quality: 100
    })
}

/* ---------- COMMAND ---------- */

plugin(
    {
        name: 'ship',
        aliases: ['love', 'compat'],
        category: 'fun',
        description: {
            usage: '<mention | reply>',
            content: 'Check love compatibility between you and another user.',
            example: '@user'
        }
    },
    async (client, M) => {
        try {
            /* ---------- TARGET ---------- */
            if (M.quotedMessage?.participant) {
                M.mentioned.push(M.quotedMessage.participant)
            }

            if (!M.mentioned.length) {
                M.mentioned.push(M.sender.id) // self fallback
            }

            const target = M.mentioned[0]

            /* ---------- RANDOM % ---------- */
            const percent = getRandomInt(0, 100)

            /* ---------- AVATAR FETCH ---------- */
            let avatar1, avatar2

            try {
                const p1 = await client.profilePictureUrl(M.sender.id, 'image')
                avatar1 = await getBuffer(p1)
            } catch {
                avatar1 = await getBuffer('https://blog.fluidui.com/assets/images/posts/imageedit_1_9273372713.png')
            }

            try {
                const p2 = await client.profilePictureUrl(target, 'image')
                avatar2 = await getBuffer(p2)
            } catch {
                avatar2 = await getBuffer('https://blog.fluidui.com/assets/images/posts/imageedit_1_9273372713.png')
            }

            /* ---------- IMAGE ---------- */
            let image
            try {
                image = await generateLoveImage(avatar1, avatar2, percent)
            } catch (e) {
                console.error('[SHIP IMAGE ERROR]', e)
                return M.reply('❌ Failed to generate love image.')
            }

            /* ---------- CAPTION ---------- */
            const caption =
                `💘 *Love Calculator*\n\n` +
                `@${M.sender.id.split('@')[0]} ❤️ @${target.split('@')[0]}\n` +
                `💞 Compatibility: *${percent}%*`

            /* ---------- SEND ---------- */
            return M.replyRaw({
                image,
                caption,
                mentions: [M.sender.id, target]
            })
        } catch (err) {
            console.error('[SHIP COMMAND ERROR]', err)
            return M.reply('❌ Failed to calculate love compatibility.')
        }
    }
)
