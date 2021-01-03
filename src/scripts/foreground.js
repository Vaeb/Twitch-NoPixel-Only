/*
 * Twitch NoPixel Only
 * Created by Vaeb
*/

console.log('[TNO] Loading Twitch NoPixel Only...');

const getStorage = key => new Promise((resolve) => {
    chrome.storage.local.get(key, (value) => {
        resolve(value[key]);
    });
});

const setStorage = async (key, val) => chrome.storage.local.set({ [key]: val });

String.prototype.indexOfRegex = function (regex, startPos) {
    const indexOf = this.substring(startPos || 0).search(regex);
    return indexOf >= 0 ? indexOf + (startPos || 0) : indexOf;
};

// Settings

const minViewers = 1;
const stopOnMin = true;
const checkOther = true;
const regNp = /no\s*pixel|\bn\s*p\b/i;
// const regOther = /the\s*family|\btf(?:rp|\b)|family\s*rp|twitchrp|\bt\W*rp\b|benefactor|\bob(?:rp|\b)|dondi|\bsvrp|subversion/i;
const regOther = /the\s*family|\btf(?:rp|\b)|family\s*rp|twitchrp|\bt\W*rp|\bnon[\s-]*stop|\bns(?:rp|\b)/i;
const intervalSeconds = 0.7;

let keepDeleting = true;
let onPage = false;
let interval;

let wasZero = false;

