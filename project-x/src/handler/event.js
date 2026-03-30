import { isGroupFeatureActive } from '../database/db.js'

export default async (client, event) => {
    const { action, author, participants, id: jid } = event

    if (!(await isGroupFeatureActive(jid, 'event_wish'))) {
        return
    }

    const actions = {
        promote: [
            '🎖️ {users} just got promoted by {author}! Power level rising!',
            '🚀 {users} got boosted by {author}! Admin mode unlocked!',
            '👑 {author} just made {users} feel like royalty!',
            "🧠 {users} got promoted! Guess who's the new boss? {author}!"
        ],
        demote: [
            '😬 {users} just got demoted by {author}! RIP admin dreams!',
            '📉 {users} was sent back to the mortal realm by {author}!',
            '🪓 {author} just chopped {users}’s admin rights!',
            '🥲 {users} got demoted blame {author}!'
        ],
        add: [
            "👋 Welcome {users}! Invited by {author}! Let's party 🎉",
            '💫 {users} just joined the chaos thanks to {author}!',
            '🤝 {author} brought {users} to the squad!',
            '🚪 {users} just walked in, guided by {author}!'
        ],
        remove: [
            '💨 {users} got kicked out by {author}! Bye bye 👋',
            '🧹 {author} just cleaned up the group {users} is gone!',
            '🦶 {users} got booted out! Courtesy of {author}.',
            '🔥 {author} just said ‘nope’ and removed {users}!'
        ]
    }

    const taggedParticipants = participants.map(({ id }) => `@${id.split('@')[0]}`).join(', ')
    const taggedAuthor = `@${author?.split('@')[0]}`

    // pick a random funny line
    const messages = actions[action] || ['{users} action done by {author}.']
    const text = messages[Math.floor(Math.random() * messages.length)]
        .replace('{users}', taggedParticipants)
        .replace('{author}', taggedAuthor)

    await client.sendMessage(jid, {
        text,
        mentions: [...participants.map(({ id }) => id), author]
    })
}
