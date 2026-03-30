import { plugin } from '../../utils/plugin.js'
import { findUser, removeFromWallet, editUser } from '../../database/db.js'

const PET_CATALOG = {
    dog: { price: 5000, tier: 'S', variants: ['akita', 'black', 'brown', 'red', 'white'], hasSleepAnim: true },
    fox: { price: 4800, tier: 'S', variants: ['red', 'white'], hasSleepAnim: true },
    panda: { price: 5200, tier: 'S', variants: ['black', 'brown'], hasSleepAnim: true },
    turtle: { price: 4200, tier: 'A', variants: ['green', 'orange'], hasSleepAnim: true },
    snake: { price: 3500, tier: 'B', variants: ['green'], hasSleepAnim: false },
    'rubber-duck': { price: 3000, tier: 'B', variants: ['yellow'], hasSleepAnim: false },
    rat: { price: 2800, tier: 'A', variants: ['brown', 'gray', 'white'], hasSleepAnim: false },
    morph: { price: 2600, tier: 'B', variants: ['purple'], hasSleepAnim: false }
}

plugin(
    {
        name: 'adopt',
        aliases: ['buypet'],
        category: 'pet',
        description: {
            content: 'Adopt a pet from the catalog with a specific variant.',
            usage: '<type> <variant> <nickname>',
            example: 'dog black Sparky'
        }
    },
    async (_, M, { args }) => {
        try {
            const user = await findUser(M.sender.id)

            // 1. Check Ownership
            if (user.pet && user.pet.type) {
                return M.reply(
                    `❌ You already have a pet (${user.pet.type}). Release it first using ${global.config.prefix}releasepet.`
                )
            }

            const petType = args[0]?.toLowerCase()
            const inputVariant = args[1]?.toLowerCase()

            // 2. Validate Type
            const species = PET_CATALOG[petType]
            if (!species) {
                return M.reply(`❌ Invalid pet type. Available: ${Object.keys(PET_CATALOG).join(', ')}`)
            }

            // 3. Validate Variant
            const variant = species.variants.includes(inputVariant) ? inputVariant : species.variants[0]

            // 4. Nickname Logic (If variant was valid, nickname starts at args[2], otherwise args[1])
            let nickname = species.variants.includes(inputVariant) ? args.slice(2).join(' ') : args.slice(1).join(' ')

            nickname = nickname || `My ${petType}`

            // 4b. Nickname length guard
            if (nickname.length > 20) {
                return M.reply('❌ Pet nickname is too long! Max 20 characters.')
            }

            // 5. Wallet Check
            if (user.wallet - species.price < 0) {
                return M.reply(
                    `💸 You need ₹${species.price.toLocaleString()} but only have ₹${user.wallet.toLocaleString()}.`
                )
            }

            // 6. Build Object matching your PetSchema
            const newPet = {
                type: petType,
                variant: variant,
                name: nickname,
                stats: {
                    hunger: 100,
                    happiness: 100,
                    energy: 100,
                    xp: 0,
                    level: 1
                },
                mood: 'happy',
                isAlive: true,
                lastFed: Date.now(),
                lastPlay: Date.now(),
                lastSleep: Date.now(),
                sleepUntil: 0,
                lastDecay: Date.now(),
                adoptedAt: Date.now(),
                meta: {
                    tier: species.tier,
                    hasSleepAnim: species.hasSleepAnim
                }
            }

            // 7. Database Update — atomic wallet deduction first, then set pet
            // FIX: was editUser({wallet: user.wallet - price}) — not atomic, race condition possible
            const deducted = await removeFromWallet(M.sender.id, species.price)
            if (!deducted) {
                return M.reply('❌ Insufficient funds or transaction failed. Please try again.')
            }
            const success = await editUser(M.sender.id, { pet: newPet })

            if (!success) {
                return M.reply('❌ Database Error!')
            }

            return M.reply(
                `🎉 *ADOPTION SUCCESSFUL!*\n\n` +
                    `🐾 *Type:* ${petType}\n` +
                    `🎨 *Variant:* ${variant}\n` +
                    `🏷️ *Name:* ${nickname}\n` +
                    `🎖️ *Tier:* ${species.tier}\n` +
                    `💰 *Price:* ₹${species.price.toLocaleString()}\n\n` +
                    `Your pet has been initialized with full stats!`
            )
        } catch (err) {
            console.error('[ADOPT ERROR]', err)
            return M.reply('❌ An error occurred.')
        }
    }
)
