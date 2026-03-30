import {
    makeWASocket,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    useMultiFileAuthState,
    DisconnectReason,
    Browsers
} from 'baileys'
import pino from 'pino'
import chalk from 'chalk'
import fs from 'fs'
import QRCode from 'qrcode'
import NodeCache from 'node-cache'
import cron from 'node-cron'
import path from 'path'
import { startServer, broadcast } from './server.js'
import {
    connect,
    setGroup,
    updateContact,
    loadDynamicMods,
    runMarketTick,
    runGlobalRevalue,
    loadSupportGroups
} from './database/db.js'
import serialize from './utils/serialize.js'
import eventHandler from './handler/event.js'
import { restoreAuctions } from './functions/auction.js'
import { initCharacterAI } from './functions/cai.js'
import messageHandler from './handler/message.js'
import { runDailyCardSpawn } from './handler/card.js'
import { loadPlugins } from './utils/plugin.js'
import { getConfig } from './config.js'

global.config = getConfig()

const SESSIONS_ROOT = './sessions'
const PORT = 8073
let isServerStarted = false

const launchBot = async (sessionId, label) => {
    const sessionPath = path.join(SESSIONS_ROOT, sessionId)

    let isConnecting = false
    let lastTry = 0
    let lastDisconnectReason = ''

    const main = async () => {
        const { state, saveCreds } = await useMultiFileAuthState(sessionPath)
        const { version } = await fetchLatestBaileysVersion()

        const groupCache = new NodeCache({ stdTTL: 30 * 60, useClones: false })
        const cache = new NodeCache()

        const client = makeWASocket({
            logger: pino({ level: 'fatal' }),
            version,
            browser: Browsers.macOS('Safari'),
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'fatal' }))
            },
            markOnlineOnConnect: false,
            generateHighQualityLinkPreview: true,
            emitOwnEvents: true,
            syncFullHistory: false,
            emitOwnEvents: true,
            generateHighQualityLinkPreview: true,
            linkPreviewImageThumbnailWidth: 1920,
            msgRetryCounterCache: cache,
            mediaCache: cache,
            userDevicesCache: cache,
            callOfferCache: cache,
            connectTimeoutMs: 3000000,
            keepAliveIntervalMs: 1500000,
            cachedGroupMetadata: async (jid) => groupCache.get(jid)
        })

        client.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update
            const now = Date.now()

            if (qr) {
                const qrImage = await QRCode.toDataURL(qr, { scale: 10 })
                broadcast({ type: 'qr', image: qrImage, session: sessionId, label })
                console.log(chalk.yellow(`[${label}] 💫 New QR generated — scan with WhatsApp.`))
            }

            if (connection === 'connecting') {
                if (!isConnecting && now - lastTry > 5000) {
                    isConnecting = true
                    lastTry = now
                    broadcast({ type: 'status', data: 'connecting', session: sessionId, label })
                    console.log(chalk.blueBright(`[${label}] 🔌 Connecting...`))
                }
            } else if (connection === 'open') {
                isConnecting = false
                broadcast({ type: 'status', data: 'connected', session: sessionId, label })
                console.log(chalk.greenBright(`[${label}] ✅ Connected successfully.`))

                Object.assign(client, {
                    _sessionId: sessionId,
                    cachedGroupMetadata: async (jid) => {
                        let metadata = groupCache.get(jid)
                        if (!metadata && jid.endsWith('@g.us')) {
                            metadata = await client.groupMetadata(jid).catch(() => ({
                                id: jid,
                                subject: 'Unknown Group'
                            }))
                            if (metadata.id) {
                                groupCache.set(jid, metadata)
                            }
                        }
                        return metadata
                    }
                })

                const groups = await client.groupFetchAllParticipating()
                Object.keys(groups).forEach((id) => {
                    setGroup({ id })
                    groupCache.set(id, groups[id])
                })

                await loadDynamicMods()
                await loadPlugins()
                await restoreAuctions(client)
                initCharacterAI()
                await loadSupportGroups()
                console.log(chalk.cyan(`[${label}] ✅ Global init done.`))

                cron.schedule('*/60 * * * *', () => {
                    runDailyCardSpawn(client)
                    runMarketTick()
                })

                cron.schedule('0 3 * * *', async () => {
                    console.log(`[${label}] 🔄 Starting global card revaluation...`)
                    try {
                        const { users, cards } = await runGlobalRevalue()
                        console.log(`[${label}] ✅ Done ${users} users, ${cards} cards updated.`)
                    } catch (err) {
                        console.error(`[${label}] ❌ Revalue failed:`, err.message)
                    }
                })
            } else if (connection === 'close') {
                isConnecting = false

                const statusCode = lastDisconnect?.error?.output?.statusCode || 0
                console.log(chalk.red(`[${label}] ❌ Disconnected: ${DisconnectReason[statusCode] || statusCode}`))

                const shouldReconnect = statusCode !== DisconnectReason.loggedOut
                if (!shouldReconnect) {
                    console.log(chalk.red(`[${label}] 👋 Logged out. Cleaning up...`))
                    if (fs.existsSync(sessionPath)) {
                        await fs.promises.rm(sessionPath, { recursive: true, force: true })
                    }
                    setTimeout(main, 3000)
                } else {
                    lastDisconnectReason = lastDisconnect?.error?.message || lastDisconnectReason
                    console.log(`[${label}] 🔁 Reconnecting...`)
                    main()
                }
            }
        })

        client.ev.on('creds.update', async () => {
            await saveCreds()
        })

        client.ev.on('messages.upsert', async ({ type, messages }) => {
            if (type !== 'notify') {
                return
            }
            if (type === 'append') {
                return false
            }

            const msg = messages[0]
            if (!msg.message || msg.key.fromMe || msg.key.remoteJid === 'status@broadcast') {
                return
            }

            const smsg = await serialize(client, msg)
            if (!smsg?.sender || !smsg?.sender?.jid || !smsg?.sender?.id) {
                return
            }

            await messageHandler(client, smsg)
        })

        client.ev.on('contacts.update', (contacts) => updateContact(contacts))

        client.ev.on('groups.update', async (updates) => {
            for (const update of updates) {
                const metadata = await client.groupMetadata(update.id).catch(() => null)
                if (metadata) {
                    groupCache.set(update.id, metadata)
                }
            }
        })

        client.ev.on('group-participants.update', async (event) => {
            const metadata = await client.groupMetadata(event.id).catch(() => null)
            if (metadata) {
                groupCache.set(event.id, metadata)
            }
            await eventHandler(client, event)
        })
    }

    const startWithRetry = async () => {
        try {
            await main()
        } catch (err) {
            console.error(chalk.red(`[${label}] Fatal Error:`), err)
            setTimeout(startWithRetry, 10000)
        }
    }

    await startWithRetry()
}

const boot = async () => {
    try {
        await connect(global.config.mongo)

        if (!isServerStarted) {
            await startServer(PORT)
            isServerStarted = true
        }

        const sessions = global.config.sessions
        console.log(chalk.magenta(`[Main] 🤖 Launching ${sessions.length} bot(s)...`))

        await Promise.all(sessions.map((s) => launchBot(s.id, s.label)))
    } catch (err) {
        console.error(chalk.red('Fatal boot error:'), err)
        setTimeout(boot, 10000)
    }
}

boot()
