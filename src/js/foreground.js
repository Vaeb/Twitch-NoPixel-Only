/*
 * Twitch NoPixel Only
 * Created by Vaeb
 */

console.log('[TNO] Loading Twitch NoPixel Only...');

const getStorage = (keys, defaultVal = undefined) =>
    new Promise((resolve) => {
        let useKeys = keys;
        if (Array.isArray(keys)) useKeys = keys.map(data => (Array.isArray(data) ? data[0] : data));

        chrome.storage.local.get(useKeys, (values) => {
            let val;
            if (typeof keys === 'string') {
                val = values[keys];
                if (val === undefined) val = defaultVal;
            } else {
                val = [];
                for (let i = 0; i < keys.length; i++) {
                    const k = useKeys[i];
                    const kDefault = Array.isArray(keys[i]) ? keys[i][1] : undefined;
                    let v = values[k];
                    if (v === undefined) v = kDefault;
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
let filterStreamFaction = 'allnopixel';

let regNp;
let regNpPublic;
let regNpWhitelist;
let regOthers;

let npCharacters = {};

let npFactionsRegex = {};

let useColors = {};
let useColorsDark = {};
let useColorsLight = {};

const FSTATES = {
    remove: 0,
    nopixel: 1,
    other: 2,
    hide: 3,
};

const ASTATES = {
    assumeNpNoOther: -1,
    assumeNp: 0,
    assumeOther: 1,
    someOther: 1.5,
};

const displayNameDefault = {
    police: 2,
    doj: 2,
    asrr: 0,
    mersions: 0,
};

// #00A032 #cd843f #b71540 #ff0074 #8854d0
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

RegExp.escape = function (string) {
    return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
};

const dateStr = () =>
    new Date(+new Date() + 1000 * 60 * 60)
        .toISOString()
        .replace('T', ' ')
        .replace(/\.\w+$/, '');

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

    const dataRequest = new Request('https://vaeb.io:3030/tno_data'); // API code is open-source: https://github.com/Vaeb/TNO-Backend

    let dataResult = await fetch(dataRequest);
    try {
        dataResult = await dataResult.json();
    } catch (err) {
        console.error('Failed to fetch character data:');
        throw new Error(err);
    }

    if (dataResult == null || dataResult.npCharacters == null) {
        console.log('Failed to fetch character data (empty):', dataResult);
        return;
    }

    const streamsRequest = new Request('https://vaeb.io:3030/streams?allowOthers=true'); // API code is open-source: https://github.com/Vaeb/TNO-Backend

    let streamsResult;
    let allStreams;

    fetch(streamsRequest)
        .then(async (result) => {
            streamsResult = await result.json();

            if (streamsResult == null || streamsResult.length == 0) {
                console.log('Failed to fetch streams data (empty):', streamsResult);
            }

            console.log('streamsResult', typeof streamsResult, streamsResult, streamsResult.length);

            allStreams = streamsResult;
        })
        .catch((err) => {
            console.error('Failed to fetch streams data:');
            console.error(err);
        });

    ({
        minViewers, stopOnMin, intervalSeconds, regOthers, npCharacters, useColorsDark, useColorsLight,
    } = dataResult);
    regNp = new RegExp(dataResult.regNp, 'i');
    regNpPublic = new RegExp(dataResult.regNpPublic, 'i');
    regNpWhitelist = new RegExp(dataResult.regNpWhitelist, 'i');
    regOthers.forEach((obj) => {
        obj.reg = new RegExp(obj.reg, 'i');
    });
    npFactionsRegex = objectMap(dataResult.npFactionsRegex, regStr => new RegExp(regStr, 'i'));

    const bodyHexColor = getComputedStyle(document.body).getPropertyValue('--color-background-body');
    let isDark = true;

    if (bodyHexColor === '#f7f7f8') {
        useColors = useColorsLight;
        isDark = false;
    } else {
        useColors = useColorsDark;
    }

    console.log('Fetched data!');

    let [tnoStatus, tnoEnglish, tnoPublic, tnoOthers, tnoScrolling, tnoAllowAll] = await getStorage([
        ['tnoStatus', true],
        ['tnoEnglish', true],
        ['tnoPublic', true],
        ['tnoOthers', false],
        ['tnoScrolling', false],
        ['tnoAllowAll', false],
    ]);
    const filterEnabled = !isDeveloper || !tnoAllowAll; // Fail-safe incase extension accidentally gets published with tnoAllowAll enabled

    for (const [streamer, characters] of Object.entries(npCharacters)) {
        if (characters.length > 0) {
            characters.push({ name: '<Permathon>', nicknames: ['Permathon', 'Perma?thon'] });
        }

        const foundOthers = {};

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
                        } else {
                            // had square
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
                    char.displayName += realNames[displayNum - 1] || realNames[0];
                }
            }

            nameRegAll.push(`\\b(?:${parsedNames.join('|')})\\b`);
            if (nameRegAll.length > 1) console.log('nameRegAll', nameRegAll);
            char.nameReg = new RegExp(nameRegAll.join('|'), nameRegAll.length > 1 ? 'ig' : 'g');

            if (char.faction != null) {
                char.factionUse = useColors[char.faction] !== undefined ? char.faction : 'otherfaction';
            } else {
                char.factionUse = 'independent';
            }

            if (char.assume !== undefined) foundOthers[char.assume] = true;

            if (!characters.assumeServer) characters.assumeServer = char.assumeServer || 'whitelist';
            if (!char.assumeServer) char.assumeServer = characters.assumeServer;
        });

        if (foundOthers.assumeNp && foundOthers.assumeOther) {
            characters.assumeOther = ASTATES.someOther;
        } else if (foundOthers.assumeOther) {
            characters.assumeOther = ASTATES.assumeOther;
        } else if (foundOthers.assumeNpNoOther) {
            characters.assumeOther = ASTATES.assumeNpNoOther;
        } else if (foundOthers.assumeNp) {
            characters.assumeOther = ASTATES.assumeNp;
        } else {
            characters.assumeOther = ASTATES.assumeNp;
        }

        const streamerLower = streamer.toLowerCase();
        if (streamer !== streamerLower) {
            npCharacters[streamerLower] = characters;
            delete npCharacters[streamer];
        }
    }

    console.log(npCharacters);

    const factions = [
        ...new Set(
            Object.values(npCharacters)
                .map(characters => characters.map(char => char.faction))
                .flat(1)
        ),
    ];

    console.log(factions);

    const keepS = { News: true };
    factions.forEach((faction) => {
        if (!npFactionsRegex[faction] && !['doc'].includes(faction)) {
            const fullFaction = fullFactionMap[faction];
            let regStr = RegExp.escape(fullFaction[fullFaction.length - 1] === 's' && !keepS[fullFaction] ? fullFaction.slice(0, -1) : fullFaction).toLowerCase();
            if (regStr.length <= 3) regStr = `\\b${regStr}\\b`;
            npFactionsRegex[faction] = new RegExp(regStr, 'i');
        }
    });

    console.log(npFactionsRegex);

    const npFactionsRegexEntries = Object.entries(npFactionsRegex);

    let isDeleting = false;
    let minLoadedViewers = null;
    let minLoadedText = null;

    // const resetFiltering = () => {
    //     const elements = Array.from(document.getElementsByTagName('article')).filter(element => element.classList.contains('npChecked'));
    //     console.log('resetting for', elements.length, 'elements');
    //     elements.forEach((element) => {
    //         element.classList.remove('npChecked');
    //     });
    // };

    const getMainElFromArticle = el => el.parentElement.parentElement.parentElement.parentElement;

    const resetFiltering = () => {
        const manualElements = Array.from(document.getElementsByTagName('article')).filter(element => element.classList.contains('npManual'));
        console.log('removing', manualElements.length, 'manual elements');
        for (const element of manualElements) {
            getMainElFromArticle(element).remove();
        }

        const elements = Array.from(document.getElementsByTagName('article')).filter(element => element.classList.contains('npChecked'));
        console.log('resetting for', elements.length, 'elements');
        elements.forEach((element) => {
            element.classList.remove('npChecked');
        });
    };

    const metaFactions = ['allnopixel', 'alltwitch'];
    const npMetaFactions = [...metaFactions, 'othernp', 'publicnp'];

    const deleteOthers = () => {
        if (onPage == false) return;
        // if (onPage == false || isDeleting === true) return;
        isDeleting = true;

        const useTextColor = '#000';
        // const useTextColor = isDark ? '#000' : '#f7f7f8';
        const isMetaFaction = metaFactions.includes(filterStreamFaction);
        const isNpMetaFaction = npMetaFactions.includes(filterStreamFaction);
        const minViewersUse = isNpMetaFaction ? minViewers : 3;

        const allElements = Array.from(document.getElementsByTagName('article'));
        const elements = allElements.filter(element => !element.classList.contains('npChecked'));
        const streamCount = document.getElementById('streamCount');

        const prevWasZero = wasZero;

        let isFirstRemove = true;
        if (elements.length > 0 || !wasZero) {
            console.log('[TNO] _There are so many elements:', elements.length);
            wasZero = elements.length === 0;
        }

        // if (elements.length > 0 && prevWasZero) {
        //     const $scrollDiv = $('div.root-scrollable.scrollable-area').find('> div.simplebar-scroll-content');
        //     const bottomRem = ($scrollDiv[0].scrollHeight - $scrollDiv.height()) - $scrollDiv.scrollTop();
        //     console.log('before-deletion bottomRem:', bottomRem);
        // }

        elements.forEach((element) => {
            const isManualStream = element.classList.contains('npManual');
            element.classList.add('npChecked');
            element = getMainElFromArticle(element);
            const titleEl = element.querySelector('h3');
            const channelEl = element.querySelector("a[data-a-target='preview-card-channel-link']");
            let liveElDiv = element.getElementsByClassName('tw-channel-status-text-indicator')[0];
            const viewers = element.getElementsByClassName('tw-media-card-stat')[0].textContent;

            let viewersNum = parseFloat(viewers);
            if (viewers.includes('K viewer')) viewersNum *= 1000;
            if (Number.isNaN(viewersNum)) viewersNum = minLoadedViewers != null ? minLoadedViewers : minViewersUse;

            if (minLoadedViewers == null || viewersNum < minLoadedViewers) {
                minLoadedViewers = viewersNum;
                minLoadedText = viewers;
            }

            let liveEl;
            if (liveElDiv != null) {
                liveEl = liveElDiv.children[0];
            } else {
                liveElDiv = $('<div>')[0];
                liveEl = $('<div>')[0];
            }

            const channelName = channelEl.textContent.toLowerCase();
            const title = titleEl.textContent;
            const titleParsed = title.toLowerCase().replace(/\./g, ' '); // ??

            let onOther = false;
            let onOtherPos = -1;
            let onOtherIncluded = false;
            let serverName = '';
            for (let i = 0; i < regOthers.length; i++) {
                const regOther = regOthers[i];
                onOtherPos = title.indexOfRegex(regOther.reg);
                if (onOtherPos > -1) {
                    onOther = true;
                    serverName = regOther.name;
                    if (regOther.include) onOtherIncluded = true;
                    break;
                }
            }

            let onNp = false;
            const onNpPos = title.indexOfRegex(regNp);
            if (onNpPos > -1 && (onOther === false || onNpPos < onOtherPos)) {
                onNp = true;
                onOther = false;
                onOtherIncluded = false;
            }
            const characters = npCharacters[channelName];
            const mainsOther = characters && characters.assumeOther == ASTATES.assumeOther;
            const keepNp = characters && characters.assumeOther == ASTATES.assumeNpNoOther;
            const onMainOther = !onNp && mainsOther;
            const npStreamer = onNp || characters;

            const nowFilterEnabled = filterEnabled && filterStreamFaction !== 'alltwitch';
            const tnoOthersNow = tnoOthers || filterStreamFaction === 'other';

            let streamState; // remove, mark-np, mark-other
            if (isMetaFaction === false && isManualStream === false) {
                streamState = FSTATES.hide;
            } else {
                if (nowFilterEnabled) {
                    // If filtering streams is enabled
                    if ((tnoOthersNow && (onOtherIncluded || onMainOther || (npStreamer && onOther))) || (npStreamer && !mainsOther && !keepNp && onOther)) {
                        // If is-including-others and streamer on another server, or it's an NP streamer playing another server
                        streamState = FSTATES.other;
                    } else if (npStreamer && !onMainOther && !onOther) {
                        // If NoPixel streamer that isn't on another server
                        streamState = FSTATES.nopixel;
                        serverName = 'NP';
                    } else {
                        streamState = FSTATES.remove;
                    }
                } else {
                    if (npStreamer && !onMainOther && !onOther) {
                        // If NoPixel streamer that isn't on another server
                        streamState = FSTATES.nopixel;
                        serverName = 'NP';
                    } else {
                        streamState = FSTATES.other;
                    }
                }
            }

            if (streamState === FSTATES.other) {
                // Other included RP servers
                if (element.style.display === 'none') {
                    element.style.display = null;
                }

                if (element.style.visibility === 'hidden') {
                    element.style.visibility = null;
                }

                const allowStream = isMetaFaction || filterStreamFaction === 'other';
                if (allowStream === false) {
                    streamState = FSTATES.remove;
                } else {
                    channelEl.style.color = useColors.other;
                    liveElDiv.style.backgroundColor = useColorsDark.other;
                    liveEl.style.color = useTextColor;
                    liveEl.style.setProperty('text-transform', 'none', 'important');
                    liveEl.textContent = serverName.length > 0 ? `::${serverName}::` : '';
                }
            } else if (streamState === FSTATES.nopixel) {
                // NoPixel stream
                if (element.style.display === 'none') {
                    element.style.display = null;
                }

                if (element.style.visibility === 'hidden') {
                    element.style.visibility = null;
                }

                const hasCharacters = characters && characters.length;
                let nowCharacter;
                let factionNames = [];

                let assumeServer = 'whitelist';
                let onServer = 'whitelist';

                if (hasCharacters) {
                    ({ assumeServer } = characters);
                }

                if (assumeServer === 'whitelist') {
                    onServer = regNpPublic.test(title) ? 'public' : 'whitelist';
                } else {
                    onServer = regNpWhitelist.test(title) ? 'whitelist' : 'public';
                }

                if (hasCharacters) {
                    let lowestPos = Infinity;
                    let maxResults = -1;
                    for (const char of characters) {
                        const matchPositions = [...titleParsed.matchAll(char.nameReg)];
                        const numResults = matchPositions.length;
                        const lowIndex = numResults ? matchPositions[0].index + (char.assumeServer !== onServer ? 1e4 : 0) : -1;
                        if (lowIndex > -1 && (lowIndex < lowestPos || (lowIndex === lowestPos && numResults > maxResults))) {
                            lowestPos = lowIndex;
                            maxResults = numResults;
                            nowCharacter = char;
                        }
                    }
                }

                if (nowCharacter === undefined) {
                    for (const [faction, regex] of npFactionsRegexEntries) {
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

                const hasNowCharacter = nowCharacter;
                const hasFactions = factionNames.length;

                if (nowCharacter) {
                    assumeServer = nowCharacter.assumeServer;
                    if (assumeServer === 'whitelist') {
                        onServer = regNpPublic.test(title) ? 'public' : 'whitelist';
                    } else {
                        onServer = regNpWhitelist.test(title) ? 'whitelist' : 'public';
                    }
                }

                const onNpPublic = onServer === 'public';

                let allowStream = isMetaFaction;
                if (allowStream === false) {
                    if (filterStreamFaction === 'othernp') {
                        allowStream = !hasNowCharacter && !hasFactions && !hasCharacters;
                    } else if (filterStreamFaction === 'publicnp') {
                        allowStream = onNpPublic;
                    } else {
                        let nowFaction;
                        if (hasNowCharacter) {
                            // use condition below
                            nowFaction = nowCharacter.factionUse;
                        } else if (hasFactions) {
                            nowFaction = factionNames[0];
                        } else if (hasCharacters) {
                            nowFaction = characters[0].factionUse;
                        }
                        allowStream = nowFaction === filterStreamFaction;
                    }
                }

                if (allowStream === false || (onNpPublic && filterStreamFaction !== 'publicnp' && tnoPublic == false)) {
                    streamState = FSTATES.remove;
                } else {
                    let channelElColor;
                    let liveElDivBgColor;
                    let liveElColor;
                    let liveElText;
                    if (hasNowCharacter) {
                        const nowColor = useColors[nowCharacter.factionUse];
                        const nowColorDark = useColorsDark[nowCharacter.factionUse];
                        channelElColor = nowColor;
                        liveElDivBgColor = nowColorDark;
                        liveElColor = useTextColor;
                        liveElText = `${nowCharacter.leader ? '♛ ' : ''}${nowCharacter.displayName}`;
                    } else if (hasFactions) {
                        const nowColor = useColors[factionNames[0]] || useColors.independent;
                        const nowColorDark = useColorsDark[factionNames[0]] || useColorsDark.independent;
                        channelElColor = nowColor;
                        liveElDivBgColor = nowColorDark;
                        liveElColor = useTextColor;
                        liveElText = `< ${fullFactionMap[factionNames[0]] || factionNames[0]} >`;
                    } else if (hasCharacters) {
                        const nowColor = useColors[characters[0].factionUse];
                        const nowColorDark = useColorsDark[characters[0].factionUse];
                        channelElColor = nowColor;
                        liveElDivBgColor = nowColorDark;
                        liveElColor = useTextColor;
                        liveElText = `? ${characters[0].displayName} ?`;
                    } else {
                        liveEl.style.setProperty('text-transform', 'none', 'important');
                        channelElColor = useColors.othernp;
                        liveElDivBgColor = useColorsDark.othernp;
                        liveElColor = useTextColor;
                        liveElText = `${serverName}`;
                    }

                    channelEl.style.color = channelElColor;
                    liveElDiv.style.backgroundColor = liveElDivBgColor;
                    liveEl.style.color = liveElColor;
                    liveEl.textContent = liveElText;

                    if (onNpPublic) {
                        console.log('on public', channelName, `-webkit-linear-gradient(-60deg, ${liveElDivBgColor} 50%, ${useColors.publicnp} 50%)`);
                        liveElDiv.style.backgroundImage = `-webkit-linear-gradient(-60deg, ${useColors.publicnp} 50%, ${liveElDivBgColor} 50%)`;
                        // liveElDiv.style.backgroundImage = `linear-gradient(to top left, ${liveElDivBgColor} 50%, ${useColors.publicnp} 50%)`;
                    }
                }
            }

            if (streamState === FSTATES.remove || streamState === FSTATES.hide) {
                // Remove stream
                // liveEl.textContent = 'REMOVED';
                // channelEl.style.color = '#ff0074';

                if (viewersNum < minViewersUse) {
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
                    element.style.visibility = 'hidden';
                    // const images = element.getElementsByClassName('tw-image');
                    // for (let j = 0; j < images.length; j++) images[j].src = '';
                } else if (streamState === FSTATES.hide) {
                    element.style.visibility = 'hidden';
                } else if (keepDeleting) {
                    // element.outerHTML = '';
                    // element.parentNode.removeChild(element);
                    element.style.display = 'none';
                    console.log('[TNO] Deleted');
                }
                if (isFirstRemove) isFirstRemove = false;
            } else {
                console.log(`[${dateStr()}] Handled non-removed stream: ${channelName}`);
            }
        });

        if (streamCount) {
            if (minLoadedText != null) streamCount.textContent = `Smallest stream on page: ${minLoadedText}`;

            // if (!isMetaFaction) { // visibility: visible;
            // streamCount.style.visibility = 'visible';
            // } else {
            streamCount.style.visibility = null;
            // }
        }

        if (tnoScrolling && elements.length > 0 && prevWasZero) {
            const $scrollDiv = $('div.root-scrollable.scrollable-area').find('> div.simplebar-scroll-content');
            const bottomRem = $scrollDiv[0].scrollHeight - $scrollDiv.height() - $scrollDiv.scrollTop();
            // console.log('after-deletion bottomRem:', bottomRem);
            if (bottomRem < 532) {
                console.log('Auto adjusted scrolling');
                $scrollDiv.scrollTop(Math.max($scrollDiv.scrollTop() - (540 - bottomRem), 0));
            }
        }

        isDeleting = false;
    };

    const startDeleting = () => {
        if (interval != null) {
            clearInterval(interval);
        }
        minLoadedViewers = null;
        minLoadedText = null;
        interval = setInterval(deleteOthers, 1000 * intervalSeconds); // Interval gets ended when minViewers is reached
        deleteOthers();
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

            if (+new Date() - initStamp >= maxTime) {
                console.log('waitForElement timed out after', maxTime, 'ms');
                break;
            }
        }

        return el;
    };

    const identifyEnglish = () => {
        // Make sure it doesn't run until stream elements (and tags) are fully loaded
        const streamElements = $('article:visible').toArray();
        for (let i = 0; i < streamElements.length; i++) {
            const streamEl = streamElements[i];
            const channelName = streamEl.querySelector("a[data-a-target='preview-card-channel-link']").textContent.toLowerCase();
            const streamTags = streamEl.querySelectorAll('button.tw-tag');
            if (npCharacters[channelName] && streamTags.length === 1) {
                // Could also just check first tag?
                return streamTags[0].textContent;
            }
        }
        return 'English';
    };

    // Automatically select English tag for GTAV
    const selectEnglish = async () => {
        await waitForElement('div.animated-tag--no-bounce, button[data-a-target="form-tag-add-filter-suggested"]');

        const englishWord = identifyEnglish();

        const hasEnglishTag = document.querySelector(`button[data-a-target="form-tag-${englishWord}"]`) != null;

        if (!hasEnglishTag) {
            let englishTag;

            let numAttempts = 0;
            while (englishTag == null) {
                const inp = document.querySelector('#dropdown-search-input');
                inp.select();

                console.log(`looking for ${englishWord}`);

                const tagSearchDropdown = $('div.tag-search__scrollable-area:visible')[0];
                // const searchResults = $('div[aria-label="Search Results"]:visible')[0];
                const isVis1 = tagSearchDropdown != null;
                const isReady1 = isVis1 && tagSearchDropdown.querySelector('div.tw-loading-spinner') == null;

                // eslint-disable-next-line no-await-in-loop
                englishTag = await waitForElement(() => {
                    const tagSearchDropdownNow = document.querySelector('div.tag-search__scrollable-area');
                    if (!tagSearchDropdownNow) return null;
                    const englishXPath = `descendant::div[text()="${englishWord}"] | descendant::p[text()="${englishWord}"]`;
                    const snapshots = document.evaluate(englishXPath, tagSearchDropdownNow, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
                    if (snapshots.snapshotLength < 2) return null;
                    const item1 = snapshots.snapshotItem(0);
                    if (!item1.title || item1.title === englishWord) return item1;
                    return snapshots.snapshotItem(1);
                }, 1000);

                const isVis2 = $('div.tag-search__scrollable-area:visible')[0] != null;

                if (englishTag == null && isReady1 && isVis2) {
                    numAttempts++;
                    console.log('tag-search appeared', numAttempts);
                }

                if (numAttempts >= 1) {
                    console.log(`failed to find ${englishWord} option in tag-search`);
                    break;
                }
            }

            if (englishTag) {
                englishTag.click();
                console.log(`selected ${englishWord}`);
            }

            $(':focus').blur();
        } else {
            console.log(`has ${englishWord} tag`);
        }
    };

    const addSettings = async () => {
        const $followBtn = $(await waitForElement('[data-test-selector="follow-game-button-component"]'));

        if (document.querySelector('.tno-settings-btn') != null) return; // Switching from clips/videos back to channels

        const $container = $followBtn.parent().parent();
        const $setEnglishBtn = $('<button>⚙️ Twitch NoPixel Only</button>');
        $setEnglishBtn.addClass($followBtn.attr('class'));
        $setEnglishBtn.addClass('tno-settings-btn');
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
                    <div class="tno-settings-container">
                        <div class="settings-titles">
                            <span class="settings-title">TNO Settings</span>
                            <span class="settings-reload">&#x27f3;</span>
                        </div>
                        <div class="settings-options">
                            <div class="settings-option">
                                <span class="settings-name bold">Enabled:</span>
                                <span class="settings-value">
                                    <input id="setting-status" type="checkbox" class="toggle" ${tnoStatus ? 'checked' : ''}>
                                </span>
                            </div>
                            <div class="settings-option">
                                <span class="settings-name">Include NoPixel public:</span>
                                <span class="settings-value">
                                    <input id="setting-public" type="checkbox" class="toggle" ${tnoPublic ? 'checked' : ''}>
                                </span>
                            </div>
                            <div class="settings-option">
                                <span class="settings-name">Include other roleplay servers:</span>
                                <span class="settings-value">
                                    <input id="setting-others" type="checkbox" class="toggle" ${tnoOthers ? 'checked' : ''}>
                                </span>
                            </div>
                            <div class="settings-option">
                                <span class="settings-name tooltip">Scrolling adjustments:
                                    <span class="tooltiptext">Reduces scrolling lag by making Twitch only fetch one batch of new streams after scrolling to the page bottom.</span>
                                </span>
                                <span class="settings-value">
                                    <input id="setting-scrolling" type="checkbox" class="toggle" ${tnoScrolling ? 'checked' : ''}>
                                </span>
                            </div>
                            <div class="settings-option">
                                <span class="settings-name">Force "English" only (<em>recommended</em>):</span>
                                <span class="settings-value">
                                    <input id="setting-english" type="checkbox" class="toggle" ${tnoEnglish ? 'checked' : ''}>
                                </span>
                            </div>
                            ${
    isDeveloper
        ? `
                            <div class="settings-option">
                                <span class="settings-name">Filter streams</span>
                                <span class="settings-value">
                                    <input id="setting-show-all" type="checkbox" class="toggle" ${!tnoAllowAll ? 'checked' : ''}>
                                </span>
                            </div>
                            `
        : ''
}
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
                    const $settingScrolling = $('#setting-scrolling');
                    const $settingPublic = $('#setting-public');
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

                    $settingScrolling.change(function () {
                        const newValue = this.checked;
                        setStorage('tnoScrolling', newValue);
                        tnoScrolling = newValue;
                        console.log('Set scrolling-adjustments to:', newValue);
                    });

                    $settingPublic.change(function () {
                        const newValue = this.checked;
                        setStorage('tnoPublic', newValue);
                        tnoPublic = newValue;
                        console.log('Set include-public to:', newValue);
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

    const numToTwitchViewers = (n) => {
        if (n < 1000) return `${n}`;
        return `${parseFloat((n / 1e3).toFixed(1))}K`;
    };

    const addFactionStreams = () => {
        if (allStreams === undefined) {
            console.log('Faction filter failed - Streams not fetched yet...');
            return;
        }

        const propName = filterStreamFaction !== 'publicnp' ? 'faction' : 'tagFactionSecondary';

        const factionStreams = allStreams.filter(streamData => streamData[propName] === filterStreamFaction);
        console.log('filtered streams:', factionStreams);

        const baseEl = document.querySelector('[data-target="directory-first-item"]');

        // Includes npManual, _ORDER_, _TITLE_, _VIEWERS_, _PFP_, callmekevin (casings)
        // eslint-disable-next-line max-len
        const baseHtml = '<div data-target="" style="order: _ORDER_;"><div class="sc-AxjAm kxIWao"><div><div class="sc-AxjAm StDqN"><article data-a-target="card-2" data-a-id="card-callmekevin" class="sc-AxjAm dBWNsP npManual"><div class="sc-AxjAm czqVsG"><div class="sc-AxjAm btYFcj"><div class="ScTextWrapper-sc-14f6evl-1 gboCPP"><div class="ScTextMargin-sc-14f6evl-2 gzxTSt"><div class="sc-AxjAm kJwHLD"><a lines="1" data-a-target="preview-card-title-link" class="ScCoreLink-udwpw5-0 cxXSPs InjectLayout-sc-588ddc-0 gDeqEh tw-link" href="/callmekevin"><div class="sc-AxjAm faFgjY"><h3 title="_TITLE_" class="sc-AxirZ dqHsmV">_TITLE_</h3></div></a></div></div><div class="ScTextMargin-sc-14f6evl-2 gzxTSt"><p class="sc-AxirZ bsqfBW"><a data-test-selector="ChannelLink" data-a-target="preview-card-channel-link" class="ScCoreLink-udwpw5-0 cxXSPs tw-link" href="/callmekevin/videos">CallMeKevin</a></p></div><div class="sc-AxjAm cKgtIZ"><div class="sc-AxjAm ipUaGy"><div class="InjectLayout-sc-588ddc-0 iqJfNY"><div class="InjectLayout-sc-588ddc-0 dDlfVZ"><button class="ScTag-xzp4i-0 evwLTh tw-tag" aria-label="English" data-a-target="English"><div class="ScTagContent-xzp4i-1 jAVAzd">English</div></button></div></div></div></div></div><div class="ScImageWrapper-sc-14f6evl-0 feabhV"><a data-a-target="card-2" data-a-id="card-callmekevin" data-test-selector="preview-card-avatar" class="ScCoreLink-udwpw5-0 FXIKh tw-link" href="/callmekevin/videos"><div class="ScAspectRatio-sc-1sw3lwy-1 jHRTdb tw-aspect"><div class="ScAspectSpacer-sc-1sw3lwy-0 gkBhyN"></div><figure aria-label="callmekevin" class="ScAvatar-sc-12nlgut-0 iULHNk tw-avatar"><img class="InjectLayout-sc-588ddc-0 iyfkau tw-image tw-image-avatar" alt="callmekevin" src="_PFP_"></figure></div></a></div></div></div><div class="sc-AxjAm kJBVIw"><div class="ScWrapper-uo2e2v-0 ggVqeg tw-hover-accent-effect"><div class="ScTransformWrapper-uo2e2v-1 ScCornerTop-uo2e2v-2 druxMB"></div><div class="ScTransformWrapper-uo2e2v-1 ScCornerBottom-uo2e2v-3 ipqJcY"></div><div class="ScTransformWrapper-uo2e2v-1 ScEdgeLeft-uo2e2v-4 ldnizW"></div><div class="ScTransformWrapper-uo2e2v-1 ScEdgeBottom-uo2e2v-5 iyfrlK"></div><div class="ScTransformWrapper-uo2e2v-1 eiQqOY"><a data-a-target="preview-card-image-link" class="ScCoreLink-udwpw5-0 FXIKh tw-link" href="/callmekevin"><div class="sc-AxjAm jpEGpg"><div class="sc-AxjAm hBZJQK"><div class="ScAspectRatio-sc-1sw3lwy-1 dNNaBC tw-aspect"><div class="ScAspectSpacer-sc-1sw3lwy-0 hhnnBG"></div><img alt="_TITLE_ - callmekevin" class="tw-image" src="https://static-cdn.jtvnw.net/previews-ttv/live_user_callmekevin-440x248.jpg"></div><div class="ScPositionOver-sc-1iiybo2-0 hahEKi tw-media-card-image__corners"><div class="sc-AxjAm eFyVLi"><div class="ScChannelStatusTextIndicator-sc-1f5ghgf-0 YoxeW tw-channel-status-text-indicator" font-size="font-size-6"><p class="sc-AxirZ gOlXkb">LIVE</p></div></div><div class="sc-AxjAm iVDSNS"><div class="ScMediaCardStatWrapper-sc-1ncw7wk-0 fdmpWH tw-media-card-stat"><p class="sc-AxirZ ktnnZK">_VIEWERS_ viewers</p></div></div></div></div></div></a></div></div></div></article></div></div></div></div>';

        for (let i = 0; i < factionStreams.length; i++) {
            const streamData = factionStreams[i];
            const channelName = streamData.channelName;
            const channelNameLower = channelName.toLowerCase();
            const cloneHtml = baseHtml
                .replace(new RegExp('callmekevin', 'gi'), match => (match.toLowerCase() === match ? channelNameLower : channelName))
                .replace(/_ORDER_/g, '0')
                .replace(/_TITLE_/g, streamData.title)
                .replace(/_VIEWERS_/g, numToTwitchViewers(streamData.viewers))
                .replace(/_PFP_/g, streamData.profileUrl);
            baseEl.insertAdjacentHTML('beforebegin', cloneHtml);
        }
    };

    const activateSelect = (selectFirst = false) => {
        const elSelectCustom = document.getElementsByClassName('js-selectCustom')[0];
        // const elSelectCustomBox = elSelectCustom.children[0];
        const elSelectCustomBox = elSelectCustom.getElementsByClassName('selectCustom-trigger')[0];
        const elSelectCustomOpts = elSelectCustom.children[1];
        const elSelectCustomInput = elSelectCustomOpts.children[0];
        const customOptsList = Array.from(elSelectCustomOpts.children);
        const optionsCount = customOptsList.length;
        const defaultLabel = elSelectCustomBox.getAttribute('data-value');

        let optionChecked = null;
        let optionHoveredIndex = 0;
        let closeSelectCustom;

        const updateCustomSelectHovered = (newIndex) => {
            const prevOption = elSelectCustomOpts.children[optionHoveredIndex];
            let option = elSelectCustomOpts.children[newIndex];

            const direction = newIndex - optionHoveredIndex;
            if (option.style.display === 'none' && direction !== 0) {
                let newIndex2 = newIndex;
                let option2 = option;
                while (newIndex2 > 1 && newIndex2 < optionsCount - 1) {
                    newIndex2 += direction;
                    option2 = elSelectCustomOpts.children[newIndex2];
                    if (option2.style.display !== 'none') {
                        newIndex = newIndex2;
                        option = option2;
                        break;
                    }
                }
            }

            if (option.style.display === 'none') return;

            if (prevOption) {
                prevOption.classList.remove('isHover');
            }
            if (option) {
                option.classList.add('isHover');
            }

            optionHoveredIndex = newIndex;
        };

        const watchClickOutside = (e) => {
            const didClickedOutside = !elSelectCustom.contains(e.target);
            if (didClickedOutside) {
                closeSelectCustom();
            }
        };

        const inputHandler = (searchText = '') => {
            const searchTextLower = searchText.toLowerCase();
            customOptsList.forEach((elOption, index) => {
                if (index === 0) return;
                if (elOption.textContent.toLowerCase().includes(searchTextLower)) {
                    elOption.style.display = null;
                } else {
                    elOption.style.display = 'none';
                }
            });
        };

        const updateCustomSelectChecked = (value, text, isInit = false) => {
            const prevValue = optionChecked;

            const elPrevOption = elSelectCustomOpts.querySelector(`[data-value="${prevValue}"`);
            const elOption = elSelectCustomOpts.querySelector(`[data-value="${value}"`);

            if (elPrevOption) {
                elPrevOption.classList.remove('isActive');
            }

            if (elOption) {
                elOption.classList.add('isActive');
            }

            elSelectCustomBox.textContent = text;
            elSelectCustomBox.style.color = elOption.style.color;
            optionChecked = value;

            if (isInit) return;

            filterStreamFaction = value;
            elSelectCustomInput.value = '';
            console.log('Updated selected!');
            inputHandler();
            resetFiltering();
            // if (filterStreamFaction !== 'cleanbois') return;
            addFactionStreams();
            startDeleting();
        };

        const supportKeyboardNavigation = (e) => {
            // press down -> go next
            if (e.keyCode === 40 && optionHoveredIndex < optionsCount - 1) {
                e.preventDefault(); // prevent page scrolling
                updateCustomSelectHovered(optionHoveredIndex + 1);
            }

            // press up -> go previous
            if (e.keyCode === 38 && optionHoveredIndex > 1) {
                e.preventDefault(); // prevent page scrolling
                updateCustomSelectHovered(optionHoveredIndex - 1);
            }

            // press Enter or space -> select the option
            if (e.keyCode === 13) {
                // space: 32
                e.preventDefault();

                const option = elSelectCustomOpts.children[optionHoveredIndex];
                const value = option && option.getAttribute('data-value');

                if (value) {
                    updateCustomSelectChecked(value, option.textContent);
                }
                closeSelectCustom();
            }

            // press ESC -> close selectCustom
            if (e.keyCode === 27) {
                closeSelectCustom();
            }
        };

        const openSelectCustom = () => {
            elSelectCustom.classList.add('isActive');
            // Remove aria-hidden in case this was opened by a user
            // who uses AT (e.g. Screen Reader) and a mouse at the same time.
            elSelectCustom.setAttribute('aria-hidden', false);

            if (optionChecked) {
                const optionCheckedIndex = customOptsList.findIndex(el => el.getAttribute('data-value') === optionChecked);
                updateCustomSelectHovered(optionCheckedIndex);
            }

            // Add related event listeners
            document.addEventListener('click', watchClickOutside);
            document.addEventListener('keydown', supportKeyboardNavigation);

            elSelectCustomInput.focus();
        };

        closeSelectCustom = () => {
            elSelectCustom.classList.remove('isActive');

            elSelectCustom.setAttribute('aria-hidden', true);

            updateCustomSelectHovered(0);

            // Remove related event listeners
            document.removeEventListener('click', watchClickOutside);
            document.removeEventListener('keydown', supportKeyboardNavigation);
        };

        // Toggle custom select visibility when clicking the box
        elSelectCustomBox.addEventListener('click', (e) => {
            const isClosed = !elSelectCustom.classList.contains('isActive');

            if (isClosed) {
                openSelectCustom();
            } else {
                closeSelectCustom();
            }
        });

        // Update selectCustom value when an option is clicked or hovered
        customOptsList.forEach((elOption, index) => {
            if (index === 0) return;

            elOption.addEventListener('click', (e) => {
                const value = e.target.getAttribute('data-value');

                updateCustomSelectChecked(value, e.target.textContent);
                closeSelectCustom();
            });

            elOption.addEventListener('mouseenter', (e) => {
                updateCustomSelectHovered(index);
            });

            // TODO: Toggle these event listeners based on selectCustom visibility
        });

        elSelectCustomInput.addEventListener('input', e => inputHandler(e.target.value));

        if (selectFirst) {
            const initOption = elSelectCustomOpts.children[1];
            const initOptionValue = initOption.getAttribute('data-value');
            const initOptionText = initOption.textContent;
            updateCustomSelectChecked(initOptionValue, initOptionText, true);
        }
    };

    const setupFilter = async () => {
        const $sortByLabel = $(await waitForElement('label[for="browse-header-filter-by"]'));
        const $sortByDiv = $sortByLabel.parent().parent();
        const $filterDiv = $sortByDiv.clone();

        $filterDiv.insertBefore($sortByDiv);
        $filterDiv.css({ marginRight: '15px' });

        const [$labelDiv, $dropdownDiv] = $filterDiv
            .children()
            .toArray()
            .map(el => $(el));

        const excludeFactions = ['mechanic', 'harmony', 'quickfix', 'tunershop', 'marabunta', 'mersions', 'podcast'];

        const optionSorting = Object.assign(
            {},
            ...[
                'cleanbois',
                'changgang',
                'police',
                'doj',
                'vagos',
                'ssb',
                'gsf',
                'medical',
                'lostmc',
                'nbc',
                'bsk',
                'hoa',
                'asrr',
                'prison',
                'larpers',
                'pegasus',
                'bbmc',
                'angels',
            ].map((option, index) => ({ [option]: index + 1 })),
            ...['burgershot', 'doc', 'development'].map((option, index) => ({ [option]: 1000 + index + 1 }))
        );

        optionSorting.independent = 3555;

        const optionRename = {
            hoa: 'Home Owners Association',
            asrr: 'Alta Street Ruff Rydaz',
            nbc: 'Natural Born Crackheads',
            bsk: 'Brouge Street Kingz',
            bbmc: 'Bondi Boys MC',
            doc: 'Department of Corrections',
            doj: 'Lawyers & Judges',
            ssb: 'Ballas',
            gsf: 'Grove Street Families',
            larpers: 'The Guild',
            angels: 'The Angels',
            lunatix: 'Lunatix MC',
            othernp: 'Unknown',
        };

        let mainOptionName = 'All NoPixel (Default)';
        if (tnoOthers) {
            mainOptionName = 'All RP (Default)';
        } else if (!tnoPublic) {
            mainOptionName = 'All NoPixel-WL (Default)';
        }

        const options = [
            ['allnopixel', mainOptionName],
            ['alltwitch', 'All Twitch (No Filtering)'],
            ['publicnp', 'NoPixel Public'],
            ...Object.entries(fullFactionMap)
                .filter(option => excludeFactions.includes(option[0]) === false)
                .sort((a, b) => (optionSorting[a[0]] || (useColors[a[0]] && 1000) || 2000) - (optionSorting[b[0]] || (useColors[b[0]] && 1000) || 2000))
                .map(option => [option[0], optionRename[option[0]] || option[1]]),
            ['podcast', 'Podcast'],
            ['othernp', 'Unknown'],
            ['other', 'Other Servers'],
        ];

        useColors.allnopixel = '#FFF';
        useColors.alltwitch = '#FFF';

        // $labelDiv.find('label').text('Filter streams');
        $labelDiv.remove();
        $dropdownDiv.html(`
            <div class="select">
                <div class="selectWrapper">
                    <div class="selectCustom js-selectCustom" aria-hidden="true">
                        <div class="selectCustom-row${!isDark ? ' lightmodeScreen' : ''}">
                            <label class="selectCustom-label tooltip">
                                Filter streams
                                <span id="streamCount" class="tooltiptext tooltiptext2">...</span>
                            </label>
                            <div class="selectCustom-trigger"></div>
                        </div>
                        <div class="selectCustom-options">
                            <input class="selectCustom-input" placeholder="Search..."></input>
                            ${options
        .map(
            option =>
                `<div style="color: ${useColors[option[0]] || useColors.independent}" class="selectCustom-option" data-value="${option[0]}">${option[1]}</div>`
        )
        .join('')}
                        </div>
                    </div>
                </div>
            </div>
        `);

        activateSelect(true);
    };

    const twitchGtaUrl = /^https:\/\/www\.twitch\.tv\/directory\/game\/Grand%20Theft%20Auto%20V(?!\/videos|\/clips)/;
    onPage = twitchGtaUrl.test(window.location.href);

    activateInterval = async () => {
        // Remember that this will run twice without reloading when switching from Clips/Videos back to channels
        if (interval != null) {
            console.log("[TNO] Couldn't start interval (already running)");
            return false;
        }

        [tnoStatus, tnoEnglish, tnoPublic, tnoOthers, tnoScrolling, tnoAllowAll] = await getStorage([
            ['tnoStatus', true],
            ['tnoEnglish', true],
            ['tnoPublic', true],
            ['tnoOthers', false],
            ['tnoScrolling', false],
            ['tnoAllowAll', false],
        ]);

        addSettings(); // Settings should show even if status disabled

        if (tnoStatus === false) {
            console.log("[TNO] Couldn't start interval (status set to disabled)");
            return false;
        }

        filterStreamFaction = 'allnopixel';

        if (tnoEnglish) {
            selectEnglish();
        }

        setupFilter();

        console.log('[TNO] Starting interval');
        startDeleting();

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
