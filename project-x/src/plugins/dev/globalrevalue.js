import { plugin } from '../../utils/plugin.js'
import { runGlobalRevalue } from '../../database/db.js'

plugin(
    {
        name: 'globalrevalue',
        aliases: ['grv', 'revalueall', 'autorev'],
        category: 'dev',
        isDev: true,
        description: {
            content: 'Dev: Manually trigger a full global revaluation of every card owned by every user.'
        }
    },
    async (_, M) => {
        try {
            await M.reply(
                `⏳ *Global Revaluation Started*\n\n` +
                    `Processing all users and cards...\n` +
                    `_This may take a moment depending on DB size._`
            )

            const start = Date.now()
            const { users, cards } = await runGlobalRevalue()
            const elapsed = ((Date.now() - start) / 1000).toFixed(1)

            return M.reply(
                `✅ *Global Revaluation Complete*\n\n` +
                    `👥 *Users processed:* ${users.toLocaleString()}\n` +
                    `🃏 *Cards revalued:* ${cards.toLocaleString()}\n` +
                    `⏱️ *Time taken:* ${elapsed}s\n\n` +
                    `_All prices updated using current market snapshot._`
            )
        } catch (err) {
            console.error('[GLOBALREVALUE ERROR]', err)
            return M.reply('❌ Global revaluation failed. Check server logs.')
        }
    }
)
