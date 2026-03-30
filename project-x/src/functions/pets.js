import { createCanvas, loadImage } from 'canvas'
const BASE_URL = 'https://raw.githubusercontent.com/tonybaloney/vscode-pets/main/media'

const BG_BASE_URL = 'https://raw.githubusercontent.com/tonybaloney/vscode-pets/main/media/backgrounds'

export const PET_BACKGROUNDS = Object.freeze({
    autumn: {
        light: 'background-light-medium.png',
        dark: 'background-dark-medium.png',
        default: 'background.png'
    },

    beach: {
        light: 'background-light.png',
        dark: 'background-dark.png',
        default: 'background-light.png'
    },

    forest: {
        light: 'background-light-medium.png',
        dark: 'background-dark-medium.png',
        default: 'background.png'
    },

    winter: {
        light: 'background-light-medium.png',
        dark: 'background-dark-medium.png',
        default: 'background.png'
    }
})

export const getPetBackground = (name = 'forest', theme = 'default') => {
    const bg = PET_BACKGROUNDS[name]
    if (!bg) {
        return null
    }

    const file = bg[theme] ?? bg.default
    return `${BG_BASE_URL}/${name}/${file}`
}

/* =========================
   GET RANDOM BACKGROUND
========================= */

export const getRandomPetBackground = (theme = 'default') => {
    const keys = Object.keys(PET_BACKGROUNDS)
    const pick = keys[Math.floor(Math.random() * keys.length)]
    return getPetBackground(pick, theme)
}

/* =========================
   LIST ALL BACKGROUNDS
========================= */

export const getAllPetBackgrounds = () => Object.keys(PET_BACKGROUNDS)

export const renderPetCanvas = async ({
    backgroundUrl,
    petIconUrl,
    x = 0,
    y = 0,
    scale = 1,
    shadow = false,
    width = 512,
    height = 512
}) => {
    // create canvas
    const canvas = createCanvas(width, height)
    const ctx = canvas.getContext('2d')

    // load images
    const [bg, pet] = await Promise.all([loadImage(backgroundUrl), loadImage(petIconUrl)])

    // draw background (cover)
    ctx.drawImage(bg, 0, 0, width, height)

    // calculate scaled pet size
    const petW = pet.width * scale
    const petH = pet.height * scale

    // optional shadow
    if (shadow) {
        ctx.shadowColor = 'rgba(0,0,0,0.35)'
        ctx.shadowBlur = 15
        ctx.shadowOffsetY = 6
    }

    // draw pet
    ctx.drawImage(pet, x, y, petW, petH)

    // reset shadow
    ctx.shadowColor = 'transparent'

    return canvas.toBuffer('image/png')
}

export const PET_CATALOG = Object.freeze({
    dog: {
        price: 5000,
        tier: 'S',
        variants: ['akita', 'black', 'brown', 'red', 'white'],
        hasSleepAnim: true
    },

    fox: {
        price: 4800,
        tier: 'S',
        variants: ['red', 'white'],
        hasSleepAnim: true
    },

    panda: {
        price: 5200,
        tier: 'S',
        variants: ['black', 'brown'],
        hasSleepAnim: true
    },

    turtle: {
        price: 4200,
        tier: 'A',
        variants: ['green', 'orange'],
        hasSleepAnim: true
    },

    snake: {
        price: 3500,
        tier: 'B',
        variants: ['green'],
        hasSleepAnim: false
    },

    'rubber-duck': {
        price: 3000,
        tier: 'B',
        variants: ['yellow'],
        hasSleepAnim: false
    },

    rat: {
        price: 2800,
        tier: 'A',
        variants: ['brown', 'gray', 'white'],
        hasSleepAnim: false
    },

    morph: {
        price: 2600,
        tier: 'B',
        variants: ['purple'],
        hasSleepAnim: false
    }
})

const asset = (path, isAnimated) => ({
    url: `${BASE_URL}/${path}`,
    isAnimated
})

const buildDogSet = (variant, iconFile) => ({
    icon: asset(`dog/${iconFile}`, false),
    idle: asset(`dog/${variant}_idle_8fps.gif`, true),
    walk: asset(`dog/${variant}_walk_8fps.gif`, true),
    run: asset(`dog/${variant}_run_8fps.gif`, true),
    sleep: asset(`dog/${variant}_lie_8fps.gif`, true),
    play: asset(`dog/${variant}_with_ball_8fps.gif`, true),
    swipe: asset(`dog/${variant}_swipe_8fps.gif`, true)
})

