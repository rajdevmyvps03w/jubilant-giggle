const command = new Map()

export const enqueue = (commandName, groupJid, fn) => {
    const key = groupJid ? `${commandName}:${groupJid}` : commandName

    const tail = command.get(key) ?? Promise.resolve()
    const next = tail.then(() => fn()).catch(() => {})

    command.set(key, next)

    next.finally(() => {
        if (command.get(key) === next) {
            command.delete(key)
        }
    })

    return next
}
