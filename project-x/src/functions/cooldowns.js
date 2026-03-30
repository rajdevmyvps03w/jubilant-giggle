export const HIGH_CD_COMMANDS = new Set([
    'gamble',
    'bet',
    'g',
    'slot',
    'casino',
    'openlootbox',
    'openlb',
    'lootboxopen'
])

export const DEFAULT_CD_HIGH = 40_000 // 60s — economy spin commands
export const DEFAULT_CD_LOW = 10_000 //  20s — all other commands

export const getFloorCooldown = (cmdName) =>
    HIGH_CD_COMMANDS.has(cmdName?.toLowerCase()) ? DEFAULT_CD_HIGH : DEFAULT_CD_LOW

export const effectiveCooldown = (cmdName, groupCooldownMs) => {
    const floor = getFloorCooldown(cmdName)
    return Math.max(floor, groupCooldownMs ?? 0)
}