const npCharacters = {
    '0Reed': [
        { name: 'Reid "Reed" Dankleaf', faction: 'Lost MC' },
    ],
    '80bsaget': [
        { name: 'Tim Lee', faction: 'Koreans' },
        { name: '[Officer] Bexar McCree', faction: 'Police' },
    ],
    '52chains': [
        { name: 'Fidel Guevara', nicknames: ['Don', 'Cabron'] },
    ],
    AaronOnAir: [
        { name: '[Officer] Dan Faily', faction: 'Police', nicknames: ['585'] },
    ],
    abbay: [
        { name: 'Olivia Harvey' },
    ],
    abby: [
        { name: '[Deputy] Ivy Wood', faction: 'Police' },
    ],
    AbdulHD: [
        { name: 'Abdul AlRahim' },
        { name: 'Fahad AlArabi', faction: 'DoC' },
        { name: '[Judge] Ali Habibi', faction: 'DoJ' },
    ],
    Acaibear: [
        { name: '[Officer] Emily Reinhart', faction: 'Police' },
        { name: 'Jolene Mushkin', nicknames: ['Little Red'] },
    ],
    adnormaltv: [
        { name: 'Ivan Gorbahtjov' },
    ],
    AfriicanSnowball: [
        { name: '[Chief Justice] Buck Stanton', faction: 'DoJ' },
        { name: 'Leland "LJ" Jones' },
    ],
    Afro: [
        { name: 'Dexx Martin', faction: 'GSF', leader: true },
        { name: 'Jacob Harth', faction: 'Dark Web', leader: true },
        { name: 'Chris "CP" Porter' },
        { name: 'Sayid Mitra', nicknames: ['Sayeet'], displayName: 0 },
        { name: 'David "The Mime" Wonders', nicknames: ['"Concrete" Man'] },
        { name: 'Gordon Parks', nicknames: ['DoorLord'] },
    ],
    AidenNortha: [
        { name: '[Deputy] Kevin Keyte', faction: 'Police' },
    ],
    Airborne: [
        { name: '[Judge] Dennis LaBarre', faction: 'DoJ' },
        { name: 'Unity', faction: 'Animals', nicknames: ['Cat'] },
    ],
    akaMONKEY: [
        { name: 'Arturo Ortiz', faction: 'Vagos' },
        { name: 'CamRon "Peanut" Giles', faction: 'SSB' },
        { name: 'Timoteo "TT" Bushnell', faction: 'Top Shottaz', nicknames: ['Rasta'] },
    ],
    aleks: [
        { name: '[Chief of Police] Bobby Smith', faction: 'Police', leader: true, nicknames: ['Bob', 'Chief'], displayName: 1 },
        { name: '[FIB Agent] Heath Mercer', faction: 'Police' },
    ],
    alexten0909: [
        { name: 'Alexander Campbell', faction: 'Angels', nicknames: ['Alex'], displayName: 3 },
    ],
    AndyMilonakis: [
        { name: 'Lil Erf', faction: 'Chang Gang', affiliate: true, displayName: 0 },
    ],
    AnimatedJF: [
        { name: 'Cameron Dupres', faction: 'DoJ' },
    ],
    AnneMunition: [
        { name: 'Sequoia Springs' },
    ],
    AnthonyZ: [
        { name: 'Tony Corleone', faction: 'Leanbois' },
        { name: '[Officer] Anthony Copleone', faction: 'Police' },
    ],
    Apitoxin11: [
        { name: 'Trigger Freebird', faction: 'Harmony' },
    ],
    APPLESHAMPOO: [
        { name: '[Dispatch] Nancy Ree', faction: 'Police', displayName: 1 },
        { name: 'Gioconda "Gio" Coppola' },
    ],
    Armeeof1: [
        { name: 'Milton Pointdexter' },
    ],
    Ashi: [
        { name: 'Fiona Stewart', faction: 'HOA', nicknames: ['Fi-ho-na'] },
    ],
    ashlynn: [
        { name: '[Officer] Brenda Pancake', faction: 'Police', displayName: 1, nicknames: ['Pancakes'] },
        { name: 'Cassie Cupcakes', faction: 'Angels' },
    ],
    Asteroba: [
        { name: '[DA] Larry Hallow', faction: 'DoJ' },
    ],
    Aus24: [
        { name: 'Jordan Walker', faction: 'Harmony' },
        { name: '[Officer] Jack Davenport', faction: 'Police' },
    ],
    AustinCreed: [
        { name: 'Austin Creed', displayName: 0 },
    ],
    AvaGG: [
        { name: 'Karen Dahmer', faction: 'Chang Gang', affiliate: true, nicknames: ['Kawen'] },
    ],
    aXed_U: [
        { name: 'Hans Snitzel', faction: 'Prune Gang' },
    ],
    Baki961: [
        { name: 'Yoshimoto Nakanishi', faction: 'Yakuza' },
    ],
    bananabrea: [
        { name: 'Claire Seducer', faction: 'Angels' },
        { name: '[Officer] Tyme Reducer', faction: 'Police' },
    ],
    barryscottlive: [
        { name: 'Barry Scott' },
    ],
    BCBeastly: [
        { name: 'Herbert The Pervert' },
    ],
    BennniStreams: [
        { name: 'Pablo Madrid', faction: 'Vagos', nicknames: ['Diablo'] },
    ],
    BFLY: [
        { name: '[Dr.] Torah Andrews', faction: 'Medical' },
    ],
    biggieferreira: [
        { name: 'Shevy Santanna', faction: 'Vagos' },
    ],
    bldrs: [
        { name: 'Kaleb "Kleb" Rush', faction: 'HOA' },
    ],
    bLuE622: [
        { name: 'Boe Jangles', faction: 'Chang Gang', affiliate: true },
    ],
    bmcloughlin22: [
        { name: '[ADA] Lachlan Pike', faction: 'DoJ' },
    ],
    Bomaah: [
        { name: 'Viper Rodriguez', faction: 'ESB' },
    ],
    BoschMerchant: [
        { name: 'Anto Murphy', faction: 'Chang Gang' },
    ],
    breakyx: [
        { name: 'Dris Peters', faction: 'SSB' },
    ],
    buddha: [
        { name: 'Lang Buddha', faction: 'Leanbois', leader: true, nicknames: ['Circle Andy'] },
        { name: '[Deputy] Kevin Kona', faction: 'Police' },
    ],
    Burn: [
        { name: 'Norman "Norm" Yoder' },
        { name: 'Gordo Ramsay', displayName: 0 },
    ],
    ButterRoyaleTV: [
        { name: 'Deejay Bartello', faction: 'Snake Gang' },
    ],
    bythybeard: [
        { name: 'Wade Willson', faction: 'Lost MC' },
    ],
    CallMeGrub: [
        { name: '[Deputy] Isaac Richardson', faction: 'Police' },
    ],
    Carmen: [
        { name: 'Carmella Corset' },
    ],
    CathFawr: [
        { name: 'Summer Mersion', faction: 'QuickFix', displayName: 0 },
        { name: '[Officer] Lydia Vale', faction: 'Police' },
    ],
    Cathie: [
        { name: '[Deputy] Anita Cox', faction: 'Police' },
        { name: 'Ninacska Mihkala', faction: 'Russians', nicknames: ['Nina'], displayName: 3 },
        { name: 'Lil K', faction: 'SSB', displayName: 0 },
    ],
    CaussiePreacher: [
        { name: '[EMS] Jack Preacher', faction: 'Medical' },
    ],
    Chalupa_Pants: [
        { name: 'Julio Thomas', faction: 'HOA' },
    ],
    charlieblossom: [
        { name: 'Georgina "Windsong" Williams' },
    ],
    Chief: [
        { name: 'Baada Ka', faction: 'HOA', nicknames: ['Chief'], displayName: 3 },
    ],
    Choi: [
        { name: '[Dr.] Choi Zhangsun', faction: 'Medical', leader: true },
    ],
    ChrisTombstone: [
        { name: 'Flop Dugong' },
    ],
    CinnamonToastKen: [
        { name: 'Buck Colton', faction: 'Prune Gang', nicknames: ['Book', 'Bucky', 'Cultan'] },
    ],
    chairhandler: [
        { name: 'Carl Crimes' },
    ],
    Chaseman7GG: [
        { name: 'Miguel Guerrero', faction: 'Vagos' },
    ],
    ClassyPax: [
        { name: '[Dr.] Ethan Maw', faction: 'Medical', displayName: 2 },
    ],
    ConfusedDevil: [
        { name: '[Sheriff] Travis Tribble', faction: 'Police', highCommand: true, leader: true },
    ],
    ConnorCronus: [
        { name: '[Dr.] Isaac Smith', faction: 'Medical' },
        { name: 'Roman "Mask" Sionis', nicknames: ['Black Mask'] },
    ],
    Coolio: [
        { name: 'Dequarius "Big D" Johnson', faction: 'Chang Gang' },
        { name: '[Deputy] Adam Hopping', faction: 'Police' },
    ],
    CptCheeto: [
        { name: '[Officer] Scott Ridley', faction: 'Police' },
    ],
    CrayonPonyfish: [
        { name: 'Wilhelmina Copperpot', displayName: 2 },
    ],
    Crunchy: [
        { name: 'Grimoire "Gremlin" Hauttogs' },
    ],
    CrystalMushroom: [
        { name: 'Regina Bunny' },
    ],
    Crystalst: [
        { name: 'Four Tee', displayName: 0 },
    ],
    CurtisRyan: [
        { name: 'Curtis Swoleroid', faction: 'Sahara', nicknames: ['"Demon" of Lean Street', 'Curt'] },
        { name: '[Officer] Stephen McClane', faction: 'Police' },
        { name: 'Cornelius "Cornbread" Scott', faction: 'GSF' },
    ],
    curvyelephant: [
        { name: '[Deputy] Matt Rhodes', faction: 'Police' },
        { name: 'Ryan Parker', faction: 'Lost MC' },
        { name: 'Kevin Shaw' },
    ],
    Curvyllama: [
        { name: '[Deputy] Lorenzo L', faction: 'Police', displayName: 1 },
        { name: 'Freya Manning', faction: 'Koreans' },
    ],
    cyr: [
        { name: 'Uchiha Jones', faction: 'Chang Gang' },
        { name: 'Joe Caine', faction: 'The Winery', displayName: 0 },
    ],
    DaisyGray: [
        { name: 'Andi Jones', faction: 'HOA', nicknames: ['Ant'], displayName: 3 },
    ],
    Darthbobo77: [
        { name: 'Rudi Rinsen', faction: 'Lost MC', leader: true },
    ],
    dasMEHDI: [
        { name: '[Officer] Brian Knight', faction: 'Police', nicknames: ['495'] },
        { name: 'Nino Chavez', faction: 'Sahara', leader: true },
        { name: 'Ryan Kindle', faction: 'HOA' },
        { name: 'Reema', nicknames: ['The "Whorelord"'] },
    ],
    DavidB_NP: [
        { name: 'Vladimir "Vlad" Ivanov', faction: 'Russians' },
    ],
    Denior13: [
        { name: 'Keith "Bulldog" Dooger', faction: 'Lost MC' },
    ],
    Denis3D: [
        { name: 'Development "Development: Denis3D"', faction: 'Development', nicknames: ['Dev', 'Developer', '3D'] },
    ],
    dibitybopty: [
        { name: '[Officer] Gus Gorman', faction: 'Police' },
    ],
    DigiiTsuna: [
        { name: '[Dr.] Kai King', faction: 'Medical', displayName: 2 },
    ],
    DocWizard: [
        { name: '[Judge] John Bailey', faction: 'DoJ' },
        { name: '[Officer] TJ Walker', faction: 'Police' },
        { name: 'Preston Landor' },
    ],
    Dogbert: [
        { name: '[Undersheriff] Rocko Colombo', faction: 'Police', highCommand: true },
        { name: 'Luther Caine', faction: 'HOA' },
    ],
    Doug: [
        { name: 'Gazpacho Prince', faction: 'ESB', nicknames: ['Pachi', 'Spachi'] },
        { name: 'William "W" Told', faction: 'CKR', nicknames: ['Lil Pump'] },
    ],
    Dr_Knope: [
        { name: 'Patrit "Mete" Metemahaan', faction: 'HOA' },
    ],
    DROwSeph420: [
        { name: 'John "Geno" Collins', faction: 'GSF' },
    ],
    Dunrunnin12: [
        { name: 'Thomas "The Narrator" Dwayne' },
    ],
    eebern: [
        { name: 'Huck Guthrie', faction: 'HOA' },
    ],
    either: [
        { name: 'Jaden Christopher', faction: 'Snake Gang' },
    ],
    ElvisRP: [
        { name: '[Deputy] John Dorian', faction: 'Police' },
    ],
    Evee: [
        { name: '[Judge] Whitney Crawford', faction: 'DoJ' },
        { name: 'Adrienne West' },
        { name: 'Bree Matthews' },
        { name: 'Demi Black' },
    ],
    explodicy: [
        { name: 'Ted Kindly' },
    ],
    Fairlight_Excalibur: [
        { name: 'Raja Bahadur', faction: 'QuickFix', leader: true },
        { name: '[Officer] Alexander "Fox" Fawkes', faction: 'Police' },
    ],
    Fairzz91: [
        { name: 'Huxley Johnson', faction: 'DoC' },
        { name: 'Paddy Patrickson', faction: 'Lost MC' },
    ],
    Familybanter: [
        { name: '[Dr.]  Jayce Petra', faction: 'Medical', displayName: 0 },
        { name: 'Taran Raid', faction: 'Lost MC', displayName: 0 },
    ],
    Five0AnthO: [
        { name: '[Trooper] Tony Andrews', faction: 'Police', highCommand: true },
    ],
    FortyOne: [
        { name: 'Jose Martin Perez', faction: 'ESB', nicknames: ['JMP'] },
        { name: '[Deputy] John Archer', faction: 'Police' },
        { name: 'Lucas Ortiz', displayName: 0 },
        { name: 'Don Russo', displayName: 0 },
        { name: 'Jacob "Funny Man" Storm' },
        { name: 'Arious "Breezy" Campbell' },
    ],
    frogbound: [
        { name: 'Edward Nygma' },
        { name: 'Alexander Egorov' },
    ],
    Gabz: [
        { name: 'Development "Development: Gabz"', faction: 'Development', nicknames: ['Dev', 'Developer', '3D'] },
    ],
    GameDemented: [
        { name: '[Deputy] Peter Johnson', faction: 'Police' },
    ],
    GattisTV: [
        { name: 'Carlos Guzman', faction: 'Vagos' },
    ],
    Gavbin_: [
        { name: '[Judge] Gavin Holliday', faction: 'DoJ' },
    ],
    GeneralEmu: [
        { name: '[Officer] Lance Malton', faction: 'Police' },
    ],
    Greekgodx: [
        { name: 'Tay Tay Tyrone' },
    ],
    GreenishMonkey: [
        { name: 'Bobby Brown', faction: 'Chang Gang' },
    ],
    GTAWiseGuy: [
        { name: 'Eddie Marshall', faction: 'Tuner Shop' },
        { name: '[Officer] Jim Underwood', faction: 'Police' },
        { name: 'Development "Development: GTAWiseGuy"', faction: 'Development', nicknames: ['Dev', 'Developer', 'Handling'] },
    ],
    HARMSwahy: [
        { name: 'Blaine Burke', faction: 'Angels' },
    ],
    Harryo: [
        { name: 'Harry Brown' },
    ],
    Hedisaurus: [
        { name: '[EMS] Hedi Saurus', faction: 'Medical' },
        { name: '[Dispatch] Ramona Celeste', faction: 'Police', displayName: 1 },
    ],
    HeyOrbz: [
        { name: '[Officer] Casey Valentine', faction: 'Police' },
        { name: 'Richie Mersion', faction: 'Mersions', displayName: 0 },
    ],
    HiredGunRP: [
        { name: '[Deputy] Colt Shepherd', faction: 'Police' },
    ],
    Hirona: [
        { name: '[Officer] Olivia Copper', faction: 'Police' },
        { name: 'Emily Maw', faction: 'Harmony' },
        { name: 'Griselda "Zelda" Harth', faction: 'HOA' },
        { name: 'Olga Sazkaljovich', faction: 'Snake Gang', nicknames: ['Olgaa', 'Olgaaa', 'Olgaaaa'] },
    ],
    hobbittrash: [
        { name: '[Deputy] Tracy Martell', faction: 'Police', nicknames: ['Cop'] },
        { name: "Kayden Dell'Anno" },
        { name: '[Chief Justice] Katya Zamalodchikova', faction: 'DoJ' },
    ],
    HonathanTV: [
        { name: '[Deputy] Honathan Yolo', faction: 'Police' },
    ],
    Hotted89: [
        { name: '[Deputy] Matthew Espinoz', faction: 'Police', nicknames: ['Airspinoz', 'Air 1 Andy'] },
        { name: 'Joaquin "JJ" Jimenes', faction: 'Vagos' },
        { name: 'Allen Widemann', faction: 'Chang Gang' },
    ],
    huddy_nz: [
        { name: 'Ash Huddy Hudson', faction: 'Lunatix' },
    ],
    HutchMF: [
        { name: 'Drew "Dead Eye Drew"', faction: 'ESB', nicknames: ['DeadEye'] },
        { name: 'Hutch Hendrickson' },
    ],
    IAmSoul_RP: [
        { name: 'Johnathen Riker' },
    ],
    ImClammy: [
        { name: 'AK', faction: 'SSB' },
        { name: 'Derek Monroe' },
    ],
    INFLUXPictures: [
        { name: 'Tony Venucci', displayName: 0 },
    ],
    Intelleqt: [
        { name: 'Donovan "DK" King', faction: 'GSF' },
    ],
    ironmonkeytv: [
        { name: 'Winston Bolt', faction: 'ESB' },
        { name: 'Dragon', faction: 'DDMC' },
    ],
    ItsJustJosh: [
        { name: 'ItsJustJosh', faction: 'SSB' },
    ],
    ItsLSG: [
        { name: '[Officer] Jack Miller', faction: 'Police' },
    ],
    ItsSammyP: [
        { name: 'Tyrone "Big T" Thompson', faction: 'SSB' },
    ],
    Jack: [
        { name: 'Jack Cortair', faction: 'ESB' },
    ],
    jacobpibbtv: [
        { name: 'Jacob Pibb' },
    ],
    Jayce: [
        { name: 'Lil Loco', faction: 'Vagos', displayName: 0 },
        { name: 'Riley Johnson' },
        { name: 'Pepe Roni', displayName: 0 },
        { name: 'Molly Minaj', displayName: 0 },
        { name: 'Robert "Mr. Rodgers" Rodgers' },
    ],
    JdotField: [
        { name: 'Miles Landon', faction: 'Sahara' },
        { name: 'Drew Jackson', faction: 'GSF' },
    ],
    jimmytulip: [
        { name: 'Wayne Biggaz', faction: 'Chang Gang' },
    ],
    JJLake: [
        { name: 'Jay Jarvis', faction: 'Sahara' },
    ],
    JoblessGarrett: [
        { name: 'Garrett Jobless', faction: 'Chang Gang' },
        { name: '[Officer] Garry Berry', faction: 'Police' },
    ],
    JoeSmitty123: [
        { name: '[Officer] Michael Murphy', faction: 'Police' },
    ],
    Jonthebroski: [
        { name: 'Denzel Williams', faction: 'Leanbois', nicknames: ['The "Cleaner"'] },
        { name: 'Dio Ivanov', faction: 'Russians' },
        { name: '[Officer] Johnny Divine', faction: 'Police', displayName: 0 },
    ],
    JoshOG: [
        { name: 'Mario Le-Pipe', faction: 'Chang Gang', affiliate: true, displayName: 0 },
    ],
    JOVIAN: [
        { name: '[Deputy] Billiam Williams', faction: 'Police', displayName: 1 },
    ],
    JPKMoto: [
        { name: '[ADA] Odessa Pearson', faction: 'DoJ' },
        { name: 'Nora Dupres' },
        { name: 'Zee Nanakaze Mathers' },
    ],
    Judd: [
        { name: '[Chief Justice] Coyote Russell', faction: 'DoJ', displayName: 1 },
        { name: 'Judd Lincoln' },
        { name: 'Reverend I.M. Voland', faction: 'Dark Web' },
    ],
    JuggsRP: [
        { name: 'Lenny Large' },
    ],
    JukeBoxEM: [
        { name: 'Tony Foster', faction: 'ESB' },
    ],
    JustJamieHDG: [
        { name: 'Tommy Cruizer', faction: 'Tuner Shop' },
    ],
    Jyeahlisa: [
        { name: '[Therapist] Thalia Hayes', faction: 'Medical' },
        { name: 'Lees Grey' },
    ],
    KaoruHare: [
        { name: '[Therapist] Kizzy Neveah', faction: 'Medical' },
    ],
    KaoticaXD: [
        { name: 'Victoria "Vivi" Veine', faction: 'HOA' },
    ],
    Kari: [
        { name: '[Deputy] Mina Price', faction: 'Police' },
        { name: '[EMS] Khloe Brooks', faction: 'Medical' },
    ],
    karnt1: [
        { name: 'Arush', faction: 'GSF' },
    ],
    KatFires: [
        { name: 'Novah Walker', faction: 'Chang Gang' },
    ],
    Kemony: [
        { name: 'Susie Carmichael', faction: 'Snake Gang' },
    ],
    KezieEve: [
        { name: 'Ghost Storm', faction: 'GSF' },
    ],
    KillrBeauty: [
        { name: 'Catherine Scratch', faction: 'Lost MC', nicknames: ['Cat'], displayName: 3 },
    ],
    Kimchi: [
        { name: 'Sun Moon', faction: 'Koreans' },
    ],
    Kinamazing: [
        { name: '[Officer] Emma Dupont', faction: 'Police', nicknames: ['Dupog'] },
    ],
    King_1455: [
        { name: 'Cooch Cassidy', faction: 'Lost MC' },
    ],
    Kitboga: [
        { name: 'Edna Moose' },
        { name: '[Deputy] Claire Annette Reed', faction: 'Police' },
    ],
    Kite61: [
        { name: 'Rusty Johnson', faction: 'ESB' },
    ],
    Kiwo: [
        { name: '[Deputy] Lauren Forcer', faction: 'Police' },
        { name: 'Mia Mersion', faction: 'Mersions', displayName: 0 },
        { name: 'Evita "Mother" Nimm', faction: 'Dark Web' },
        { name: 'Ava Ridge', faction: 'Goths' },
    ],
    koil: [
        { name: '[Trooper] Kael Soze', faction: 'Police', highCommand: true },
        { name: '[Officer] Francis Francer', faction: 'Police', displayName: 1 },
        { name: 'Otto Delmar', faction: 'The Winery', leader: true },
    ],
    Kongfue: [
        { name: 'Karl "KJ" Johnny', faction: 'Vagos' },
    ],
    Kyle: [
        { name: 'Alabaster Slim', faction: 'CKR', leader: true, nicknames: ['Pimp'], displayName: 2 },
        { name: '[Officer] Kyle Pred', faction: 'Police' },
        { name: 'Brett Biggledoinks' },
        { name: "Rory O'Banion" },
        { name: 'Wyatt Derp', faction: 'Lost MC' },
        { name: 'Pal Gore' },
    ],
    kyliebitkin: [
        { name: '[Officer] Brittany Angel', faction: 'Police' },
        { name: 'Mary Mushkin', faction: 'QuickFix', displayName: 0 },
    ],
    Jackhuddo: [
        { name: 'Shane Powers', faction: 'BBMC' },
    ],
    LadyHope: [
        { name: '[Officer] Lily Pond', faction: 'Police' },
    ],
    LAGTVMaximusBlack: [
        { name: 'Outto-Tune "OTT" Tyrone', faction: 'ESB', displayName: 'OTT' },
    ],
    LarryX7: [
        { name: 'Jose "Cousin" Luis Santana', faction: 'Vagos' },
    ],
    LaS_CS: [
        { name: 'Jesse "Baby Joker" Morales', faction: 'ESB' },
    ],
    LeWolfy: [
        { name: '[Deputy] Dante Wolf', faction: 'Police' },
    ],
    LIRIK: [
        { name: 'Avon Barksdale', faction: 'Leanbois' },
    ],
    Lisilsanya: [
        { name: 'Lei Sanya', faction: 'Medical', displayName: 2 },
    ],
    Lord_Kebun: [
        { name: 'Mr. K', faction: 'Chang Gang', leader: true, displayName: 0, nicknames: ['The "Dragon"', 'Chang'] },
    ],
    LordJasta: [
        { name: 'Chris McGrawl' },
    ],
    Loserfruit: [
        { name: '[EMS] Lizzie Bien', faction: 'Medical' },
    ],
    Lovinurstyle: [
        { name: 'Rose Edwards' },
        { name: 'Leah Strong', faction: 'Fastlane' },
    ],
    Lt_Raven: [
        { name: '[Officer] Vladimir Raven', faction: 'Police', highCommand: true },
    ],
    LtSerge: [
        { name: '[Dr.] Serge Cross', faction: 'Medical', displayName: 2 },
    ],
    LuckyxMoon: [
        { name: '[Judge] Jessica Wesker', faction: 'DoJ' },
    ],
    luka_aus: [
        { name: '[Officer] Luka Kozlov', faction: 'Police' },
        { name: 'Gazza Maloo', faction: 'Lost MC' },
    ],
    luminariarayne: [
        { name: '[Officer] Ekaterina Alekseyevna', faction: 'Police', nicknames: ['Trina'], displayName: 1 },
    ],
    Lyndi: [
        { name: 'Violet Van Housen', faction: 'Angels' },
        { name: 'Willow Wolfhart', faction: 'DoC' },
    ],
    Lysium: [
        { name: 'Benji Ramos', faction: 'Vagos' },
    ],
    MacL0ven: [
        { name: 'Negan Graham', faction: 'Lost MC' },
    ],
    Madmoiselle: [
        { name: '[Therapist] Pixie Plum', faction: 'Medical' },
    ],
    Maggna: [
        { name: '[EMS] Mari Jones', faction: 'Medical', nicknames: ['MJ'], displayName: 3 },
    ],
    mantistobagan: [
        { name: '[Officer] Domenic Toretti', faction: 'Police' },
        { name: 'Jerry Callow', displayName: 1 },
        { name: 'Pepe Silvia' },
    ],
    Markiplier: [
        { name: 'Stan Wheeler' },
    ],
    MatchaSmash: [
        { name: '[EMS] Rowan Hunter', faction: 'Medical' },
    ],
    MattRP: [
        { name: '[Officer] Jack Ripley', faction: 'Police' },
    ],
    // Mclovins97: [
    //     { name: 'Jake Daug', faction: 'ESB', nicknames: ['Jdogg'], displayName: 3 },
    // ],
    Meatwrist: [
        { name: 'Chad "Chodie" Brodie', faction: 'ESB' },
    ],
    meeka_a: [
        { name: '[EMS] William "Middy" Haze', faction: 'Medical' },
    ],
    MEKABEAR: [
        { name: 'Erin Cox', faction: 'Snake Gang' },
    ],
    Mexi: [
        { name: '[Deputy] Clarence Williams', faction: 'Police', displayName: 1 },
    ],
    Mick: [
        { name: 'Gladys Berry', faction: 'Prune Gang' },
    ],
    Miggitymaan: [
        { name: '[Officer] Damien Alexander', faction: 'Police' },
    ],
    MikeTheBard: [
        { name: 'Hubcap Jones', displayName: 0 },
        { name: 'Jack Nova', displayName: 0 },
    ],
    mikezout14: [
        { name: '[Deputy] Michael Rodgers', faction: 'Police' },
    ],
    MiltonTPike1: [
        { name: 'Kiki Chanel' },
        { name: 'Merlin Edmondstoune' },
        { name: 'William "Bill Ding" Ding', nicknames: ['Bill'] },
    ],
    Ming: [
        { name: 'Ming Jingtai' },
    ],
    MinusFive: [
        { name: '[Officer] Jason Bidwell', faction: 'Police' },
    ],
    MIQQA: [
        { name: '[EMS] Janus Lee', faction: 'Medical' },
    ],
    Moboking: [
        { name: '[Deputy] Ellis Pinzon', faction: 'Police', nicknames: ['Ronaldo'] },
        { name: 'Aleksander Bogorov', faction: 'Angels', nicknames: ['Aleks'], displayName: 3 },
        { name: 'Elijiah "Middle E" Parks', faction: 'SSB' },
    ],
    MOONMOON_OW: [
        { name: 'Yung Dab', faction: 'CKR', leader: true, nicknames: ['The "Gnome"'] },
    ],
    MsBrit: [
        { name: '[EMS] Tori Corleone', faction: 'Medical' },
    ],
    MurphyBraun: [
        { name: '[Justice] Holden', faction: 'DoJ' },
        { name: 'Murphy Braun' },
    ],
    Mythematic: [
        { name: 'Mike Rosoftsam', faction: 'Leanbois', affiliate: true },
    ],
    Nakkida: [
        { name: '[Deputy] Tessa Lamb', faction: 'Police', displayName: 1 },
    ],
    Natettvrp: [
        { name: 'Carlitos Loco', faction: 'Vagos' },
    ],
    Navajo: [
        { name: 'Clarence Carter' },
    ],
    NefariousCharm: [
        { name: '[EMS] Maya Jane', faction: 'Medical' },
    ],
    Nerdandi: [
        { name: 'Petunia Susan Brookshire' },
    ],
    netsirk: [
        { name: '[EMS] Nettie Machete', faction: 'Medical' },
    ],
    NewFaceSuper: [
        { name: 'Davey Doherty', faction: 'Prune Gang' },
    ],
    Nidas: [
        { name: 'Leslie Ling', displayName: 0, nicknames: ['Lingberg'] },
    ],
    Nikez: [
        { name: 'Development "Development: Nikez"', faction: 'Development', nicknames: ['Dev', 'Developer'] },
        { name: '[Officer] Cody Sharp', faction: 'Police' },
    ],
    NikkisARiot: [
        { name: '[Deputy] Jenny Hall', faction: 'Police', nicknames: ['Jebby'] },
    ],
    Nmplol: [
        { name: 'Buddy Black' },
    ],
    NotoriousNorman: [
        { name: 'Chips Ahoy' },
    ],
    Nottics: [
        { name: 'Raul Rodriguez', faction: 'Snake Gang', nicknames: ['Rauuulllll'] },
    ],
    NovalokHD: [
        { name: '[Officer] Ben Casanova', faction: 'Police' },
    ],
    o_Oakleyz_o: [
        { name: '[Deputy] Samuel Holtz', faction: 'Police' },
    ],
    OccamsSabre: [
        { name: 'Benjamin Crane' },
        { name: '[Justice] Ray Montag', faction: 'DoJ' },
        { name: 'Jeffrey Bundy' },
    ],
    OfficialTaco: [
        { name: 'Charles "Taco" Prince', faction: 'Chang Gang' },
    ],
    OfficialWhitey: [
        { name: '[Officer] Alex Casterman', faction: 'Police' },
        { name: 'Finlay' },
    ],
    OG_Tyger: [
        { name: '[Officer] Peter Frost', faction: 'Police' },
    ],
    OhMadOne: [
        { name: 'Ginzu Okada' },
    ],
    OllyPop: [
        { name: 'Ivy Poppins' },
    ],
    OwenSeven: [
        { name: '[Officer] Owen Svensen', faction: 'Police' },
    ],
    Pengwin: [
        { name: '[Deputy] Jerry Perkins', faction: 'Police' },
    ],
    PENTA: [
        { name: 'Jordan Steele', displayName: 0, nicknames: ['"Parking" God', 'Phoenix Messiah'] },
        { name: '[Deputy] Randy Wrangler', faction: 'Police', nicknames: ['Wranglin'] },
        { name: 'Ricky Robins', faction: 'Leanbois' },
        { name: 'Chase Clouter' },
    ],
    PlasticLittle: [
        { name: 'Parson "Frosty" Brown', faction: 'Lost MC' },
    ],
    PmsProxy: [
        { name: '[Officer] Kira Light', faction: 'Police' },
        { name: 'Ella Stone' },
    ],
    pokelawls: [
        { name: 'Bogg Dann' },
    ],
    pokimane: [
        { name: 'Celine LaCroix' },
    ],
    Pons: [
        { name: '[Officer] Chet Manley', faction: 'Police' },
        { name: '[Officer] Bodean Tucker', faction: 'Police', nicknames: ['Bo'] },
    ],
    PriddyFresh: [
        { name: 'Tupac Shakur' },
    ],
    Primal: [
        { name: '[Officer] Kareem Lyon', faction: 'Police', displayName: 1 },
    ],
    Pssychotic: [
        { name: 'Jason Paul', faction: 'Lost MC', nicknames: ['JP'] },
        { name: 'Hades', faction: 'Animals', nicknames: ['Dog'] },
    ],
    qozmyox: [
        { name: 'Fernando "Mario" Reyes', faction: 'Snake Gang', nicknames: ['"Mario" from the Barrio'] },
    ],
    qurquru: [
        { name: '[Officer] Vladimir Reznik', faction: 'Police' },
    ],
    RaidedAU: [
        { name: '[Officer] Gage Draider', faction: 'Police' },
        { name: 'Development "Development: Raided"', faction: 'Development', nicknames: ['Dev', 'Developer'] },
    ],
    Ramee: [
        { name: 'Ramee El-Rahman', faction: 'Chang Gang', nicknames: ['The "Warlord"', 'The "Vulture"', 'SBS Patient-0'] },
        { name: '[Park Ranger] Conan Clarkson', faction: 'Police' },
    ],
    Rasta: [
        { name: 'Mary Livingston', faction: 'Prune Gang' },
        { name: 'Dunn Robinson', faction: 'ESB' },
    ],
    RatedEpicz: [
        { name: 'Randy Bullet', faction: 'Chang Gang', nicknames: ['Lazy-Eye Bullet'] },
        { name: '[Officer] A.J. Hunter', faction: 'Police' },
    ],
    ray308win: [
        { name: '[FIB Agent] Lyonel Winchester', faction: 'Police' },
    ],
    ReinaRP: [
        { name: 'Mona Sanchez' },
    ],
    RemiTheSiren: [
        { name: 'Wednesday Mushkin', faction: 'HOA' },
    ],
    reno_raines: [
        { name: 'Manny McDaniels', faction: 'HOA' },
    ],
    RevRoach: [
        { name: "Happy D'Klown" },
    ],
    RickMongoLIVE: [
        { name: '[ADA] Rick Mongo', faction: 'DoJ' },
    ],
    rlly: [
        { name: 'Kelly Smith', faction: 'Prune Gang' },
    ],
    RobotNinjaPants: [
        { name: '[ADA] Jacob Slate', faction: 'DoJ' },
    ],
    Rose: [
        { name: '[Deputy] Maggie Dean', faction: 'Police' },
    ],
    s0upes: [
        { name: 'James "Apples" Apeller' },
    ],
    Sal_Rosenberg: [
        { name: 'Sal Rosenberg' },
    ],
    Sams: [
        { name: 'Dimitri Barkov', faction: 'HOA' },
    ],
    Sareff: [
        { name: 'Violet Noreguarde', faction: 'Vagos' },
        { name: 'Chasity Dawes' },
    ],
    SAVx: [
        { name: 'Johnny Cassle' },
    ],
    Sax850: [
        { name: 'Motya Satovksy', faction: 'Russians' },
        { name: '[Officer] Olof Gunnarsson', faction: 'Police' },
    ],
    SayeedBlack: [
        { name: 'Arush Patel "Speedy" Santana', faction: 'Vagos', leader: true, nicknames: ['El Jefe'] },
        { name: '[ADA] Sayeed White', faction: 'DoJ' },
    ],
    shaggy_steve: [
        { name: '[Deputy] Jimmy Gordon', faction: 'Police' },
    ],
    Shindur: [
        { name: '[Deputy] Joey Keys', faction: 'Police' },
    ],
    Shortyyguy: [
        { name: 'Eddie Delish', faction: 'Leanbois' },
    ],
    Shotz: [
        { name: 'Vinny Pistone', faction: 'Chang Gang' },
        { name: '[Officer] John Mineo', faction: 'Police' },
    ],
    shroud: [
        { name: 'Richard Hard' },
    ],
    SiirToast: [
        { name: 'Anton Belov', faction: 'Russians' },
    ],
    Silent: [
        { name: 'Juan Carlos "Flippy" Hernandez', faction: 'Snake Gang', leader: true, nicknames: ['FLIPPPPY', 'FLIPPPY', 'FLIPPPPPY'] },
        { name: '[Officer] Joel Garcia', faction: 'Police' },
    ],
    SilentSentry: [
        { name: 'Ron Otterman' },
    ],
    Simplyje2ns: [
        { name: 'Jean Steele' },
    ],
    SirPink: [
        { name: 'Reginald "Reggie" Bigglesby' },
    ],
    Slasher2099: [
        { name: '[Officer] Darrel McCormik', faction: 'Police' },
        { name: '[K9 Trooper] Fenton', faction: 'Police', nicknames: ['Fentons'] },
    ],
    SmokySloth: [
        { name: 'Bovice Wilkinson' },
        { name: 'Tayvadius "Chef" Jamarcus Livingston III', faction: 'GSF' },
    ],
    sock22: [
        { name: '[Deputy] Richard Dark', faction: 'Police' },
    ],
    SodaKite: [
        { name: 'Ellie Dono', faction: 'Leanbois' },
    ],
    sodapoppin: [
        { name: 'Kevin Whipaloo', faction: 'The Winery' },
    ],
    Spaceboy: [
        { name: 'Melbert "Mel" Rickenbacker', faction: 'Prune Gang' },
    ],
    Spekel: [
        { name: 'Sonya Summers', nicknames: ['Black Betty'] },
        { name: '[Officer] Scarlett Winters', faction: 'Police' },
    ],
    spicybackpain: [
        { name: 'Kray-Tor Skullfondler', faction: 'HOA' },
    ],
    Ssaab: [
        { name: 'Al Saab', faction: 'Sahara', displayName: 2 },
        { name: '[Officer] Sam Baas', faction: 'Police', displayName: 2 },
    ],
    steamcharlie: [
        { name: '[Deputy] Sydney Bearmont', faction: 'Police', displayName: 1 },
    ],
    stitchybird: [
        { name: 'Daphne Tillamuck Valentino', faction: 'Lunatix' },
    ],
    Stoner_Minded: [
        { name: '[Officer] Frank Williams', faction: 'Police', displayName: 1 },
    ],
    SullyRP: [
        { name: 'Jack "Sully" Sullivan' },
    ],
    summit1g: [
        { name: 'Charles Johnson', faction: 'Chang Gang' },
    ],
    Sunni: [
        { name: 'Hilda Bulking', faction: 'Vagos' },
    ],
    Sur_Lee: [
        { name: 'Mitch "Dumbass" Bader' },
    ],
    SwizzMB: [
        { name: 'Miguel Almerion', faction: 'Snake Gang' },
    ],
    Syraphic: [
        { name: 'Elena Marilyn Vega' },
    ],
    t3r0: [
        { name: '[Dr.] Andrew Ducksworth', faction: 'Medical', displayName: 2 },
    ],
    tara_: [
        { name: '[EMS] Sarah Ableton', faction: 'Medical' },
    ],
    Tasara22: [
        { name: 'Tuesday Phillips' },
    ],
    Tehrani: [
        { name: 'Boris Ivanov', faction: 'Russians', leader: true },
        { name: 'Hector Guzman', faction: 'Vagos' },
    ],
    TenguOP: [
        { name: 'Wally Veloce' },
    ],
    TezMate: [
        { name: '[Deputy] Nicholas Riggs', faction: 'Police' },
    ],
    TFNeraZe: [
        { name: '[Deputy] Michael Dunning', faction: 'Police' },
    ],
    thaCOOP: [
        { name: '[Officer] Luke Holliday', faction: 'Police' },
        { name: '[Judge] Coop Holliday', faction: 'DoJ', displayName: 1 },
        { name: 'Matthew Payne', displayName: 2 },
        { name: 'Remee El-Rahman' },
    ],
    the_halfhand: [
        { name: 'Sully' },
    ],
    TheDondi: [
        { name: 'Arthur Hammond', nicknames: ['The "Doctor"'] },
        { name: '[Officer] Delaney', faction: 'Police' },
    ],
    TheGeekEntry: [
        { name: 'Stacey Doyle' },
        { name: 'Jenn Bordeaux', nicknames: ['Frenchie', 'French'] },
    ],
    TheGhostman: [
        { name: 'Bobby Schmegal' },
    ],
    theLGX: [
        { name: 'Bryce Miller', nicknames: ['BDawg'] },
    ],
    Timmac: [
        { name: '[Officer] T.J. Mack', faction: 'Police' },
        { name: 'Gomer Colton', faction: 'CKR', nicknames: ['Gomey'] },
    ],
    Timmy2: [
        { name: 'Chino G', faction: 'Vagos' },
        { name: 'Cardell "CJ" Jones', faction: 'SSB' },
    ],
    TinySpark: [
        { name: 'Daisy Dukakis', displayName: 0 },
    ],
    TinyStunt: [
        { name: '[EMS] Bailey Jade', faction: 'Medical' },
    ],
    ToastRP: [
        { name: 'Paulie', faction: 'ESB' },
    ],
    Tobiii: [
        { name: 'Development "Development: Tobiii"', faction: 'Development', nicknames: ['Dev', 'Developer'] },
    ],
    travpiper: [
        { name: 'Carlos "Cheddar" Sanchez', faction: 'HOA' },
        { name: 'Warren Wallace' },
        { name: 'Charlie Colcord' },
    ],
    traycee: [
        { name: 'Lexi Law', faction: 'Angels' },
    ],
    TwistedBones: [
        { name: 'Marcus Black', faction: 'GSF' },
    ],
    TwistedManifest: [
        { name: 'Jack Valentino', faction: 'Lunatix' },
    ],
    UberHaxorNova: [
        { name: 'Siz Fulker', faction: 'HOA', leader: true },
    ],
    uhSnow: [
        { name: '[Trooper] Jackie Snow', faction: 'Police' },
        { name: 'Mikey Mersion' },
    ],
    Umadbrahlive: [
        { name: 'Leonel Martinez', faction: 'Vagos', displayName: 2 },
        { name: 'Sergio Lopez', faction: 'Marabunta', leader: true },
        { name: 'Big E', faction: 'SSB', leader: true, nicknames: ['Big L'], displayName: 0 },
    ],
    Vader: [
        { name: 'Eugene Zuckerberg', faction: 'Leanbois', nicknames: ['Old Man'] },
        { name: 'Tuong Ru Kim' },
    ],
    Vaerinis: [
        { name: '[Assistant Chief of Police] Thomas Metzger', faction: 'Police', highCommand: true },
    ],
    VaguePWNage: [
        { name: 'Ramsay', faction: 'SSB' },
    ],
    ValorWasTaken: [
        { name: 'Esteban Julio-Cruz-Perez-Rodriguez', faction: 'Marabunta' },
    ],
    Viviana: [
        { name: 'Griselda Ambrose', nicknames: ['Granny'] },
        { name: 'Lana Valentine' },
    ],
    VTechas: [
        { name: 'Daryl Dixon', faction: 'HOA' },
    ],
    Wayward: [
        { name: '[Judge] Wayne Ardson', faction: 'DoJ' },
        { name: 'Jack "The Joker" Knaves', nicknames: ['The "Joker"'] },
        { name: 'Bowser' },
    ],
    Wehtuns: [
        { name: '[DA] Lawrence Splainer', faction: 'DoJ' },
    ],
    Whippy: [
        { name: '[Officer] Crocodile Steve', faction: 'Police' },
        { name: 'Irwin Dundee', faction: 'BBMC', leader: true, displayName: 2 },
        { name: 'James Tinklebottom' },
    ],
    Whiteboylemons: [
        { name: '[Officer] Aaron Byson', faction: 'Police' },
        { name: '[EMS] Boba Stone', faction: 'Medical' },
    ],
    WuPingNOTEggRoll: [
        { name: 'Wu "Egg Roll" Ping' },
    ],
    Xiceman: [
        { name: 'Mike Wadum', faction: 'Vagos', nicknames: ['El Gringo'] },
        { name: '[Deputy] Mike Bayo', faction: 'Police' },
    ],
    XMOTHATRUCKAX: [
        { name: 'Ronald "Red" Juggler', faction: 'Koreans' },
    ],
    xReklez: [
        { name: 'Chico', faction: 'Vagos' },
        { name: 'AJ', faction: 'SSB' },
    ],
    YoinksOG: [
        { name: 'Doug Canada' },
    ],
    yooApollo: [
        { name: 'Martin Julio-Perez-Cruz-Rodriguez', faction: 'Marabunta' },
    ],
    Zaquelle: [
        { name: '[Officer] Mackenzie Hayes', faction: 'Police' },
    ],
    Ziggy: [
        { name: '[Deputy] Ziggy Buggs', faction: 'Police', displayName: 1 },
        { name: 'Norman Bones', displayName: 0 },
    ],
    Zombie_Barricades: [
        { name: 'Tyrone Biggums', faction: 'ESB', leader: true, nicknames: ['WAR', 'WWWAAAARR'] },
    ],
    Zotbot: [
        { name: '[Physiotherapist] Leon Marks', faction: 'Medical' },
    ],
};

