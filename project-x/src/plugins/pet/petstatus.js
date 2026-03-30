import { plugin } from '../../utils/plugin.js'
import { findUser, processPetDecay } from '../../database/db.js'
import { Sticker, StickerTypes } from 'wa-sticker-formatter'
import axios from 'axios'
import { renderPetCanvas, getPetAssetByAction, getPetRenderPreset, getPetBackground } from '../../functions/pets.js'

plugin(
    {
        name: 'petstatus',
        aliases: ['pet', 'pstatus', 'mypet'],
        category: 'pet',
        description: {
            content: "Check your pet's current condition. Sends a sticker if no background is set."
        }
    },
    async (_, M) => {
        try {
            // FIX: fetch with ALL fields needed — old code used findUser(id) which
            // returns a lean object with jid+lid present, but processPetDecay's
            // $or write needs both. Using no projection here guarantees they exist.
            const user = await findUser(M.sender.id)

            if (!user?.pet || !user.pet.type) {
                return M.reply(`❌ You don't have a pet! Use ${global.config.prefix}petshop to adopt one.`)
            }

            // Run decay synchronously and wait — we need the result before
            // deciding whether to show the status or the death screen.
            const decayResult = await processPetDecay(user)

            // Re-fetch after decay to get the freshest stats from DB
            const freshUser = await findUser(M.sender.id)
            const { pet } = freshUser
            const stats = pet.stats

            // ── Handle Deceased State ────────────────────────────────────────
            if (!pet.isAlive) {
                // FIX: now reads deathReason from DB (was never saved before)
                let deathMsg = `🪦 *RIP ${pet.name}*\n\n`
                if (pet.deathReason === 'starved') {
                    deathMsg += `Your pet starved to death. 🍖 You forgot to feed them.\n\n`
                } else if (pet.deathReason === 'lonely') {
                    deathMsg += `Your pet died from loneliness. 💔 Nobody played with them for over 24 hours.\n\n`
                } else {
                    deathMsg += `Your pet has passed away.\n\n`
                }
                deathMsg += `_Use *${global.config.prefix}releasepet* to clear this profile._`
                return M.reply(deathMsg)
            }

            // ── Warn about pet needing attention (decay warnings) ─────────────
            // decayResult is an array of warning strings when the pet is alive
            // but in a bad state, or null if everything is fine / no tick yet.
            if (Array.isArray(decayResult) && decayResult.length > 0) {
                const lines = []
                if (decayResult.includes('hungry'))
                    lines.push(`🍖 *Starving!* Hunger below 20%, feed it before it dies.`)
                if (decayResult.includes('lonely'))
                    lines.push(`💔 *Lonely!* Happiness at 0%, play with it or it dies in 24h.`)
                else if (decayResult.includes('sad'))
                    lines.push(`😢 *Sad.* Happiness is getting low, play with it soon.`)
                if (decayResult.includes('sleepy'))
                    lines.push(`😴 *Exhausted!* Energy at 0%, use *${global.config.prefix}sleeppet*.`)

                if (lines.length > 0) {
                    await M.reply(`⚠️ *${pet.name} needs your attention!*\n\n${lines.join('\n')}`)
                }
            }

            const isSleeping = pet.sleepUntil && Date.now() < pet.sleepUntil
            const action = isSleeping ? 'sleep' : 'idle'
            const hasCustomBg = pet.meta?.bgName && pet.meta?.bgTheme

            // ── Prepare Media ────────────────────────────────────────────────
            let finalMedia = null
            let isSticker = false

            if (hasCustomBg) {
                // Canvas path — renders pet icon on custom background
                const assetData = getPetAssetByAction(pet.type, pet.variant, 'icon')
                const bgUrl = getPetBackground(pet.meta.bgName, pet.meta.bgTheme)
                const preset = getPetRenderPreset(pet.type)

                finalMedia = await renderPetCanvas({
                    backgroundUrl: bgUrl,
                    petIconUrl: assetData.url,
                    x: preset.x,
                    y: preset.y,
                    scale: preset.scale,
                    shadow: true
                })
                isSticker = false
            } else {
                // Sticker path — sends animated GIF as a WhatsApp sticker
                const assetData = getPetAssetByAction(pet.type, pet.variant, action)
                const response = await axios.get(assetData.url, { responseType: 'arraybuffer' })
                const buffer = Buffer.from(response.data)

                const sticker = new Sticker(buffer, {
                    pack: `${pet.name}'s Status`,
                    author: `Level ${stats.level} ${pet.type}`,
                    type: StickerTypes.FULL,
                    quality: 70
                })
                finalMedia = await sticker.build()
                isSticker = true
            }

            // ── Build Caption ────────────────────────────────────────────────
            const statusEmoji = isSleeping ? '😴' : '💖'
            const createBar = (value) => {
                const filled = Math.round(value / 10)
                return '🟩'.repeat(filled) + '⬜'.repeat(10 - filled)
            }

            let caption = `${statusEmoji} *PET PROFILE: ${pet.name.toUpperCase()}*\n\n`
            caption += `🧬 *Species:* ${pet.type} (${pet.variant})\n\n`
            caption += `🆙 *Level:* ${stats.level} | *XP:* ${stats.xp}/${stats.level * 100}\n\n`
            caption += `🎭 *Mood:* ${pet.mood}\n\n`
            caption += `🍴 *Hunger:* ${stats.hunger}%\n${createBar(stats.hunger)}\n\n`
            caption += `🎮 *Happiness:* ${stats.happiness}%\n${createBar(stats.happiness)}\n\n`
            caption += `⚡ *Energy:* ${stats.energy}%\n${createBar(stats.energy)}\n\n`

            if (isSleeping) {
                const remaining = Math.ceil((pet.sleepUntil - Date.now()) / 60000)
                caption += `💤 *Status:* Sleeping (Wakes in ${remaining}m)\n`
            } else {
                caption += `✅ *Status:* Awake and ready to play!\n`
            }

            // ── Send ─────────────────────────────────────────────────────────
            if (isSticker) {
                await M.replyRaw({ sticker: finalMedia })
                return M.reply(caption)
            } else {
                return M.reply(finalMedia, 'image', undefined, caption)
            }
        } catch (err) {
            console.error('[PET STATUS ERROR]', err)
            return M.reply('❌ Failed to process pet status.')
        }
    }
)
