import { plugin } from '../../utils/plugin.js'
import { feedPet } from '../../database/db.js'

plugin(
    {
        name: 'feed',
        aliases: ['feedpet', 'givefood'],
        category: 'pet',
        description: {
            content: 'Feed your pet to restore hunger and a bit of happiness.',
            usage: ''
        }
    },
    async (_, M) => {
        try {
            const result = await feedPet(M.sender.id)
            if (!result.ok) {
                switch (result.error) {
                    case 'NO_PET':
                        return M.reply(
                            `❌ You don't have a pet to feed! Adopt one first using ${global.config.prefix}adopt`
                        )
                    case 'PET_DEAD':
                        return M.reply(
                            `🪦 It's too late... your pet has passed away. Use ${global.config.prefix}releasepet to say goodbye.`
                        )
                    case 'PET_SLEEPING':
                        return M.reply("😴 Shhh! Your pet is sleeping. You can't feed them until they wake up.")
                    case 'PET_FULL':
                        return M.reply("🤢 Your pet is already full! Don't overfeed them.")
                    case 'FEED_COOLDOWN':
                        return M.reply(`⏳ Your pet isn't hungry yet. Try again in *${result.remaining} minutes*.`)
                    case 'INSUFFICIENT_FUNDS':
                        return M.reply("💸 You don't have enough money! Feeding costs *₹50*.")
                    default:
                        return M.reply(`❌ Error: ${result.error}`)
                }
            }

            // Success Response
            const { pet } = result
            return M.reply(
                `🍴 *Meal Time!*\n\n` +
                    `You fed *${pet.name}* a delicious meal.\n` +
                    `📈 *Hunger:* ${pet.stats.hunger}%\n` +
                    `📈 *Happiness:* ${pet.stats.happiness}%\n\n` +
                    `💰 *Cost:* ₹50 deducted from wallet.`
            )
        } catch (err) {
            console.error('[FEED COMMAND ERROR]', err)
            return M.reply('❌ An error occurred while trying to feed your pet.')
        }
    }
)