const npFactionsRegex = {
    leanbois: /lean\s*boi|\blba?\b/i,
    lostmc: /lost\s*mc|the\s*lost\b/i,
    sahara: /\bsahara\b/i,
    ckr: /cop[^|!]*\brecord|\bckr\b/i,
    changgang: /chang\s*gang|\bcga?\b/i,
    vagos: /vagos|yellow/i,
    gsf: /grove|\bgsf\b/i,
    ssb: /balla|\bssb\b/i,
    esb: /\besb\b|east[\s-]*side/i,
    marabunta: /\bmarabunta/i,
    development: /\bdevelop/i,
    hoa: /\bhoa\b|hogs\s*of\s*anarchy|home[\s-]*owners[\s-]*association/i,
    angels: /\bangels?\b/i,
    snakegang: /\b(?:snake|hydra|mario)\s*gang\b/i,
    doc: /\bdoc\b|\bcorrection/i,
    mechanic: /\bmechanic\b/i,
    harmony: /\bharmony\b/i,
    quickfix: /\bquick[\s-]*fix/i,
    tunershop: /\btuner[\s-]*shop\b/i,
    fastlane: /\bfast[\s-]*lane/i,
    // koreans: /korean/i,
    bbmc: /bondi\b|bbmc/i,
    mersions: /\bmersion/i,
    police: /(?<!then\b.*|!)(?:officer|deputy|(?<!private[\s-]*)detective|sergeant|lieutenant|corporal|sheriff|trooper|cadet|\b(?:ranger|dt|sgt|lt(?![^|!]*\bjones\b)|cpl|lspd|sasp|bcso|cid)\b)/i,
    medical: /(?<!then\b.*|!)(?:doctor|\b(?:dr|ems|emt)\b)/i,
};