const buildStandardSet = (folder, variant, iconFile, hasSleep) => ({
    icon: asset(`${folder}/${iconFile}`, false),
    idle: asset(`${folder}/${variant}_idle_8fps.gif`, true),
    walk: asset(`${folder}/${variant}_walk_8fps.gif`, true),
    run: asset(`${folder}/${variant}_run_8fps.gif`, true),
    play: asset(`${folder}/${variant}_with_ball_8fps.gif`, true),
    sleep: hasSleep
        ? asset(`${folder}/${variant}_lie_8fps.gif`, true)
        : asset(`${folder}/${variant}_idle_8fps.gif`, true)
})

export const PET_RENDER_PRESETS = Object.freeze({
    dog: {
        x: 180,
        y: 300,
        scale: 6
    },

    turtle: {
        x: 180,
        y: 340,
        scale: 6
    },

    fox: {
        x: 180,
        y: 300,
        scale: 6
    },

    panda: {
        x: 180,
        y: 300,
        scale: 6
    },

    snake: {
        x: 180,
        y: 280,
        scale: 6
    },

    'rubber-duck': {
        x: 180,
        y: 290,
        scale: 6
    },

    rat: {
        x: 180,
        y: 290,
        scale: 6
    },

    morph: {
        x: 180,
        y: 290,
        scale: 6
    }
})

export const getPetRenderPreset = (type) => {
    return (
        PET_RENDER_PRESETS[type] ?? {
            x: 180,
            y: 300,
            scale: 6
        }
    )
}

export const PET_ASSETS = Object.freeze({
    dog: {
        akita: buildDogSet('akita', 'icon_akita.png'),
        black: buildDogSet('black', 'icon_black.png'),
        brown: buildDogSet('brown', 'icon.png'),
        red: buildDogSet('red', 'icon_red.png'),
        white: buildDogSet('white', 'icon_white.png')
    },

    fox: {
        red: buildStandardSet('fox', 'red', 'icon.png', true),
        white: buildStandardSet('fox', 'white', 'icon_white.png', true)
    },

    panda: {
        black: buildStandardSet('panda', 'black', 'icon.png', true),
        brown: buildStandardSet('panda', 'brown', 'icon_brown.png', true)
    },

    turtle: {
        green: buildStandardSet('turtle', 'green', 'icon.png', true),
        orange: buildStandardSet('turtle', 'orange', 'icon_orange.png', true)
    },

    snake: {
        green: buildStandardSet('snake', 'green', 'icon.png', false)
    },

    'rubber-duck': {
        yellow: buildStandardSet('rubber-duck', 'yellow', 'icon.png', false)
    },

    rat: {
        brown: buildStandardSet('rat', 'brown', 'icon_brown.png', false),
        gray: buildStandardSet('rat', 'gray', 'icon.png', false),
        white: buildStandardSet('rat', 'white', 'icon_white.png', false)
    },

    morph: {
        purple: buildStandardSet('morph', 'purple', 'icon.png', false)
    }
})

export const getAllPets = () =>
    Object.entries(PET_CATALOG).map(([type, data]) => ({
        type,
        ...data
    }))

export const getPetVariants = (type) => PET_CATALOG[type]?.variants ?? []

export const isValidPet = (type, variant) => {
    const pet = PET_CATALOG[type]
    if (!pet) {
        return false
    }
    return pet.variants.includes(variant)
}

export const getPetPrice = (type) => PET_CATALOG[type]?.price ?? null

export const getPetAssets = (type, variant) => PET_ASSETS[type]?.[variant] ?? null

export const getPetAssetByAction = (type, variant, action) => {
    const set = getPetAssets(type, variant)
    if (!set) {
        return null
    }

    const map = {
        idle: set.idle,
        play: set.play,
        sleep: set.sleep,
        walk: set.walk,
        run: set.run,
        icon: set.icon,
        swipe: set.swipe ?? set.idle
    }

    return map[action] ?? set.idle
}
