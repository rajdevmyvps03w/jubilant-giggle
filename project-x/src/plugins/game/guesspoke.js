import { plugin } from '../../utils/plugin.js'
import { getRandomItem } from '../../functions/helpler.js'
import { saveState, getState, deleteState, incrementChallengeProgress } from '../../database/db.js'
import nodeHtmlToImage from 'node-html-to-image'
const pokemon = [
    'bulbasaur',
    'ivysaur',
    'venusaur',
    'charmander',
    'charmeleon',
    'charizard',
    'squirtle',
    'wartortle',
    'blastoise',
    'caterpie',
    'metapod',
    'butterfree',
    'weedle',
    'kakuna',
    'beedrill',
    'pidgey',
    'pidgeotto',
    'pidgeot',
    'rattata',
    'raticate',
    'spearow',
    'fearow',
    'ekans',
    'arbok',
    'pikachu',
    'raichu',
    'sandshrew',
    'sandslash',
    'nidoran-f',
    'nidorina',
    'nidoqueen',
    'nidoran-m',
    'nidorino',
    'nidoking',
    'clefairy',
    'clefable',
    'vulpix',
    'ninetales',
    'jigglypuff',
    'wigglytuff',
    'zubat',
    'golbat',
    'oddish',
    'gloom',
    'vileplume',
    'paras',
    'parasect',
    'venonat',
    'venomoth',
    'diglett',
    'dugtrio',
    'meowth',
    'persian',
    'psyduck',
    'golduck',
    'mankey',
    'primeape',
    'growlithe',
    'arcanine',
    'poliwag',
    'poliwhirl',
    'poliwrath',
    'abra',
    'kadabra',
    'alakazam',
    'machop',
    'machoke',
    'machamp',
    'bellsprout',
    'weepinbell',
    'victreebel',
    'tentacool',
    'tentacruel',
    'geodude',
    'graveler',
    'golem',
    'ponyta',
    'rapidash',
    'slowpoke',
    'slowbro',
    'magnemite',
    'magneton',
    'farfetchd',
    'doduo',
    'dodrio',
    'seel',
    'dewgong',
    'grimer',
    'muk',
    'shellder',
    'cloyster',
    'gastly',
    'haunter',
    'gengar',
    'onix',
    'drowzee',
    'hypno',
    'krabby',
    'kingler',
    'voltorb',
    'electrode',
    'exeggcute',
    'exeggutor',
    'cubone',
    'marowak',
    'hitmonlee',
    'hitmonchan',
    'lickitung',
    'koffing',
    'weezing',
    'rhyhorn',
    'rhydon',
    'chansey',
    'tangela',
    'kangaskhan',
    'horsea',
    'seadra',
    'goldeen',
    'seaking',
    'staryu',
    'starmie',
    'mr-mime',
    'scyther',
    'jynx',
    'electabuzz',
    'magmar',
    'pinsir',
    'tauros',
    'magikarp',
    'gyarados',
    'lapras',
    'ditto',
    'eevee',
    'vaporeon',
    'jolteon',
    'flareon',
    'porygon',
    'omanyte',
    'omastar',
    'kabuto',
    'kabutops',
    'aerodactyl',
    'snorlax',
    'articuno',
    'zapdos',
    'moltres',
    'dratini',
    'dragonair',
    'dragonite',
    'mewtwo',
    'mew',
    'chikorita',
    'bayleef',
    'meganium',
    'cyndaquil',
    'quilava',
    'typhlosion',
    'totodile',
    'croconaw',
    'feraligatr',
    'sentret',
    'furret',
    'hoothoot',
    'noctowl',
    'ledyba',
    'ledian',
    'spinarak',
    'ariados',
    'crobat',
    'chinchou',
    'lanturn',
    'pichu',
    'cleffa',
    'igglybuff',
    'togepi',
    'togetic',
    'natu',
    'xatu',
    'mareep',
    'flaaffy',
    'ampharos',
    'bellossom',
    'marill',
    'azumarill',
    'sudowoodo',
    'politoed',
    'hoppip',
    'skiploom',
    'jumpluff',
    'aipom',
    'sunkern',
    'sunflora',
    'yanma',
    'wooper',
    'quagsire',
    'espeon',
    'umbreon',
    'murkrow',
    'slowking',
    'misdreavus',
    'unown',
    'wobbuffet',
    'girafarig',
    'pineco',
    'forretress',
    'dunsparce',
    'gligar',
    'steelix',
    'snubbull',
    'granbull',
    'qwilfish',
    'scizor',
    'shuckle',
    'heracross',
    'sneasel',
    'teddiursa',
    'ursaring',
    'slugma',
    'magcargo',
    'swinub',
    'piloswine',
    'corsola',
    'remoraid',
    'octillery',
    'delibird',
    'mantine',
    'skarmory',
    'houndour',
    'houndoom',
    'kingdra',
    'phanpy',
    'donphan',
    'porygon2',
    'stantler',
    'smeargle',
    'tyrogue',
    'hitmontop',
    'smoochum',
    'elekid',
    'magby',
    'miltank',
    'blissey',
    'raikou',
    'entei',
    'suicune',
    'larvitar',
    'pupitar',
    'tyranitar',
    'lugia',
    'ho-oh',
    'celebi',
    'treecko',
    'grovyle',
    'sceptile',
    'torchic',
    'combusken',
    'blaziken',
    'mudkip',
    'marshtomp',
    'swampert',
    'poochyena',
    'mightyena',
    'zigzagoon',
    'linoone',
    'wurmple',
    'silcoon',
    'beautifly',
    'cascoon',
    'dustox',
    'lotad',
    'lombre',
    'ludicolo',
    'seedot',
    'nuzleaf',
    'shiftry',
    'taillow',
    'swellow',
    'wingull',
    'pelipper',
    'ralts',
    'kirlia',
    'gardevoir',
    'surskit',
    'masquerain',
    'shroomish',
    'breloom',
    'slakoth',
    'vigoroth',
    'slaking',
    'nincada',
    'ninjask',
    'shedinja',
    'whismur',
    'loudred',
    'exploud',
    'makuhita',
    'hariyama',
    'azurill',
    'nosepass',
    'skitty',
    'delcatty',
    'sableye',
    'mawile',
    'aron',
    'lairon',
    'aggron',
    'meditite',
    'medicham',
    'electrike',
    'manectric',
    'plusle',
    'minun',
    'volbeat',
    'illumise',
    'roselia',
    'gulpin',
    'swalot',
    'carvanha',
    'sharpedo',
    'wailmer',
    'wailord',
    'numel',
    'camerupt',
    'torkoal',
    'spoink',
    'grumpig',
    'spinda',
    'trapinch',
    'vibrava',
    'flygon',
    'cacnea',
    'cacturne',
    'swablu',
    'altaria',
    'zangoose',
    'seviper',
    'lunatone',
    'solrock',
    'barboach',
    'whiscash',
    'corphish',
    'crawdaunt',
    'baltoy',
    'claydol',
    'lileep',
    'cradily',
    'anorith',
    'armaldo',
    'feebas',
    'milotic',
    'castform',
    'kecleon',
    'shuppet',
    'banette',
    'duskull',
    'dusclops',
    'tropius',
    'chimecho',
    'absol',
    'wynaut',
    'snorunt',
    'glalie',
    'spheal',
    'sealeo',
    'walrein',
    'clamperl',
    'huntail',
    'gorebyss',
    'relicanth',
    'luvdisc',
    'bagon',
    'shelgon',
    'salamence',
    'beldum',
    'metang',
    'metagross',
    'regirock',
    'regice',
    'registeel',
    'latias',
    'latios',
    'kyogre',
    'groudon',
    'rayquaza',
    'jirachi',
    'deoxys',
    'turtwig',
    'grotle',
    'torterra',
    'chimchar',
    'monferno',
    'infernape',
    'piplup',
    'prinplup',
    'empoleon',
    'starly',
    'staravia',
    'staraptor',
    'bidoof',
    'bibarel',
    'kricketot',
    'kricketune',
    'shinx',
    'luxio',
    'luxray',
    'budew',
    'roserade',
    'cranidos',
    'rampardos',
    'shieldon',
    'bastiodon',
    'burmy',
    'wormadam',
    'mothim',
    'combee',
    'vespiquen',
    'pachirisu',
    'buizel',
    'floatzel',
    'cherubi',
    'cherrim',
    'shellos',
    'gastrodon',
    'ambipom',
    'drifloon',
    'drifblim',
    'buneary',
    'lopunny',
    'mismagius',
    'honchkrow',
    'glameow',
    'purugly',
    'chingling',
    'stunky',
    'skuntank',
    'bronzor',
    'bronzong',
    'bonsly',
    'mime-jr',
    'happiny',
    'chatot',
    'spiritomb',
    'gible',
    'gabite',
    'garchomp',
    'munchlax',
    'riolu',
    'lucario',
    'hippopotas',
    'hippowdon',
    'skorupi',
    'drapion',
    'croagunk',
    'toxicroak',
    'carnivine',
    'finneon',
    'lumineon',
    'mantyke',
    'snover',
    'abomasnow',
    'weavile',
    'magnezone',
    'lickilicky',
    'rhyperior',
    'tangrowth',
    'electivire',
    'magmortar',
    'togekiss',
    'yanmega',
    'leafeon',
    'glaceon',
    'gliscor',
    'mamoswine',
    'porygon-z',
    'gallade',
    'probopass',
    'dusknoir',
    'froslass',
    'rotom',
    'uxie',
    'mesprit',
    'azelf',
    'dialga',
    'palkia',
    'heatran',
    'regigigas',
    'giratina',
    'cresselia',
    'phione',
    'manaphy',
    'darkrai',
    'shaymin',
    'arceus',
    'victini',
    'snivy',
    'servine',
    'serperior',
    'tepig',
    'pignite',
    'emboar',
    'oshawott',
    'dewott',
    'samurott',
    'patrat',
    'watchog',
    'lillipup',
    'herdier',
    'stoutland',
    'purrloin',
    'liepard',
    'pansage',
    'simisage',
    'pansear',
    'simisear',
    'panpour',
    'simipour',
    'munna',
    'musharna',
    'pidove',
    'tranquill',
    'unfezant',
    'blitzle',
    'zebstrika',
    'roggenrola',
    'boldore',
    'gigalith',
    'woobat',
    'swoobat',
    'drilbur',
    'excadrill',
    'audino',
    'timburr',
    'gurdurr',
    'conkeldurr',
    'tympole',
    'palpitoad',
    'seismitoad',
    'throh',
    'sawk',
    'sewaddle',
    'swadloon',
    'leavanny',
    'venipede',
    'whirlipede',
    'scolipede',
    'cottonee',
    'whimsicott',
    'petilil',
    'lilligant',
    'basculin',
    'sandile',
    'krokorok',
    'krookodile',
    'darumaka',
    'darmanitan',
    'maractus',
    'dwebble',
    'crustle',
    'scraggy',
    'scrafty',
    'sigilyph',
    'yamask',
    'cofagrigus',
    'tirtouga',
    'carracosta',
    'archen',
    'archeops',
    'trubbish',
    'garbodor',
    'zorua',
    'zoroark',
    'minccino',
    'cinccino',
    'gothita',
    'gothorita',
    'gothitelle',
    'solosis',
    'duosion',
    'reuniclus',
    'ducklett',
    'swanna',
    'vanillite',
    'vanillish',
    'vanilluxe',
    'deerling',
    'sawsbuck',
    'emolga',
    'karrablast',
    'escavalier',
    'foongus',
    'amoonguss',
    'frillish',
    'jellicent',
    'alomomola',
    'joltik',
    'galvantula',
    'ferroseed',
    'ferrothorn',
    'klink',
    'klang',
    'klinklang',
    'tynamo',
    'eelektrik',
    'eelektross',
    'elgyem',
    'beheeyem',
    'litwick',
    'lampent',
    'chandelure',
    'axew',
    'fraxure',
    'haxorus',
    'cubchoo',
    'beartic',
    'cryogonal',
    'shelmet',
    'accelgor',
    'stunfisk',
    'mienfoo',
    'mienshao',
    'druddigon',
    'golett',
    'golurk',
    'pawniard',
    'bisharp',
    'bouffalant',
    'rufflet',
    'braviary',
    'vullaby',
    'mandibuzz',
    'heatmor',
    'durant',
    'deino',
    'zweilous',
    'hydreigon',
    'larvesta',
    'volcarona',
    'cobalion',
    'terrakion',
    'virizion',
    'tornadus',
    'thundurus',
    'reshiram',
    'zekrom',
    'landorus',
    'kyurem',
    'keldeo',
    'meloetta',
    'genesect',
    'chespin',
    'quilladin',
    'chesnaught',
    'fennekin',
    'braixen',
    'delphox',
    'froakie',
    'frogadier',
    'greninja',
    'bunnelby',
    'diggersby',
    'fletchling',
    'fletchinder',
    'talonflame',
    'scatterbug',
    'spewpa',
    'vivillon',
    'litleo',
    'pyroar',
    'flabebe',
    'floette',
    'florges',
    'skiddo',
    'gogoat',
    'pancham',
    'pangoro',
    'furfrou',
    'espurr',
    'meowstic',
    'honedge',
    'doublade',
    'aegislash',
    'spritzee',
    'aromatisse',
    'swirlix',
    'slurpuff',
    'inkay',
    'malamar',
    'binacle',
    'barbaracle',
    'skrelp',
    'dragalge',
    'clauncher',
    'clawitzer',
    'helioptile',
    'heliolisk',
    'tyrunt',
    'tyrantrum',
    'amaura',
    'aurorus',
    'sylveon',
    'hawlucha',
    'dedenne',
    'carbink',
    'goomy',
    'sliggoo',
    'goodra',
    'klefki',
    'phantump',
    'trevenant',
    'pumpkaboo',
    'gourgeist',
    'bergmite',
    'avalugg',
    'noibat',
    'noivern',
    'xerneas',
    'yveltal',
    'zygarde',
    'diancie',
    'hoopa',
    'volcanion',
    'rowlet',
    'dartrix',
    'decidueye',
    'litten',
    'torracat',
    'incineroar',
    'popplio',
    'brionne',
    'primarina',
    'pikipek',
    'trumbeak',
    'toucannon',
    'yungoos',
    'gumshoos',
    'grubbin',
    'charjabug',
    'vikavolt',
    'crabrawler',
    'crabominable',
    'oricorio',
    'cutiefly',
    'ribombee',
    'rockruff',
    'lycanroc',
    'wishiwashi',
    'mareanie',
    'toxapex',
    'mudbray',
    'mudsdale',
    'dewpider',
    'araquanid',
    'fomantis',
    'lurantis',
    'morelull',
    'shiinotic',
    'salandit',
    'salazzle',
    'stufful',
    'bewear',
    'bounsweet',
    'steenee',
    'tsareena',
    'comfey',
    'oranguru',
    'passimian',
    'wimpod',
    'golisopod',
    'sandygast',
    'palossand',
    'pyukumuku',
    'type-null',
    'silvally',
    'minior',
    'komala',
    'turtonator',
    'togedemaru',
    'mimikyu',
    'bruxish',
    'drampa',
    'dhelmise',
    'jangmo-o',
    'hakamo-o',
    'kommo-o',
    'tapu-koko',
    'tapu-lele',
    'tapu-bulu',
    'tapu-fini',
    'cosmog',
    'cosmoem',
    'solgaleo',
    'lunala',
    'nihilego',
    'buzzwole',
    'pheromosa',
    'xurkitree',
    'celesteela',
    'kartana',
    'guzzlord',
    'necrozma',
    'magearna',
    'marshadow',
    'poipole',
    'naganadel',
    'stakataka',
    'blacephalon',
    'zeraora',
    'meltan',
    'melmetal',
    'grookey',
    'thwackey',
    'rillaboom',
    'scorbunny',
    'raboot',
    'cinderace',
    'sobble',
    'drizzile',
    'inteleon',
    'skwovet',
    'greedent',
    'rookidee',
    'corvisquire',
    'corviknight',
    'blipbug',
    'dottler',
    'orbeetle',
    'nickit',
    'thievul',
    'gossifleur',
    'eldegoss',
    'wooloo',
    'dubwool',
    'chewtle',
    'drednaw',
    'yamper',
    'boltund',
    'rolycoly',
    'carkol',
    'coalossal',
    'applin',
    'flapple',
    'appletun',
    'silicobra',
    'sandaconda',
    'cramorant',
    'arrokuda',
    'barraskewda',
    'toxel',
    'toxtricity',
    'sizzlipede',
    'centiskorch',
    'clobbopus',
    'grapploct',
    'sinistea',
    'polteageist',
    'hatenna',
    'hattrem',
    'hatterene',
    'impidimp',
    'morgrem',
    'grimmsnarl',
    'obstagoon',
    'perrserker',
    'cursola',
    'sirfetch',
    'mr',
    'runerigus',
    'milcery',
    'alcremie',
    'falinks',
    'pincurchin',
    'snom',
    'frosmoth',
    'stonjourner',
    'eiscue',
    'indeedee',
    'morpeko',
    'cufant',
    'copperajah',
    'dracozolt',
    'arctozolt',
    'dracovish',
    'arctovish',
    'duraludon',
    'dreepy',
    'drakloak',
    'dragapult',
    'zacian',
    'zamazenta',
    'eternatus',
    'kubfu',
    'urshifu',
    'zarude',
    'regieleki',
    'regidrago',
    'glastrier',
    'spectrier',
    'calyrex'
]