const useColors = {
    leanbois: '#e74c3c',
    lostmc: '#ab5179',
    sahara: '#b71540',
    changgang: '#686de0',
    vagos: '#f1c40f',
    gsf: '#006422',
    ssb: '#9b59b6',
    esb: '#8854d0',
    marabunta: '#2250ff',
    hoa: '#dc9461',
    doj: '#00A032',
    russians: '#a35231',
    angels: '#ff9ff3',
    snakegang: '#789500',
    development: '#718093',
    doc: '#0984e3',
    mechanic: '#40739e',
    harmony: '#40739e',
    quickfix: '#40739e',
    tunershop: '#40739e',
    bbmc: '#ffeaa7',
    police: '#0abde3',
    medical: '#badc58',
    otherfaction: '#32ff7e',
    independent: '#32ff7e',
    othernp: '#ffffff',
    other: '#81ecec',
};

// #00A032 #cd843f #9b4d75
// fastlane: '#40739e',
// mersions, koreans, ckr, aztecas

// const useColors = {
//     leanbois: '#d64f35',
//     lostmc: '#d23f70',
//     changgang: '#9b4d75',
//     vagos: '#dc9461',
//     gsf: '#5eb847',
//     ssb: '#7561cf',
//     esb: '#8580c8',
//     hoa: '#57bf84',
//     angels: '#c55ebe',
//     snakegang: '#39855f',
//     development: '#a75635',
//     doc: '#3fc1bf',
//     // koreans, quickfix, tuner, harmony, mechanic, misfits, aztecas, russians, bbmc
//     bbmc: '#846f2d',
//     // mersions: '#cd843f',
//     police: '#4c9ad1',
//     medical: '#adbc36',
//     otherfaction: '#57bf84',
//     independent: '#57bf84',
//     othernp: '#ffffff',
//     other: '#81ecec',
// };

