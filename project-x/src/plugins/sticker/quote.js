import { plugin } from '../../utils/plugin.js'
import fs from 'fs'
import path from 'path'
import os from 'os'
import nodeHtmlToImage from 'node-html-to-image'
import { Sticker, StickerTypes } from 'wa-sticker-formatter'
import { getContact } from '../../database/db.js'

plugin(
    {
        name: 'q',
        aliases: ['quote'],
        category: 'sticker',
        description: {
            content: 'Quote a replied message as a WhatsApp-style sticker'
        }
    },
    async (client, M) => {
        if (!M.quotedMessage) {
            return M.reply('❌ Reply to a message!')
        }

        const text = M.quotedMessage.text || `[${M.quotedMessage.type}]`
        const quotedSender = M.quotedMessage.participant
        const senderName = await getContact(quotedSender)

        let pfpUrl
        try {
            pfpUrl = await client.profilePictureUrl(quotedSender, 'image')
        } catch {
            pfpUrl = 'https://i.ibb.co/Sn9RZ9K/avatar.png'
        }

        const html = `
        <html>
          <head>
            <style>
              body {
                margin: 0;
                padding: 0;
                width: 512px;
                height: 512px;
                background: #e5ddd5;
                display: flex;
                align-items: center;
                justify-content: center;
                font-family: Arial, sans-serif;
              }
              .quote {
                background: #fff;
                padding: 20px;
                border-radius: 18px;
                display: flex;
                max-width: 480px;
                box-shadow: 0 2px 6px rgba(0,0,0,.2);
              }
              .avatar {
                width: 64px;
                height: 64px;
                border-radius: 50%;
                margin-right: 16px;
              }
              .text {
                max-width: 380px;
                word-wrap: break-word;
              }
              .name {
                color: #075E54;
                font-weight: bold;
                font-size: 18px;
                margin-bottom: 6px;
              }
              .msg {
                font-size: 22px;
                color: #222;
                white-space: pre-wrap;
              }
            </style>
          </head>
          <body>
            <div class="quote">
              <img class="avatar" src="${pfpUrl}" />
              <div class="text">
                <div class="name">${escapeHtml(senderName)}</div>
                <div class="msg">${escapeHtml(text)}</div>
              </div>
            </div>
          </body>
        </html>
        `
        try {
            const out = path.join(os.tmpdir(), `quote_${Date.now()}_${Math.random()}.png`)

            await nodeHtmlToImage({
                output: out,
                html,
                puppeteerArgs:
                    process.env.PREFIX?.includes('com.termux') ||
                    process.env.HOME?.includes('/data/data/com.termux') ||
                    process.platform === 'android'
                        ? {
                              executablePath: '/data/data/com.termux/files/home/chrome',
                              args: [
                                  '--no-sandbox',
                                  '--disable-setuid-sandbox',
                                  '--disable-dev-shm-usage',
                                  '--disable-gpu'
                              ]
                          }
                        : {
                              args: [
                                  '--no-sandbox',
                                  '--disable-setuid-sandbox',
                                  '--disable-dev-shm-usage',
                                  '--disable-gpu'
                              ]
                          }
            })

            const buffer = fs.readFileSync(out)
            const sticker = new Sticker(buffer, {
                pack: '👾 Handcrafted for you by',
                author: 'Project-X 👾',
                type: StickerTypes.FULL,
                categories: ['🤩', '🎉'],
                quality: 70
            })

            await M.replyRaw({ sticker: await sticker.build() })
            fs.unlinkSync(out)
        } catch (e) {
            console.error('QUOTE ERROR:', e)
            return M.reply('⚠️ Failed to generate quote')
        }
    }
)

function escapeHtml(str = '') {
    return str.replace(/[&<>"']/g, (m) =>
        m === '&' ? '&amp;' : m === '<' ? '&lt;' : m === '>' ? '&gt;' : m === '"' ? '&quot;' : '&#039;'
    )
}