const getDexNo = (name) => pokemon.indexOf(name) + 1

const getImageUrl = (index) =>
    `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${index}.png`

async function generateGuessPokemon(imageURL, name, hidden = true) {
    const displayName = hidden ? '?'.repeat(name.length) : name.toUpperCase()

    const html = `
    <html>
    <head>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Verdana:wght@700&display=swap');

        body {
            margin: 0;
            width: 1080px;
            height: 1080px;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            font-family: 'Verdana', sans-serif;
            background-color: #cc0000; /* Darker Red */
            position: relative;
        }

        /* Diagonal Flash Background - Solid, no seams */
        body::before {
            content: "";
            position: absolute;
            width: 200%;
            height: 200%;
            background: #ff4d4d; /* Lighter Red */
            transform: rotate(-25deg);
            top: -50%;
            left: -10%;
            z-index: 0;
        }

        /* Subtle radial glow to make the center pop */
        body::after {
            content: "";
            position: absolute;
            inset: 0;
            background: radial-gradient(circle, transparent 20%, rgba(0,0,0,0.3) 100%);
            z-index: 1;
        }

        .card {
            position: relative;
            z-index: 2;
            width: 900px;
            height: 900px;
            background: rgba(255, 255, 255, 0.12);
            border: 12px solid white;
            border-radius: 80px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: space-around;
            padding: 50px;
            box-sizing: border-box;
            backdrop-filter: blur(20px);
            box-shadow: 0 60px 100px rgba(0,0,0,0.4);
        }

        .title {
            font-size: 80px;
            color: #ffde00;
            -webkit-text-stroke: 4px #3b4cca;
            text-shadow: 8px 8px 0px rgba(0,0,0,0.9);
            text-transform: uppercase;
            letter-spacing: -2px;
        }

        .image-container {
            width: 550px;
            height: 550px;
            display: flex;
            align-items: center;
            justify-content: center;
            /* Inner glow for the Pokemon */
            background: radial-gradient(circle, rgba(255,255,255,0.2) 0%, transparent 70%);
        }

        .pokemon-img {
            width: 100%;
            height: 100%;
            object-fit: contain;
            ${hidden ? 'filter: brightness(0);' : 'filter: drop-shadow(0 20px 40px rgba(0,0,0,0.6));'}
        }

        .name-box {
            background: white;
            color: #111;
            padding: 20px 70px;
            border-radius: 100px;
            font-size: 64px;
            font-weight: 900;
            box-shadow: 0 15px 0px rgba(0,0,0,0.2);
            border: 5px solid #3b4cca;
            text-transform: uppercase;
        }
    </style>
    </head>
    <body>
      <div class="card">
        <div class="title">Who's That?</div>

        <div class="image-container">
            <img src="${imageURL}" class="pokemon-img" />
        </div>

        <div class="name-box">
          ${displayName}
        </div>
      </div>
    </body>
    </html>
    `

    return await nodeHtmlToImage({
        html,
        transparent: false,
        puppeteerArgs:
            process.env.PREFIX?.includes('com.termux') ||
            process.env.HOME?.includes('/data/data/com.termux') ||
            process.platform === 'android'
                ? {
                      executablePath: '/data/data/com.termux/files/home/chrome',
                      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
                  }
                : {
                      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
                  }
    })
}

