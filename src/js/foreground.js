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

const objectMap = (obj, fn) => Object.fromEntries(Object.entries(obj).map(([k, v], i) => [k, fn(v, k, i)]));

// Settings

const minViewers = 1;
const stopOnMin = true;
const checkOther = true;
const intervalSeconds = 0.7;

const allowAll = true;

let keepDeleting = true;
let onPage = false;
let interval;

let wasZero = false;

let regNp;
// const regOther = /the\s*family|\btf(?:rp|\b)|family\s*rp|twitchrp|\bt\W*rp\b|benefactor|\bob(?:rp|\b)|dondi|\bsvrp|subversion/i;
let regOther;

let npCharacters = [];

let npFactionsRegex = {};

let useColors = {};

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

let activateInterval;
let stopInterval;

const filterStreams = async () => {
    console.log('Fetching recent character data');

    let fetchResult = await fetch(
        'https://raw.githubusercontent.com/Vaeb/Twitch-NoPixel-Only/master/src/js/characters.json',
        {
            headers: { 'Cache-Control': 'no-cache', pragma: 'no-cache' },
        }
    );
    fetchResult = await fetchResult.json();

    if (fetchResult.regNp != null) regNp = new RegExp(fetchResult.regNp, 'i');
    if (fetchResult.regOther != null) regOther = new RegExp(fetchResult.regOther, 'i');
    if (fetchResult.npCharacters != null) npCharacters = fetchResult.npCharacters;
    if (fetchResult.npFactionsRegex != null) npFactionsRegex = objectMap(fetchResult.npFactionsRegex, regStr => new RegExp(regStr, 'i'));
    if (fetchResult.useColors != null) useColors = fetchResult.useColors;

    console.log('Fetched data!');

    for (const [streamer, characters] of Object.entries(npCharacters)) {
        characters.push({ name: '<Permathon>', nicknames: ['Permathon'] });
        // eslint-disable-next-line no-loop-func
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

            const isNpCheck = regNp.test(title);
            const characters = npCharacters[channelName];

            let useOther = !(characters || isNpCheck);
            if (!allowAll) useOther = useOther && isOtherCheck;

            if (useOther) {
                liveEl.innerText = '';
                channelEl.style.color = useColors.other;
            } else {
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

    activateInterval = async () => {
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

    stopInterval = () => {
        if (interval != null) {
            console.log('[TNO] Stopping interval');
            clearInterval(interval);
            interval = null;
            return true;
        }
        console.log("[TNO] Couldn't stop interval (already ended)");
        return false;
    };

    setTimeout(() => {
        if (onPage) {
            activateInterval();
        }
    }, 1000);
};

filterStreams();

// Twitch switches page without any reloading:
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('[TNO] PAGE STATUS:', request);
    if (request.status === 'START') {
        onPage = true;
        if (activateInterval != null) activateInterval();
    } else if (request.status === 'STOP') {
        onPage = false;
        if (stopInterval != null) stopInterval();
    }
});
