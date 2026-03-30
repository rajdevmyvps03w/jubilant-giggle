import express from 'express'
import { createServer } from 'http'
import { WebSocketServer } from 'ws'

const app = express()
const server = createServer(app)
const wss = new WebSocketServer({ server })

// Per-session state: sessionId → { status, qr, label }
const sessionStates = {}

app.get('/', (_, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Project-X Dashboard</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
                *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                    background: #0f172a;
                    color: white;
                    min-height: 100vh;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    padding: 40px 20px;
                    gap: 30px;
                }
                h1 { font-size: 1.6rem; color: #38bdf8; letter-spacing: 0.05em; }
                #bots {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 24px;
                    justify-content: center;
                    width: 100%;
                }
                .card {
                    background: #1e293b;
                    border: 1px solid #334155;
                    border-radius: 20px;
                    padding: 28px 24px;
                    width: 320px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 16px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.4);
                }
                .card h2 { font-size: 1.1rem; color: #94a3b8; }
                .status { font-weight: 600; font-size: 0.95rem; color: #38bdf8; text-align: center; }
                .qr-box {
                    background: white;
                    padding: 12px;
                    border-radius: 12px;
                    display: none;
                }
                .qr-box img { width: 220px; height: 220px; display: block; border-radius: 4px; }
                .loader {
                    border: 3px solid #334155;
                    border-top: 3px solid #38bdf8;
                    border-radius: 50%;
                    width: 18px; height: 18px;
                    animation: spin 1s linear infinite;
                    display: inline-block;
                    vertical-align: middle;
                    margin-right: 8px;
                }
                @keyframes spin { to { transform: rotate(360deg); } }
                .dot-online { color: #4ade80; }
                .dot-offline { color: #f87171; }
            </style>
        </head>
        <body>
            <h1>🤖 Project-X Dashboard</h1>
            <div id="bots"></div>
            <script>
                const botsEl = document.getElementById('bots')
                const cards = {}

                function getOrCreateCard(sessionId, label) {
                    if (cards[sessionId]) return cards[sessionId]

                    const card = document.createElement('div')
                    card.className = 'card'
                    card.innerHTML = \`
                        <h2>\${label || sessionId}</h2>
                        <div class="status" id="status-\${sessionId}">
                            <span class="loader"></span> Initializing...
                        </div>
                        <div class="qr-box" id="qr-\${sessionId}">
                            <img id="qr-img-\${sessionId}" src="" alt="QR Code">
                        </div>
                    \`
                    botsEl.appendChild(card)
                    cards[sessionId] = card
                    return card
                }

                const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
                const ws = new WebSocket(protocol + '//' + location.host)

                ws.onmessage = (e) => {
                    const msg = JSON.parse(e.data)
                    const id = msg.session

                    // Bootstrap: server sends all known sessions on connect
                    if (msg.type === 'init') {
                        for (const [sid, state] of Object.entries(msg.sessions)) {
                            getOrCreateCard(sid, state.label)
                            applyStatus(sid, state.status)
                            if (state.qr && state.status !== 'connected') {
                                showQr(sid, state.qr)
                            }
                        }
                        return
                    }

                    if (!id) return
                    getOrCreateCard(id, msg.label || id)

                    if (msg.type === 'qr') {
                        showQr(id, msg.image)
                    } else if (msg.type === 'status') {
                        applyStatus(id, msg.data)
                    }
                }

                function showQr(id, image) {
                    const statusEl = document.getElementById('status-' + id)
                    const qrBox   = document.getElementById('qr-' + id)
                    const qrImg   = document.getElementById('qr-img-' + id)
                    if (statusEl) statusEl.innerText = '📷 Scan QR Code:'
                    if (qrImg)   qrImg.src = image
                    if (qrBox)   qrBox.style.display = 'block'
                }

                function applyStatus(id, data) {
                    const statusEl = document.getElementById('status-' + id)
                    const qrBox   = document.getElementById('qr-' + id)
                    if (!statusEl) return
                    if (data === 'connected') {
                        statusEl.innerHTML = '<span class="dot-online">✅ Online</span>'
                        if (qrBox) qrBox.style.display = 'none'
                    } else if (data === 'connecting') {
                        statusEl.innerHTML = '<span class="loader"></span> Connecting...'
                    } else {
                        statusEl.innerText = 'Status: ' + data
                    }
                }
            </script>
        </body>
        </html>
    `)
})

// ─── broadcast now always requires a sessionId ───────────────────────────────

export const broadcast = (data) => {
    const id = data.session
    if (id) {
        if (!sessionStates[id]) {
            sessionStates[id] = { status: 'initializing', qr: null, label: id }
        }
        if (data.type === 'status') {
            sessionStates[id].status = data.data
        }
        if (data.type === 'qr') {
            sessionStates[id].qr = data.image
        }
        if (data.label) {
            sessionStates[id].label = data.label
        }
    }

    wss.clients.forEach((client) => {
        if (client.readyState === 1) {
            client.send(JSON.stringify(data))
        }
    })
}

// On new WebSocket connection, send current state of ALL sessions
wss.on('connection', (ws) => {
    ws.send(JSON.stringify({ type: 'init', sessions: sessionStates }))
})

export const startServer = (port) => {
    return new Promise((resolve) => {
        server.listen(port, () => {
            console.log(`[Server] 🌐 Dashboard: http://localhost:${port}`)
            resolve()
        })
    })
}
