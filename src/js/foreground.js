/*
 * Twitch NoPixel Only
 * Created by Vaeb
*/

console.log('[TNO] Loading Twitch NoPixel Only...');

const getStorage = (key, defaultVal = undefined) => new Promise((resolve) => {
    const useDefault = defaultVal !== undefined;

    chrome.storage.local.get(key, (value) => {
        let val;
        if (typeof key === 'string') {
            val = value[key];
            if (useDefault && val === undefined) val = defaultVal;
        } else {
            val = [];
            const manyDefaults = Array.isArray(defaultVal);
            for (let i = 0; i < key.length; i++) {
                const k = key[i];
                let v = value[k];
                if (useDefault && v === undefined) {
                    v = manyDefaults ? defaultVal[i] : defaultVal;
                }
                val.push(v);
            }
        }
        resolve(val);
    });
});

const setStorage = async (key, val) => chrome.storage.local.set({ [key]: val });

String.prototype.indexOfRegex = function (regex, startPos) {
    const indexOf = this.substring(startPos || 0).search(regex);
    return indexOf >= 0 ? indexOf + (startPos || 0) : indexOf;
};

const objectMap = (obj, fn) => Object.fromEntries(Object.entries(obj).map(([k, v], i) => [k, fn(v, k, i)]));

// Settings

let minViewers;
let stopOnMin;
let intervalSeconds;

let keepDeleting = true;
let onPage = false;
let interval;

let wasZero = false;

let regNp;
// const regOther = /the\s*family|\btf(?:rp|\b)|family\s*rp|twitchrp|\bt\W*rp\b|benefactor|\bob(?:rp|\b)|dondi|\bsvrp|subversion/i;
let regOther;

let npCharacters = {};

let npFactionsRegex = {};

let useColors = {};
let useColorsDark = {};
let useColorsLight = {};

const FSTATES = {
    remove: 0,
    nopixel: 1,
    other: 2,
};