/* ---------- COMMAND ---------- */
plugin(
    {
        name: 'guesspokemon',
        aliases: ['gpkm', 'whosthatpokemon'],
        category: 'game',
        isGroup: true,
        description: {
            usage: 'start | guess <name>',
            content: 'Guess the hidden Pokémon before time runs out.',
            example: 'guess eevee'
        }
    },
    async (_, M, { args }) => {
        try {
            const gameKey = `gpkm_${M.from}`

            /* ---------- START GAME ---------- */
            if (!args[0] || args[0] === 'start') {
                const activeGame = await getState(gameKey)
                if (activeGame) {
                    return M.reply('⚠️ A game is already active. Finish it first!')
                }

                const name = getRandomItem(pokemon)
                const dex = getDexNo(name)
                const imageURL = getImageUrl(dex)

                const hiddenImg = await generateGuessPokemon(imageURL, name, true)
                const endTime = Date.now() + 120000

                const gameData = { name, dex, imageURL, endTime }
                await saveState(gameKey, gameData)

                setTimeout(async () => {
                    try {
                        const checkGame = await getState(gameKey)
                        if (checkGame && checkGame.endTime === endTime) {
                            const revealImg = await generateGuessPokemon(imageURL, name, false)
                            await M.replyRaw({
                                image: revealImg,
                                caption: `⏰ Time is over!\nThe correct Pokémon was *${name}*.\n\nStart a new game to try again.`
                            })
                            await deleteState(gameKey)
                        }
                    } catch (timeoutErr) {
                        console.error('[GUESSPOKE TIMEOUT]', timeoutErr)
                    }
                }, 60000)

                return M.replyRaw({
                    image: hiddenImg,
                    caption: `🎮 *Guess the Pokémon!*\n\nYou have *120 seconds* to identify the hidden Pokémon.\n\nReply with:\n*${global.config.prefix}gpkm guess <name>*`
                })
            }

            /* ---------- GUESS ---------- */
            if (args[0] === 'guess') {
                const game = await getState(gameKey)

                if (!game) {
                    return M.reply(`❌ No active game. Start one with *${global.config.prefix}gpkm start*`)
                }

                // Check if the game has timed out (even if the setTimeout hasn't fired yet)
                if (Date.now() > game.endTime) {
                    await deleteState(gameKey).catch(() => {})
                    return M.reply(`⏰ Time's up! The correct Pokémon was *${game.name}*. Start a new game!`)
                }

                const guess = args.slice(1).join(' ').toLowerCase().trim()

                if (!guess) {
                    return M.reply('❌ Please provide the name of the Pokémon you want to guess.')
                }

                if (guess !== game.name.toLowerCase()) {
                    return M.reply('❌ That guess is incorrect. Try again before time runs out!')
                }

                // ── Correct! ──────────────────────────────────────────────────
                const revealImg = await generateGuessPokemon(game.imageURL, game.name, false)
                await deleteState(gameKey)

                let caption = `🎉 *Correct Answer!*\n\n@${M.sender.id.split('@')[0]} successfully guessed *${game.name}*.\nWell done!`

                // ── CHALLENGE: poke_wins ──────────────────────────────────────
                try {
                    const chalResult = await incrementChallengeProgress(M.sender.id, 'pokeWins', 1)
                    if (chalResult?.completed) {
                        caption += `\n\n🎯 *Challenge Complete!* You've finished the Pokémon challenge!\nUse *${global.config.prefix}claimchallenge* to collect your card reward!`
                    } else if (chalResult && !chalResult.completed) {
                        caption += `\n\n📊 Pokémon Challenge: ${chalResult.progress}/${chalResult.goal}`
                    }
                } catch (chalErr) {
                    console.error('[GUESSPOKE] Challenge increment error:', chalErr)
                    // non-fatal
                }

                return M.replyRaw({
                    image: revealImg,
                    caption,
                    mentions: [M.sender.id]
                })
            }

            return M.reply(
                `❓ Invalid option.\nUse *${global.config.prefix}gpkm start* or *${global.config.prefix}gpkm guess <name>*`
            )
        } catch (err) {
            console.error('[GUESS POKEMON ERROR]', err)
            return M.reply('❌ An error occurred while running the game.')
        }
    }
)