// const useColors = {
//     leanbois: '#ff0000',
//     lostmc: '#7f0000',
//     changgang: '#4169e1',
//     vagos: '#ffff00',
//     gsf: '#2e8b57',
//     ssb: '#da70d6',
//     esb: '#d8bfd8',
//     hoa: '#ffa500',
//     angels: '#ff1493',
//     snakegang: '#808000',
//     development: '#a75635',
//     doc: '#00ffff',
//     // lostmc, koreans, quickfix, tuner, harmony, mechanic, misfits, aztecas, russians, bbmc
//     bbmc: '#eee8aa',
//     // mersions: '#ff00ff',
//     police: '#00bfff',
//     medical: '#7fff00',
//     otherfaction: '#00fa9a',
//     independent: '#00fa9a',
//     othernp: '#ffffff',
//     other: '#81ecec',
// };

// const textColors = {
//     misfits: '#FFF',
// };

const fullFactionMap = {};

const displayNameDefault = {
    police: 2,
    doj: 2,
    mersions: 0,
};

RegExp.escape = function (string) {
    return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
};

for (const [streamer, characters] of Object.entries(npCharacters)) {
    characters.push({ name: '<Permathon>', nicknames: ['Permathon'] });
    characters.forEach((char) => {
        const names = char.name.split(/\s+/);
        const parsedNames = [];
        const titles = [];
        const realNames = [];
        let knownName;
        let currentName = null;
        for (let i = 0; i < names.length; i++) {
            const name = names[i];
            let pushName;
            if (currentName != null) {
                currentName.push(name);
                if (name.includes(']') || name.includes('"')) {
                    pushName = currentName.join(' ');
                    const type1 = pushName.includes('[');
                    pushName = pushName.replace(/[\[\]"]/g, '');
                    if (type1) {
                        titles.push(pushName);
                    } else { // had square
                        knownName = pushName; // had quotes
                    }
                    currentName = null;
                }
            } else if (name.includes('[') || name.includes('"')) {
                const type1 = name.includes('[');
                if ((type1 && name.includes(']')) || (!type1 && name.indexOf('"') !== name.lastIndexOf('"'))) {
                    pushName = name.replace(/[\[\]"]/g, '');
                    if (type1) {
                        titles.push(pushName);
                    } else {
                        knownName = pushName;
                    }
                } else {
                    currentName = [name];
                }
            } else {
                pushName = name.replace(/"/g, '');
                if (pushName !== name) knownName = pushName; // had quotes
                // realNames.push(pushName.replace(/([A-Z])\.\s*/g, '\1'));
                realNames.push(pushName.replace(/\./g, ''));
            }
            if (pushName) parsedNames.push(RegExp.escape(pushName.toLowerCase()));
        }

        if (char.nicknames) {
            if (realNames.length === 1) realNames.push(realNames[0]);
            if (char.displayName !== 0) realNames.push(...char.nicknames.filter(nck => typeof nck === 'string'));
            char.nicknames.forEach((nck) => {
                const nicknameKeywords = [...nck.matchAll(/"([^"]+)"/g)].map(result => result[1]);
                if (nicknameKeywords.length > 0) {
                    parsedNames.push(...nicknameKeywords.map(keyword => RegExp.escape(keyword.toLowerCase())));
                } else {
                    parsedNames.push(RegExp.escape(nck.toLowerCase()));
                }
            });
        }
        const fullFaction = char.faction || 'Independent';
        char.faction = fullFaction.toLowerCase().replace(' ', '');
        if (!fullFactionMap[char.faction]) fullFactionMap[char.faction] = fullFaction;
        if (char.displayName === undefined) char.displayName = displayNameDefault[char.faction] != null ? displayNameDefault[char.faction] : 1;
        if (typeof char.displayName === 'number') {
            const displayNum = char.displayName;
            char.displayName = titles ? `${titles.join(' ')} ` : '';
            if (knownName !== undefined) {
                char.displayName += knownName;
            } else if (displayNum === 0) {
                char.displayName += realNames.join(' ');
            } else {
                char.displayName += (realNames[displayNum - 1] || realNames[0]);
            }
        }
        char.nameReg = new RegExp(`\\b(?:${parsedNames.join('|')})\\b`);
        if (char.faction != null) {
            char.factionUse = useColors[char.faction] !== undefined ? char.faction : 'otherfaction';
        } else {
            char.factionUse = 'independent';
        }
    });
    const streamerLower = streamer.toLowerCase();
    if (streamer !== streamerLower) {
        npCharacters[streamerLower] = characters;
        delete npCharacters[streamer];
    }
}

const factions = [...new Set(Object.values(npCharacters).map(characters => characters.map(char => char.faction)).flat(1))];

factions.forEach((faction) => {
    if (!npFactionsRegex[faction] && !['doc'].includes(faction)) {
        const fullFaction = fullFactionMap[faction];
        let regStr = RegExp.escape(fullFaction[fullFaction.length - 1] === 's' ? fullFaction.slice(0, -1) : fullFaction).toLowerCase();
        if (regStr.length <= 3) regStr = `\\b${regStr}\\b`;
        npFactionsRegex[faction] = new RegExp(regStr, 'i');
    }
});

const npFactionsRegexEnt = Object.entries(npFactionsRegex);

const deleteOthers = () => {
    if (onPage == false) return;

    const elements = Array.from(document.getElementsByTagName('article')).filter(
        element => !element.classList.contains('npChecked')
    );

    let isFirstRemove = true;
    if (elements.length > 0 || !wasZero) {
        console.log('[TNO] There are so many elements:', elements.length);
        wasZero = elements.length === 0;
    }

    elements.forEach((element) => {
        element.classList.add('npChecked');
        element = element.parentElement.parentElement.parentElement.parentElement;
        const titleEl = element.getElementsByClassName('tw-ellipsis tw-font-size-5')[0];
        const channelEl = element.querySelectorAll("a[data-a-target='preview-card-channel-link']")[0];
        const liveElDiv = element.getElementsByClassName('tw-channel-status-text-indicator')[0];
        if (liveElDiv == null) return; // reruns
        const liveEl = liveElDiv.children[0];
        const title = titleEl.innerText;
        const titleParsed = title.toLowerCase().replace(/\./g, ' '); // ??
        const channelName = channelEl.innerText.toLowerCase();

        const isOtherCheck = checkOther && regOther.test(title);

        if (isOtherCheck) {
            liveEl.innerText = '';
            channelEl.style.color = useColors.other;
        } else {
            const isNpCheck = regNp.test(title);
            const characters = npCharacters[channelName];

            let nowCharacter;
            let factionNames = [];

            if (characters || isNpCheck) { // Is nopixel char
                if (characters) {
                    let lowestPos = Infinity;
                    for (const char of characters) {
                        const matchPos = titleParsed.indexOfRegex(char.nameReg);
                        if (matchPos > -1 && matchPos < lowestPos) {
                            lowestPos = matchPos;
                            nowCharacter = char;
                        }
                    }
                }

                if (nowCharacter === undefined) {
                    for (const [faction, regex] of npFactionsRegexEnt) {
                        const matchPos = title.indexOfRegex(regex);
                        if (matchPos > -1) {
                            const factionObj = { name: faction, index: matchPos, character: characters && characters.find(char => char.faction === faction) };
                            factionObj.rank = factionObj.character ? 0 : 1;
                            factionNames.push(factionObj);
                        }
                    }

                    if (factionNames.length) {
                        factionNames.sort((a, b) => a.rank - b.rank || a.index - b.index);
                        if (factionNames[0].character) nowCharacter = factionNames[0].character;
                        factionNames = factionNames.map(f => f.name);
                    }
                }
            }

            if (nowCharacter) {
                const nowColor = useColors[nowCharacter.factionUse];
                channelEl.style.color = nowColor;
                liveElDiv.style.backgroundColor = nowColor;
                liveEl.style.color = '#000';
                liveEl.innerText = `${nowCharacter.leader ? '♛ ' : ''}${nowCharacter.displayName}`;
            } else if (factionNames.length) {
                const nowColor = useColors[factionNames[0]] || useColors.independent;
                channelEl.style.color = nowColor;
                liveElDiv.style.backgroundColor = nowColor;
                liveEl.style.color = '#000';
                liveEl.innerText = `< ${fullFactionMap[factionNames[0]] || factionNames[0]} >`;
            } else if (characters) {
                const nowColor = useColors[characters[0].factionUse];
                channelEl.style.color = nowColor;
                liveElDiv.style.backgroundColor = nowColor;
                liveEl.style.color = '#000';
                liveEl.innerText = `? ${characters[0].displayName} ?`;
            } else if (isNpCheck) {
                liveEl.innerText = '';
                channelEl.style.color = useColors.othernp;
            } else {
                // const viewers = element.getElementsByClassName('tw-media-card-stat tw-c-background-overlay')[0].firstChild.innerText;
                const viewers = element.getElementsByClassName('tw-media-card-stat')[0].firstChild.innerText;
                let viewersNum = parseFloat(viewers);
                if (viewers.includes('K viewer')) viewersNum *= 1000;
                if (viewersNum < minViewers) {
                    if (isFirstRemove && keepDeleting) {
                        keepDeleting = false;
                        if (stopOnMin) {
                            clearInterval(interval);
                            interval = null;
                            console.log('[TNO] Finished.');
                        } else {
                            console.log('[TNO] Clearing stream thumbnails with low viewers');
                        }
                    }
                    const images = element.getElementsByClassName('tw-image');
                    for (let j = 0; j < images.length; j++) images[j].src = '';
                } else if (keepDeleting) {
                    // element.outerHTML = '';
                    element.parentNode.removeChild(element);
                    console.log('[TNO] Deleted');
                }
                if (isFirstRemove) isFirstRemove = false;
            }
        }
    });
};

// Automatically select English tag for GTAV
const selectEnglish = () => {
    let englishInterval;
    let hasClicked = false;
    englishInterval = setInterval(() => {
        if (hasClicked) {
            clearInterval(englishInterval);
            window.location.reload();
        }
        const englishXPath = '//div[contains(concat(" ", normalize-space(@class), " "), " tw-pd-x-1 tw-pd-y-05 ") and text()="English"]';
        const englishTag = document.evaluate(englishXPath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
        if (englishTag != null) {
            hasClicked = true;
            englishTag.click();
            console.log('selected english');
        }
    }, 100);

    const hasEnglishTag = document.querySelector('button[data-a-target="form-tag-English"]') != null;

    if (!hasEnglishTag) {
        const inp = document.querySelector('#dropdown-search-input');
        inp.select();
    } else {
        console.log('has english tag');
    }
};

const checkForEnglish = async () => {
    let trendingInterval;
    trendingInterval = setInterval(() => {
        const pElements = document.querySelectorAll('div[data-a-target="tags-filter-dropdown"] p');
        for (const pEl of pElements) {
            if (pEl.innerText === 'Trending') {
                clearInterval(trendingInterval);
                selectEnglish();
                break;
            }
        }
    }, 100);
};

onPage = /^https:\/\/www\.twitch\.tv\/directory\/game\/Grand%20Theft%20Auto%20V/.test(window.location.href);

const activateInterval = async () => {
    const status = await getStorage('tnoStatus');
    console.log('[TNO] Extension enabled:', status);
    if (status === false) return false;
    checkForEnglish();

    if (interval == null) {
        console.log('[TNO] Starting interval');
        interval = setInterval(deleteOthers, 1000 * intervalSeconds); // Interval gets ended when minViewers is reached
        deleteOthers();
        return true;
    }
    console.log("[TNO] Couldn't start interval (already active)");
    return false;
};

const stopInterval = () => {
    if (interval != null) {
        console.log('[TNO] Stopping interval');
        clearInterval(interval);
        interval = null;
        return true;
    }
    console.log("[TNO] Couldn't stop interval (already ended)");
    return false;
};

// Twitch switches page without any reloading:
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('[TNO] PAGE STATUS:', request);
    if (request.status === 'START') {
        onPage = true;
        activateInterval();
    } else if (request.status === 'STOP') {
        onPage = false;
        stopInterval();
    }
});

setTimeout(() => {
    if (onPage) {
        activateInterval();
    }
}, 1000);
