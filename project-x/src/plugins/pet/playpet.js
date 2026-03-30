import { plugin } from '../../utils/plugin.js'
import { playWithPet } from '../../database/db.js'
import { getBuffer } from '../../functions/helpler.js'
import { Sticker, StickerTypes } from 'wa-sticker-formatter'
import { getPetAssetByAction } from '../../functions/pets.js'

plugin(
    {
        name: 'playpet',
        category: 'pet',
        description: {
            content: 'Play with your pet to increase happiness and gain XP.'
        }
    },
    async (_, M) => {
        try {
            const result = await playWithPet(M.sender.id)

            // 1. Handle Logic Errors from db.js
            if (!result.ok) {
                switch (result.error) {
                    case 'NO_PET':
                        return M.reply(`❌ You don't have a pet! Use ${global.config.prefix}adopt first.`)
                    case 'PET_DEAD':
                        return M.reply(
                            `🪦 Your pet has passed away. Use ${global.config.prefix}releasepet to say goodbye.`
                        )
                    case 'PET_SLEEPING':
                        return M.reply('😴 Shhh! Your pet is sleeping. Let them rest.')
                    case 'PET_TOO_TIRED':
                        return M.reply('😫 Your pet is exhausted (Energy < 20%). Let them sleep first!')
                    case 'PLAY_COOLDOWN':
                        return M.reply('🕒 Your pet is tired of playing. Give them a break!')
                    case 'INSUFFICIENT_FUNDS':
                        return M.reply('💸 Playing requires toys. You need *₹75* in your wallet.')
                    default:
                        return M.reply(`❌ Error: ${result.error}`)
                }
            }

            const { pet, leveledUp } = result

            // 2. Fetch the Animated Asset (GIF)
            const assetData = getPetAssetByAction(pet.type, pet.variant, 'play')

            // 3. Send the animated sticker
            if (assetData && assetData.url) {
                const buffer = await getBuffer(assetData.url)
                const sticker = new Sticker(buffer, {
                    pack: `${global.config.name || 'Bot'} Stickers`,
                    author: 'Pet play',
                    type: StickerTypes.CROPPED,
                    categories: ['🤩', '🎉'],
                    id: '12345',
                    quality: 50,
                    background: 'transparent'
                })

                await M.replyRaw({ sticker: await sticker.build() })
            }

            // 4. Build and send the text results
            // FIX: hardcoded +25/-15/-10/+20 were wrong — db.js uses randomized values
            let text = `🎮 *Play Time with ${pet.name}!*\n\n`
            text += `😊 *Happiness:* ${pet.stats.happiness}%\n\n`
            text += `⚡ *Energy:* ${pet.stats.energy}%\n\n`
            text += `🍴 *Hunger:* ${pet.stats.hunger}%\n\n`
            text += `✨ *XP Gained:* +${result.xpGain}\n\n`

            if (leveledUp) {
                text += `\n\n🎊 *LEVEL UP!* 🎊\n`
                text += `Your pet is now *Level ${pet.stats.level}*!`
            }

            return M.reply(text)
        } catch (err) {
            console.error('[PLAY COMMAND ERROR]', err)
            return M.reply('❌ An error occurred while playing with your pet.')
        }
    }
)
