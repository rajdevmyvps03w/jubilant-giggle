import { plugin } from '../../utils/plugin.js'
import { fetch, getBuffer } from '../../functions/helpler.js'

plugin(
    {
        name: 'weather',
        aliases: ['wthr'],
        category: 'search',
        description: {
            content: 'Get current weather and 5-day forecast for a location.',
            usage: '<location>',
            example: 'tokyo'
        }
    },
    async (_, M, { text }) => {
        if (!text || !text.trim()) {
            return M.reply(`❌ Provide a valid location.\nExample: ${global.config.prefix}weather tokyo`)
        }

        const query = text.trim()

        let data
        try {
            data = await fetch(`https://api.popcat.xyz/v2/weather?q=${encodeURIComponent(query)}`)
        } catch {
            return M.reply('❌ Unable to reach weather service. Try again later.')
        }

        if (!data || data.error === true || !Array.isArray(data.message) || data.message.length === 0) {
            return M.reply('❌ Location not found. Try another city.')
        }

        const result = data.message[0] || {}
        const loc = result.location || {}
        const cur = result.current || {}
        const forecast = Array.isArray(result.forecast) ? result.forecast.slice(0, 5) : []

        if (!loc.name || !cur.temperature) {
            return M.reply('❌ Weather data is incomplete. Try another location.')
        }

        let forecastText = ''

        for (const day of forecast) {
            if (!day) continue

            forecastText +=
                `\n📅 *${day.day || 'N/A'}*` +
                `\n🌤 ${day.skytextday || 'Unknown'}` +
                `\n🌡 ${day.low ?? '?'}° / ${day.high ?? '?'}°` +
                `\n🌧 ${day.precip ?? '?'}%\n`
        }

        if (!forecastText) forecastText = '\nNo forecast data available.\n'

        const message =
            `🌍 *Weather Report*\n\n` +
            `📍 *Location:* ${loc.name}\n` +
            `🌡 *Temperature:* ${cur.temperature}°${loc.degreetype || 'C'}\n` +
            `🤒 *Feels Like:* ${cur.feelslike ?? '?'}°${loc.degreetype || 'C'}\n` +
            `☁️ *Condition:* ${cur.skytext || 'Unknown'}\n` +
            `💧 *Humidity:* ${cur.humidity ?? '?'}%\n` +
            `💨 *Wind:* ${cur.winddisplay || 'Unknown'}\n` +
            `📆 *Date:* ${(cur.day || '') + ', ' + (cur.date || '')}\n\n` +
            `📊 *5-Day Forecast:*${forecastText}`

        let iconBuffer = null
        if (cur.imageUrl) {
            try {
                iconBuffer = await getBuffer(cur.imageUrl)
            } catch {}
        }

        try {
            if (iconBuffer) {
                return await M.reply(iconBuffer, 'image', undefined, message)
            }

            return await M.reply(message)
        } catch {
            return M.reply('❌ Failed to send weather result.')
        }
    }
)
