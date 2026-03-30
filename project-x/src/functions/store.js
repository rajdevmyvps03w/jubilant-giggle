// utils/store.js

export const storeItems = [
    {
        id: 1,
        name: 'luckpotion',
        label: '🍀 Lucky Potion',
        pricePerDay: 1000,
        type: 'POTION',
        desc: 'Boosts your luck for loot and rewards.'
    },
    {
        id: 2,
        name: 'robprotection',
        label: '🛡️ Rob Protection Potion',
        pricePerDay: 1500,
        type: 'POTION',
        desc: 'Prevents you from being robbed by others.'
    },
    {
        id: 3,
        name: 'moneypotion',
        label: '💰 Money Potion',
        pricePerDay: 2000,
        type: 'POTION',
        desc: 'Increases your money rewards temporarily.'
    },
    {
        id: 4,
        name: 'exppotion',
        label: '⚡ EXP Potion',
        pricePerDay: 2500,
        type: 'POTION',
        desc: 'Doubles your EXP gain for a limited time.'
    },
    {
        id: 5,
        name: 'lootbox',
        label: '🎁 Lootbox',
        price: 150000,
        type: 'LOOTBOX',
        desc: 'Contains random rewards and surprises.'
    },
    {
        id: 6,
        name: 'discountcode',
        label: '🎟️ Discount Code',
        price: 20000,
        type: 'REDEEMCODE',
        desc: 'Gives you a random discount coupon for future purchases.'
    }
]

export const getStoreItem = (index) => {
    const item = storeItems.find((i) => i.id === Number(index))
    return item || null
}
