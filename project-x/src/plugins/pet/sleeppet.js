import { plugin } from '../../utils/plugin.js'
import { sleepPet } from '../../database/db.js'

plugin(
    {
        name: 'sleeppet',
        aliases: ['sleep', 'petsleep', 'restenergy'],
        category: 'pet',
        description: {
            content: 'Put your pet to sleep to restore energy. Free — 20 min sleep, 2h cooldown between naps.'
        }
    },
    async (_, M) => {
        try {
            const result = await sleepPet(M.sender.id)

            if (!result.ok) {
                switch (result.error) {
                    case 'NO_PET':
                        return M.reply(`❌ You don't have a pet! Use ${global.config.prefix}adopt first.`)
                    case 'PET_DEAD':
                        return M.reply(
                            `🪦 Your pet has passed away. Use ${global.config.prefix}releasepet to say goodbye.`
                        )
                    case 'ALREADY_SLEEPING': {
                        // sleepPet doesn't return remaining wake time but we can be helpful
                        return M.reply(
                            `😴 Your pet is already sleeping! Check ${global.config.prefix}petstatus for the wake-up time.`
                        )
                    }
                    case 'SLEEP_COOLDOWN':
                        return M.reply(
                            `⏳ Your pet isn't tired yet. There's a 2-hour cooldown between naps.\n` +
                                `Try playing first to tire them out: *${global.config.prefix}playpet*`
                        )
                    case 'UPDATE_FAILED':
                        return M.reply('❌ Database error. Please try again.')
                    default:
                        return M.reply(`❌ Error: ${result.error}`)
                }
            }

            const { pet, energyGain } = result
            return M.reply(
                `😴 *${pet.name} is now resting...*\n\n` +
                    `⚡ *Energy restored:* +${energyGain} (now ${pet.stats.energy}%)\n` +
                    `⏰ *Wakes up in:* 20 minutes\n\n` +
                    `_You cannot feed or play with ${pet.name} while sleeping._`
            )
        } catch (err) {
            console.error('[SLEEPPET ERROR]', err)
            return M.reply('❌ An error occurred while putting your pet to sleep.')
        }
    }
)
