import { plugin } from '../../utils/plugin.js'
import { getBuffer } from '../../functions/helpler.js'
import { findUser, editUser } from '../../database/db.js'
import axios from 'axios'
import { getRank } from '../../functions/stats.js'

const MS_PER_DAY = 24 * 60 * 60 * 1000

plugin(
    {
        name: 'profile',
        aliases: ['me', 'userinfo'],
        category: 'misc',
        isGroup: true,
        description: {
            content: 'View your profile information including bio, rank, and relationship status.'
        }
    },
    async (client, M) => {
        try {
            const user = await findUser(M.sender.id)
            const { name, age, gender, relationship, ban, dateOfLogin, exp, slug, customBio, customPfp } = user
            const { name: rank } = getRank(exp || 0)

            const now = Date.now()

            // ── Custom Bio ───────────────────────────────────────────────────
            let bioSection = '💬 *Bio:* '
            try {
                const statusData = await client.fetchStatus(M.sender.id)
                if (Array.isArray(statusData) && statusData[0]?.status?.status) {
                    bioSection += statusData[0].status.status
                }
            } catch {
                bioSection += 'Unable to fetch bio.'
            }

            if (customBio?.text && customBio?.expiresAt) {
                if (now > customBio.expiresAt) {
                    editUser(M.sender.id, { customBio: null }).catch(() => {})
                } else {
                    const daysLeft = Math.ceil((customBio.expiresAt - now) / MS_PER_DAY)
                    let urgency = ''
                    if (daysLeft <= 3) {
                        urgency = ' ⚠️ _Expiring very soon!_'
                    } else if (daysLeft <= 7) {
                        urgency = ` _(expires in ${daysLeft}d)_`
                    }

                    bioSection =
                        `💬 *Bio:* ${customBio.text}\n\n` +
                        `🗓️ *Bio expires in:* ${daysLeft} day${daysLeft !== 1 ? 's' : ''}${urgency}`
                }
            }

            let pfpBuffer = null
            let pfpMediaType = 'image' // 'image' | 'video'
            let pfpCaption = ''

            if (customPfp?.url && customPfp?.expiresAt) {
                if (now > customPfp.expiresAt) {
                    // Expired — clean up silently, fall through to WA pfp
                    await editUser(M.sender.id, { customPfp: null }).catch(() => {})
                } else {
                    const daysLeft = Math.ceil((customPfp.expiresAt - now) / MS_PER_DAY)
                    let urgency = ''
                    if (daysLeft <= 3) {
                        urgency = ' ⚠️ _Expiring very soon!_'
                    } else if (daysLeft <= 7) {
                        urgency = ` _(${daysLeft}d left)_`
                    }

                    pfpCaption = `🖼️ *Custom PFP expires in:* ${daysLeft} day${daysLeft !== 1 ? 's' : ''}${urgency}\n\n`

                    try {
                        pfpBuffer = Buffer.from(
                            (
                                await axios.get(customPfp.url, {
                                    responseType: 'arraybuffer',
                                    headers: {
                                        'User-Agent':
                                            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
                                        Referer: 'https://qu.ax/',
                                        Accept: '*/*'
                                    }
                                })
                            ).data
                        )
                        pfpMediaType = customPfp.mediaType === 'video' ? 'video' : 'image'
                    } catch (err) {
                        console.warn('[PROFILE] Custom PFP fetch failed, falling back:', err.message)
                        pfpBuffer = null
                    }
                }
            }

            // Fallback: WhatsApp native pfp
            if (!pfpBuffer) {
                try {
                    const waUrl = await client.profilePictureUrl(M.sender.id, 'image')
                    pfpBuffer = await getBuffer(waUrl)
                    pfpMediaType = 'image'
                } catch {
                    // Last resort: generated letter avatar
                    try {
                        const avatarUrl =
                            'https://ui-avatars.com/api/?name=' +
                            encodeURIComponent(name) +
                            '&background=random&size=256'
                        pfpBuffer = await getBuffer(avatarUrl)
                        pfpMediaType = 'image'
                    } catch {
                        pfpBuffer = null
                    }
                }
            }

            // ── Other sections ───────────────────────────────────────────────
            const statusEmoji = ban?.status ? '⛔ Banned' : '✅ Active'
            const banReason = ban?.status ? `\n🛑 *Reason:* ${ban.reason || 'Not specified'}` : ''
            const relInfo = relationship?.status ? `❤️ In relationship with *${relationship.name}*` : '💔 Single'

            let slugSection = '💍 *Slug Marriage:* Not married'
            if (slug?.isMarried && slug?.data?.name) {
                slugSection =
                    '💍 *Slug Marriage:*\n' + `   👤 ${slug.data.name}\n` + `   🔗 ${slug.data.url || 'No link'}`
            }

            // ── Assemble ─────────────────────────────────────────────────────
            const profileText =
                '👤 *USER PROFILE* 👤\n\n' +
                `📛 *Name:* ${name}\n\n` +
                `🎂 *Age:* ${age}\n\n` +
                `🚻 *Gender:* ${gender?.toUpperCase()}\n\n` +
                `${bioSection}\n\n` +
                `${pfpCaption}` +
                `💞 *Relationship:* ${relInfo}\n\n` +
                `${slugSection}\n\n` +
                `⚙️ *Status:* ${statusEmoji}${banReason}\n\n` +
                `🏅 *Rank:* ${rank}\n\n` +
                `⭐ *XP:* ${(exp || 0).toLocaleString()}\n\n` +
                `🕓 *Joined:* ${new Date(dateOfLogin).toDateString()}`

            // ── Send ─────────────────────────────────────────────────────────
            if (!pfpBuffer) {
                return M.reply(profileText.trim())
            }

            if (pfpMediaType === 'video') {
                // GIF (converted to mp4) or mp4 custom pfp
                return M.replyRaw({
                    video: pfpBuffer,
                    mimetype: 'video/mp4',
                    gifPlayback: true,
                    caption: profileText.trim()
                })
            }

            return M.reply(pfpBuffer, 'image', undefined, profileText.trim())
        } catch (err) {
            console.error('[PROFILE COMMAND ERROR]', err)
            return M.reply('❌ An error occurred while generating your profile card.')
        }
    }
)
