import { plugin } from '../../utils/plugin.js'
import { fetch, getBuffer, gifToMp4 } from '../../functions/helpler.js'

plugin(
    {
        name: 'pokedex',
        aliases: ['pokemon', 'dex'],
        category: 'weeb',
        description: {
            content: 'Get detailed information about a Pokémon from the Pokédex.',
            usage: '<id>',
            example: '001'
        }
    },
    async (_, M, { text }) => {
        const query = text.trim()

        if (!query) {
            return M.reply(`❌ Please provide a Pokémon ID.\n\nExample:\n${global.config.prefix}pokedex 001`)
        }

        try {
            const data = await fetch(`https://api.some-random-api.com/pokemon/pokedex?id=${encodeURIComponent(query)}`)

            if (data.error) {
                return M.reply('❌ Pokémon not found. Check the ID.')
            }

            const msg = `📖 *Pokédex Entry*

🧬 *Name:* ${data.name}

🔢 *ID:* #${data.id}

🌿 *Type:* ${data.type.join(', ')}

✨ *Abilities:* ${data.abilities.join(', ')}

📏 *Height:* ${data.height}

⚖️ *Weight:* ${data.weight}

🎯 *Base EXP:* ${data.base_experience}

🚻 *Gender:* ${data.gender.join(', ')}

🥚 *Egg Groups:* ${data.egg_groups.join(', ')}

📊 *Stats:*
• HP: ${data.stats.hp}
• ATK: ${data.stats.attack}
• DEF: ${data.stats.defense}
• SP ATK: ${data.stats.sp_atk}
• SP DEF: ${data.stats.sp_def}
• SPD: ${data.stats.speed}
• TOTAL: ${data.stats.total}

🌱 *Evolution Line:* ${data.family.evolutionLine.join(' → ')}

🧭 *Generation:* ${data.generation}

📝 *Description:* ${data.description}`

            const image = await fetch(`https://pokeapi.co/api/v2/pokemon/${data.name}`)
            const media = await getBuffer(image.sprites.other['official-artwork'].front_default)

            return M.reply(media, 'image', undefined, msg)
        } catch (err) {
            console.error('[POKEDEX]', err)
            return M.reply('❌ Failed to fetch Pokédex data. Please try again later.')
        }
    }
)
