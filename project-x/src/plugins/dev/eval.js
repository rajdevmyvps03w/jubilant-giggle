import { plugin } from '../../utils/plugin.js'
import * as db from '../../database/db.js'
import { User, Group } from '../../database/models/index.js'

plugin(
    {
        name: 'eval',
        aliases: ['exec', '$'],
        category: 'dev',
        isDev: true,
        description: {
            content: 'Dev: Execute arbitrary JavaScript code. Handle with extreme caution.',
            usage: '<js code>',
            example: 'await db.findUser("917003213983@s.whatsapp.net", "name wallet")'
        }
    },
    async (client, M, { text }) => {
        const code = text?.trim()
        if (!code) {
            return M.reply(`❌ Please provide code to execute.\nUsage: *${global.config.prefix}eval <code>*`)
        }

        const start = Date.now()

        try {
            // Expose useful globals inside eval context
            const result = await eval(`(async () => { ${code} })()`)
            const elapsed = Date.now() - start

            let output
            if (result === undefined) {
                output = 'undefined'
            } else if (result === null) {
                output = 'null'
            } else if (typeof result === 'object') {
                try {
                    output = JSON.stringify(result, null, 2)
                } catch {
                    output = String(result)
                }
            } else {
                output = String(result)
            }

            // Truncate large output
            const MAX = 3000
            const truncated = output.length > MAX
            const displayOutput = truncated
                ? output.slice(0, MAX) + `\n\n... [truncated, ${output.length} total chars]`
                : output

            return M.reply(`✅ *EVAL RESULT* (${elapsed}ms)\n\n` + `\`\`\`\n${displayOutput}\n\`\`\``)
        } catch (err) {
            const elapsed = Date.now() - start
            return M.reply(`❌ *EVAL ERROR* (${elapsed}ms)\n\n` + `\`\`\`\n${err.stack || err.message}\n\`\`\``)
        }
    }
)