// #00A032 #cd843f #9b4d75 #b71540 #ff0074
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
    const isDeveloper = typeof document.cookie === 'string' && document.cookie.includes('name=vaeben');

    const fetchHeaders = new Headers();
    fetchHeaders.append('pragma', 'no-cache');
    fetchHeaders.append('cache-control', 'no-cache');

    const fetchInit = {
        method: 'GET',
        headers: fetchHeaders,
    };

    const myRequest = new Request('https://raw.githubusercontent.com/Vaeb/Twitch-NoPixel-Only/master/src/js/characters.json');

    let fetchResult = await fetch(myRequest);
    fetchResult = await fetchResult.json();

    if (fetchResult == null || fetchResult.npCharacters == null) {
        console.log('Failed to fetch character data:', fetchResult);
        return;
    }

    ({ minViewers, stopOnMin, intervalSeconds, npCharacters, useColorsDark, useColorsLight } = fetchResult);
    regNp = new RegExp(fetchResult.regNp, 'i');
    regOther = new RegExp(fetchResult.regOther, 'i');
    npFactionsRegex = objectMap(fetchResult.npFactionsRegex, regStr => new RegExp(regStr, 'i'));

    const bodyHexColor = getComputedStyle(document.body).getPropertyValue('--color-background-body');
    let isDark = true;

    if (bodyHexColor === '#f7f7f8') {
        useColors = useColorsLight;
        isDark = false;
    } else {
        useColors = useColorsDark;
    }

    console.log('Fetched data!');

    let [tnoStatus, tnoEnglish, tnoOthers, tnoAllowAll] = await getStorage(['tnoStatus', 'tnoEnglish', 'tnoOthers', 'tnoAllowAll'], [true, true, false, false]);
    const filterEnabled = !isDeveloper || !tnoAllowAll; // Fail-safe incase extension accidentally gets published with tnoAllowAll enabled

    for (const [streamer, characters] of Object.entries(npCharacters)) {
        if (characters.length > 0) {
            characters.push({ name: '<Permathon>', nicknames: ['Permathon'] });
        }

        // eslint-disable-next-line no-loop-func
        characters.forEach((char) => {
            const names = char.name.split(/\s+/);
            const nameRegAll = [];
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
                    if (nck[0] === '/' && nck[nck.length - 1] === '/') {
                        nameRegAll.push(nck.substring(1, nck.length - 1));
                    } else {
                        const nicknameKeywords = [...nck.matchAll(/"([^"]+)"/g)].map(result => result[1]);
                        if (nicknameKeywords.length > 0) {
                            parsedNames.push(...nicknameKeywords.map(keyword => RegExp.escape(keyword.toLowerCase())));
                        } else {
                            parsedNames.push(RegExp.escape(nck.toLowerCase()));
                        }
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

            nameRegAll.push(`\\b(?:${parsedNames.join('|')})\\b`);
            char.nameReg = new RegExp(nameRegAll.join('|'), nameRegAll.length > 1 ? 'i' : undefined);

            if (char.faction != null) {
                char.factionUse = useColors[char.faction] !== undefined ? char.faction : 'otherfaction';
            } else {
                char.factionUse = 'independent';
            }

            if (char.other === 1) { // If primarily on other server
                if (characters.assumeOther === undefined) {
                    characters.assumeOther = 1; // Assume every character is primarily on other server
                } else if (char.assumeOther === 0) {
                    characters.assumeOther = 2; // Assume some characters are primarily on other server
                }
            } else if (char.other === 0) {
                if (characters.assumeOther === undefined) {
                    characters.assumeOther = 0; // Assume no characters are primarily on other server
                } else if (characters.assumeOther === 1) {
                    characters.assumeOther = 2; // Assume some characters are primarily on other server
                }
            } else if (char.other == undefined) {
                char.other = 0;
            }
        });

        if (characters.assumeOther === undefined) {
            characters.assumeOther = 0;
        }

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

    let isDeleting = false;

    const deleteOthers = () => {
        if (onPage == false) return;
        // if (onPage == false || isDeleting === true) return;
        isDeleting = true;

        const elements = Array.from(document.getElementsByTagName('article')).filter(
            element => !element.classList.contains('npChecked')
        );

        let isFirstRemove = true;
        if (elements.length > 0 || !wasZero) {
            console.log('[TNO] _There are so many elements:', elements.length);
            wasZero = elements.length === 0;
        }

        elements.forEach((element) => {
            element.classList.add('npChecked');
            element = element.parentElement.parentElement.parentElement.parentElement;
            const titleEl = element.getElementsByClassName('tw-ellipsis tw-font-size-5')[0];
            const channelEl = element.querySelectorAll("a[data-a-target='preview-card-channel-link']")[0];
            let liveElDiv = element.getElementsByClassName('tw-channel-status-text-indicator')[0];
            let liveEl;
            if (liveElDiv != null) {
                liveEl = liveElDiv.children[0];
            } else {
                liveElDiv = $('<div>')[0];
                liveEl = $('<div>')[0];
            }
            const title = titleEl.innerText;
            const titleParsed = title.toLowerCase().replace(/\./g, ' '); // ??
            const channelName = channelEl.innerText.toLowerCase();

            const onOther = regOther.test(title);
            const onNp = regNp.test(title);
            const characters = npCharacters[channelName];
            const mainsOther = characters && characters.assumeOther;
            const onMainOther = !onNp && mainsOther;
            const npStreamer = onNp || characters;

            let filterState; // remove, mark-np, mark-other
            if (filterEnabled) { // If filtering streams is enabled
                if ((tnoOthers && (onOther || onMainOther)) || (!tnoOthers && npStreamer && onOther)) { // If is-including-others and streamer on another server, or it's an NP streamer playing another server
                    filterState = FSTATES.other;
                } else if (npStreamer && !onMainOther && !onOther) { // If NoPixel streamer that isn't on another server
                    filterState = FSTATES.nopixel;
                } else {
                    filterState = FSTATES.remove;
                }
            } else {
                if (npStreamer && !onMainOther && !onOther) { // If NoPixel streamer that isn't on another server
                    filterState = FSTATES.nopixel;
                } else {
                    filterState = FSTATES.other;
                }
            }

            if (filterState === FSTATES.other) { // Other included RP servers
                liveEl.innerText = '';
                channelEl.style.color = useColors.other;
            } else if (filterState === FSTATES.nopixel) { // NoPixel stream
                let nowCharacter;
                let factionNames = [];

                if (characters && characters.length) {
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

                const useTextColor = '#000';
                // const useTextColor = isDark ? '#000' : '#f7f7f8';

                if (nowCharacter) {
                    const nowColor = useColors[nowCharacter.factionUse];
                    const nowColorDark = useColorsDark[nowCharacter.factionUse];
                    channelEl.style.color = nowColor;
                    liveElDiv.style.backgroundColor = nowColorDark;
                    liveEl.style.color = useTextColor;
                    liveEl.innerText = `${nowCharacter.leader ? '♛ ' : ''}${nowCharacter.displayName}`;
                } else if (factionNames.length) {
                    const nowColor = useColors[factionNames[0]] || useColors.independent;
                    const nowColorDark = useColorsDark[factionNames[0]] || useColorsDark.independent;
                    channelEl.style.color = nowColor;
                    liveElDiv.style.backgroundColor = nowColorDark;
                    liveEl.style.color = useTextColor;
                    liveEl.innerText = `< ${fullFactionMap[factionNames[0]] || factionNames[0]} >`;
                } else if (characters && characters.length) {
                    const nowColor = useColors[characters[0].factionUse];
                    const nowColorDark = useColorsDark[characters[0].factionUse];
                    channelEl.style.color = nowColor;
                    liveElDiv.style.backgroundColor = nowColorDark;
                    liveEl.style.color = useTextColor;
                    liveEl.innerText = `? ${characters[0].displayName} ?`;
                } else {
                    liveEl.innerText = '';
                    channelEl.style.color = useColors.othernp;
                }
            } else if (filterState === FSTATES.remove) { // Remove stream
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
                    // element.parentNode.removeChild(element);
                    element.style.display = 'none';
                    console.log('[TNO] Deleted');
                }
                if (isFirstRemove) isFirstRemove = false;
            }
        });

        isDeleting = false;
    };

    const waitForElement = async (selector, maxTime = Infinity) => {
        let el;
        let timer;

        if (typeof selector === 'string') {
            const selectorString = selector;
            selector = () => document.querySelector(selectorString);
        }

        const initStamp = +new Date();

        while ((el = selector()) == null) {
            // eslint-disable-next-line
            await new Promise((resolve) => {
                cancelAnimationFrame(timer);
                timer = requestAnimationFrame(resolve);
            });

            if ((+new Date() - initStamp) >= maxTime) {
                console.log('waitForElement timed out after', maxTime, 'ms');
                break;
            }
        }

        return el;
    };

    // Automatically select English tag for GTAV
    const selectEnglish = async () => {
        await waitForElement('.animated-tag--no-bounce, [data-a-target="form-tag-add-filter-suggested"]');

        const hasEnglishTag = document.querySelector('button[data-a-target="form-tag-English"]') != null;

        if (!hasEnglishTag) {
            let englishTag;

            while (englishTag == null) {
                const inp = document.querySelector('#dropdown-search-input');
                inp.select();

                console.log('looking for english');

                // eslint-disable-next-line no-await-in-loop
                englishTag = await waitForElement(() => {
                    const englishXPath = '//div[contains(concat(" ", normalize-space(@class), " "), " tw-pd-x-1 tw-pd-y-05 ") and text()="English"]';
                    return document.evaluate(englishXPath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                }, 1000);
            }

            // if (englishTag == null) return;

            englishTag.click();
            console.log('selected english');
            $(':focus').blur();
        } else {
            console.log('has english tag');
        }
    };

    const addSettings = async () => {
        const $followBtn = $(await waitForElement('[data-test-selector="follow-game-button-component"]'));
        const $container = $followBtn.parent().parent();
        const $setEnglishBtn = $('<button>⚙️ Twitch NoPixel Only</button>');
        $setEnglishBtn.addClass($followBtn.attr('class'));
        $setEnglishBtn.css({
            margin: '0 0 0 10px',
            padding: '0 10px',
        });
        $container.append($setEnglishBtn);

        $setEnglishBtn.click(() => {
            Swal.fire({
                // icon: 'info',
                // title: 'TNO Settings',
                html: `
                    <div class="settings-container">
                        <div class="settings-titles">
                            <span class="settings-title">TNO Settings</span>
                            <span class="settings-reload">🗘</span>
                        </div>
                        <div class="settings-options">
                            <div class="settings-option">
                                <span class="settings-name bold">Enabled:</span>
                                <span class="settings-value">
                                    <input id="setting-status" type="checkbox" class="toggle" ${tnoStatus ? 'checked' : ''}>
                                </span>
                            </div>
                            <div class="settings-option">
                                <span class="settings-name">Force "English" only (<em>recommended</em>):</span>
                                <span class="settings-value">
                                    <input id="setting-english" type="checkbox" class="toggle" ${tnoEnglish ? 'checked' : ''}>
                                </span>
                            </div>
                            <div class="settings-option">
                                <span class="settings-name">Include other roleplay servers:</span>
                                <span class="settings-value">
                                    <input id="setting-others" type="checkbox" class="toggle" ${tnoOthers ? 'checked' : ''}>
                                </span>
                            </div>
                            ${isDeveloper ? `
                            <div class="settings-option">
                                <span class="settings-name">Filter streams</span>
                                <span class="settings-value">
                                    <input id="setting-show-all" type="checkbox" class="toggle" ${!tnoAllowAll ? 'checked' : ''}>
                                </span>
                            </div>
                            ` : ''}
                        </div>
                    </div>
                `,
                heightAuto: false,
                width: 'auto',
                // confirmButtonText: 'Close',
                showConfirmButton: false,
                didOpen: () => {
                    const $settingsReload = $('.settings-reload');
                    const $settingStatus = $('#setting-status');
                    const $settingEnglish = $('#setting-english');
                    const $settingOthers = $('#setting-others');
                    const $settingShowAll = $('#setting-show-all');

                    $settingsReload.click(() => window.location.reload());

                    $settingStatus.change(function () {
                        const newValue = this.checked;
                        setStorage('tnoStatus', newValue);
                        tnoStatus = newValue;
                        console.log('Set status to:', newValue);
                    });

                    $settingEnglish.change(function () {
                        const newValue = this.checked;
                        setStorage('tnoEnglish', newValue);
                        tnoEnglish = newValue;
                        console.log('Set force-english to:', newValue);
                    });

                    $settingOthers.change(function () {
                        const newValue = this.checked;
                        setStorage('tnoOthers', newValue);
                        tnoOthers = newValue;
                        console.log('Set include-others to:', newValue);
                    });

                    if ($settingShowAll) {
                        $settingShowAll.change(function () {
                            const newValue = !this.checked;
                            setStorage('tnoAllowAll', newValue);
                            tnoAllowAll = newValue;
                            console.log('Set show-all to:', newValue);
                        });
                    }
                },
            });
        });
    };

    onPage = /^https:\/\/www\.twitch\.tv\/directory\/game\/Grand%20Theft%20Auto%20V/.test(window.location.href);

    activateInterval = async () => {
        if (interval != null) {
            console.log("[TNO] Couldn't start interval (already running)");
            return false;
        }

        ([tnoStatus, tnoEnglish, tnoOthers, tnoAllowAll] = await getStorage(['tnoStatus', 'tnoEnglish', 'tnoOthers', 'tnoAllowAll'], [true, true, false, false]));

        addSettings(); // Settings should show even if status disabled

        if (tnoStatus === false) {
            console.log("[TNO] Couldn't start interval (status set to disabled)");
            return false;
        }

        if (tnoEnglish) {
            selectEnglish();
        }

        console.log('[TNO] Starting interval');
        interval = setInterval(deleteOthers, 1000 * intervalSeconds); // Interval gets ended when minViewers is reached
        deleteOthers();

        return true;
    };

    stopInterval = () => {
        if (interval == null) {
            console.log("[TNO] Couldn't stop interval (already ended)");
            return false;
        }

        console.log('[TNO] Stopping interval');
        clearInterval(interval);
        interval = null;

        return true;
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
