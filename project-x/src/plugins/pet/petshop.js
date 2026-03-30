import { plugin } from '../../utils/plugin.js'
import { findUser } from '../../database/db.js'

const PET_CATALOG = {
    dog: { price: 5000, tier: 'S', variants: ['akita', 'black', 'brown', 'red', 'white'] },
    fox: { price: 4800, tier: 'S', variants: ['red', 'white'] },
    panda: { price: 5200, tier: 'S', variants: ['black', 'brown'] },
    turtle: { price: 4200, tier: 'A', variants: ['green', 'orange'] },
    snake: { price: 3500, tier: 'B', variants: ['green'] },
    'rubber-duck': { price: 3000, tier: 'B', variants: ['yellow'] },
    rat: { price: 2800, tier: 'A', variants: ['brown', 'gray', 'white'] },
    morph: { price: 2600, tier: 'B', variants: ['purple'] }
}

const PET_ACTION_COST = {
    feed: 50,
    play: 75,
    sleep: 0
}

plugin(
    {
        name: 'petshop',
        aliases: ['pets', 'petstore'],
        category: 'pet',
        description: {
            content: 'View available pets, tiers, and interaction costs.',
            example: '<type> <variant> <name>'
        }
    },
    async (_, M) => {
        try {
            const user = await findUser(M.sender.id, 'wallet')
            const balance = user?.wallet || 0

            let text = '🐾 *PET SHOP GALLERY*\n'
            text += `💰 *Wallet:* ₹${balance.toLocaleString()}\n\n`

            text += '*Available Species*\n'
            for (const [id, data] of Object.entries(PET_CATALOG)) {
                const petName = id.charAt(0).toUpperCase() + id.slice(1)
                const variants = data.variants.map((v) => v.charAt(0).toUpperCase() + v.slice(1)).join(', ')

                text += `▫️ *${petName}* [Tier ${data.tier}]\n`
                text += `   Price: ₹${data.price.toLocaleString()}\n`
                text += `   Variants: _${variants}_\n\n`
            }

            text += '*Interaction Costs*\n'
            text += `🍴 *Feed:* ₹${PET_ACTION_COST.feed}\n`
            text += `🎮 *Play:* ₹${PET_ACTION_COST.play}\n`
            text += `😴 *Sleep:* Free (20 min cooldown)\n\n`

            text += `💡 *How to Adopt:*\n`
            text += `${global.config.prefix}adopt <type> <variant> <name>\n`
            text += `*Example:* ${global.config.prefix}adopt dog black Sparky`

            return M.reply(text)
        } catch (err) {
            console.error('[PET SHOP ERROR]', err)
            return M.reply('❌ Failed to load pet shop.')
        }
    }
)
