import WebSocket from 'ws'
import { v4 as uuidv4 } from 'uuid'

const CHARACTER_ID = 'mOuKD3RdUXdqnaRRKjm8An-VwdRmJyD4KdCikYEwHEM'
const USER_ID = '533467924'
const USER_NAME = 'BlueCaracal964'
const AUTH_TOKEN = 'Token 68342b3c0a066d567f43c5370de2f9060a322b71'

let _ws = null
let _chatId = uuidv4()
let _chatReady = false
let _pendingQueue = []
let _pendingContext = null // { M } — the original message object

const createChat = () => {
    _ws.send(
        JSON.stringify({
            command: 'create_chat',
            request_id: uuidv4(),
            origin_id: 'web-next',
            payload: {
                chat_type: 'TYPE_ONE_ON_ONE',
                chat: {
                    chat_id: _chatId,
                    creator_id: USER_ID,
                    visibility: 'VISIBILITY_PRIVATE',
                    character_id: CHARACTER_ID,
                    type: 'TYPE_ONE_ON_ONE'
                },
                with_greeting: true
            }
        })
    )
}

const flushQueue = () => {
    while (_pendingQueue.length > 0 && _chatReady) {
        const { text, M } = _pendingQueue.shift()
        _sendNow(text, M)
    }
}

const _sendNow = (text, M) => {
    _ws.send(
        JSON.stringify({
            command: 'create_and_generate_turn',
            request_id: uuidv4(),
            origin_id: 'web-next',
            payload: {
                chat_type: 'TYPE_ONE_ON_ONE',
                num_candidates: 1,
                tts_enabled: false,
                selected_language: '',
                character_id: CHARACTER_ID,
                user_name: USER_NAME,
                turn: {
                    turn_key: {
                        chat_id: _chatId,
                        turn_id: uuidv4()
                    },
                    author: {
                        author_id: USER_ID,
                        is_human: true,
                        name: USER_NAME
                    },
                    candidates: [
                        {
                            candidate_id: uuidv4(),
                            raw_content: text
                        }
                    ]
                },
                previous_annotations: {},
                generate_comparison: false
            }
        })
    )

    // Store M so the reply handler can use M.reply
    _pendingContext = { M }
}

export const initCharacterAI = () => {
    if (_ws) {
        return
    }

    _ws = new WebSocket('wss://neo.character.ai/ws/', {
        headers: {
            Origin: 'https://character.ai',
            Authorization: AUTH_TOKEN
        }
    })

    _ws.on('open', () => {
        console.log('[c.ai] Connected — creating chat session...')
        createChat()
    })

    _ws.on('message', (buf) => {
        let msg
        try {
            msg = JSON.parse(buf.toString())
        } catch {
            return
        }

        if (msg.command === 'create_chat_response') {
            _chatReady = true
            console.log('[c.ai] Chat session ready.')
            flushQueue()
            return
        }

        if (
            (msg.command === 'add_turn' || msg.command === 'update_turn') &&
            msg.turn?.author?.author_id === CHARACTER_ID &&
            msg.turn?.candidates?.[0]?.is_final
        ) {
            const reply = msg.turn.candidates[0].raw_content
            if (!reply || !_pendingContext) {
                return
            }

            const { M } = _pendingContext
            _pendingContext = null

            // M.reply quotes the original message automatically
            M.reply(reply).catch((e) => console.error('[c.ai] M.reply failed:', e.message))
        }
    })

    _ws.on('error', (err) => {
        console.error('[c.ai] WS error:', err.message)
    })

    _ws.on('close', () => {
        console.warn('[c.ai] WS closed — reconnecting in 5s...')
        _ws = null
        _chatReady = false
        setTimeout(() => initCharacterAI(), 5000)
    })
}

export const sendToCharacterAI = (text, M) => {
    if (!_ws) {
        return
    }

    if (!_chatReady) {
        _pendingQueue.push({ text, M })
        return
    }

    _sendNow(text, M)
}
