import { getContentType, downloadContentFromMessage } from 'baileys'
import { getBuffer } from '../functions/helpler.js'

export default async (client, M) => {
    const msgObj = {}
    try {
        if (!M?.message) {
            return
        }

        const type = getContentType(M.message)
        const mData = M.message[type]
        let body = ''

        const getBody = (msg) => {
            return (
                msg?.conversation ||
                msg.extendedTextMessage?.text ||
                msg.imageMessage?.caption ||
                msg.videoMessage?.caption ||
                msg.documentMessage?.caption ||
                msg.documentWithCaptionMessage?.message?.documentMessage?.caption ||
                msg.ephemeralMessage?.message?.conversation ||
                msg.ephemeralMessage?.message?.extendedTextMessage?.text ||
                msg.ephemeralMessage?.message?.imageMessage?.caption ||
                msg.ephemeralMessage?.message?.videoMessage?.caption ||
                msg.ephemeralMessage?.message?.documentWithCaptionMessage?.message?.documentMessage?.caption ||
                msg.editedMessage?.message?.protocolMessage?.editedMessage?.conversation ||
                msg.editedMessage?.message?.protocolMessage?.editedMessage?.extendedTextMessage?.text
            )
        }

        body = getBody(M.message)

        const from = M.key.remoteJid
        const botNumber = sanitizeLid(client.user.lid)
        const chat = from.endsWith('g.us') ? 'group' : 'dm'
        let isBotMentioned = chat === 'dm'

        const sender = {
            name: M.pushName,
            jid: M.key.fromMe
                ? sanitizeLid(client.user.id)
                : chat === 'group'
                  ? M.key.participantAlt
                  : M.key.remoteJidAlt,
            id: M.key.fromMe ? sanitizeLid(client.user.lid) : chat === 'group' ? M.key.participant : M.key.remoteJid
        }

        let displayType = type?.replace('Message', '')
        const contextInfo = M.message?.extendedTextMessage?.contextInfo || mData?.contextInfo
        const isQuoted = !!contextInfo?.quotedMessage

        let mentioned = contextInfo?.mentionedJid || []
        if (mentioned.length > 0) {
            isBotMentioned = mentioned.includes(botNumber)
        }

        if (isQuoted) {
            const quotedMsg = contextInfo.quotedMessage
            const quotedType = getContentType(quotedMsg)
            displayType = 'quotedMessage'

            if (contextInfo.participant === botNumber && chat === 'group') {
                isBotMentioned = true
            }

            const quotedText = getBody(quotedMsg) || null

            msgObj['quotedMessage'] = {
                delete: async () =>
                    await client.sendMessage(from, {
                        delete: {
                            id: contextInfo.stanzaId,
                            fromMe: contextInfo.participant === botNumber,
                            participant: contextInfo.participant,
                            remoteJid: from
                        }
                    }),
                participant: contextInfo.participant,
                text: quotedText,
                type: quotedType.replace('Message', ''),
                ...(quotedMsg[quotedType] || {}),
                download: async () => await download(quotedMsg, quotedType)
            }
        }

        if (chat === 'group') {
            const groupMetadata =
                typeof client.cachedGroupMetadata === 'function'
                    ? await client.cachedGroupMetadata(from).catch(() => ({}))
                    : {}
            const groupName = groupMetadata.subject || ''
            const participants =
                groupMetadata.participants?.map((p) => ({
                    id: p.id || null,
                    admin: p.admin || null,
                    full: p
                })) || []

            const groupAdmins = participants
                .filter((p) => p.admin === 'admin' || p.admin === 'superadmin')
                .map((p) => p.id)

            Object.assign(msgObj, {
                groupMetadata,
                groupName,
                participants,
                groupOwner: participants.find((p) => p.admin === 'superadmin')?.id || '',
                groupAdmins,
                isBotAdmin: groupAdmins.includes(botNumber),
                isAdmin: groupAdmins.includes(sender.id),
                isGroupOwner:
                    groupAdmins.includes(sender.id) &&
                    participants.find((p) => p.id === sender.id)?.admin === 'superadmin'
            })
        }

        Object.assign(msgObj, {
            sender,
            body,
            from,
            chat,
            type: displayType,
            isQuoted,
            mentioned,
            botNumber,
            isBotMentioned,
            ...(isQuoted ? mData : {}),
            download: async () => await download(M.message, type),
            delete: async () => await client.sendMessage(from, { delete: M.key }),
            replyRaw: async (obj) => client.sendMessage(from, obj, { quoted: M }),
            reply: async (content, type = 'text', mimetype, caption, mentions, options = {}) => {
                options.quoted = M
                if (type === 'text' && Buffer.isBuffer(content)) {
                    throw new Error('Cannot send a Buffer as a text message')
                }

                return client.sendMessage(
                    from,
                    {
                        [type]: content,
                        mimetype,
                        mentions,
                        caption
                    },
                    options
                )
            }
        })
        return msgObj
    } catch (er) {
        console.error('[SERIALIZE_ERROR]:', er)
    }
}

const download = async (message, type) => {
    let target = message[type]
    let actualType = type

    if (type === 'viewOnceMessageV2' || type === 'viewOnceMessageV2Extension') {
        target = target?.message || target
        actualType = Object.keys(target)[0]
        target = target[actualType]
    } else if (type === 'buttonsMessage') {
        actualType = Object.keys(target)[1]
        target = target[actualType]
    }

    const stream = await downloadContentFromMessage(target, actualType.replace('Message', ''))
    const chunks = []
    for await (const chunk of stream) {
        chunks.push(chunk)
    }
    return Buffer.concat(chunks)
}

const sanitizeLid = (lid) => {
    if (!lid) {
        return ''
    }
    const [a, b] = lid.split('@')
    return a.split(':').shift()?.concat('@', b) ?? lid
}
