import { plugin } from '../../utils/plugin.js'
import { fetch } from '../../functions/helpler.js'

plugin(
    {
        name: 'ipinfo',
        aliases: ['ip', 'iplookup'],
        category: 'search',
        description: {
            usage: '<ip-address>',
            content: 'Get location and ISP information about an IP address.',
            example: '8.8.8.8'
        }
    },
    async (_, M, { args }) => {
        if (!args[0]) {
            return M.reply(
                `❌ Please provide an IP address.\n\n` + `Example:\n` + `${global.config.prefix}ipinfo 8.8.8.8`
            )
        }

        let data
        try {
            data = await fetch(
                `http://ip-api.com/json/${args[0]}?fields=status,message,country,regionName,city,zip,lat,lon,isp,org,as,query`
            )
        } catch (err) {
            return M.reply('⚠️ Failed to fetch IP information. Please try again later.')
        }

        if (data.status !== 'success') {
            return M.reply(`⚠️ Error: ${data.message || 'Invalid IP address.'}`)
        }

        const locationInfo = `
📍 IP: ${data.query}

🌐 Country: ${data.country}

🏞 Region: ${data.regionName}

🏙 City: ${data.city}

📮 ZIP: ${data.zip || 'N/A'}

🧭 Latitude: ${data.lat}

🧭 Longitude: ${data.lon}

📡 ISP: ${data.isp}

🏢 Organization: ${data.org}

🔢 AS: ${data.as}
        `.trim()

        return M.reply(locationInfo)
    }
)
