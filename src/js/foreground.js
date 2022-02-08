/* eslint-disable no-await-in-loop */
/*
 * Twitch NoPixel Only
 * Created by Vaeb
 */

const startDate = new Date();
const tzOffset = (startDate.getHours() - startDate.getUTCHours()) * 1000 * 60 * 60;
const dateStr = (date = new Date()) =>
    new Date(+date + tzOffset)
        .toISOString()
        .replace('T', ' ')
        .replace(/\.\w+$/, '');

console.log(`[${dateStr()}] [TNO] Loading Twitch NoPixel Only...`);

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

const remStorage = async key => chrome.storage.local.remove(key);

// eslint-disable-next-line
window.tnoGet = getStorage;
// eslint-disable-next-line
window.tnoSet = setStorage;
// eslint-disable-next-line
window.tnoRem = remStorage;

String.prototype.indexOfRegex = function (regex, startPos) {
    const indexOf = this.substring(startPos || 0).search(regex);
    return indexOf >= 0 ? indexOf + (startPos || 0) : indexOf;
};

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

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

// Settings

let minViewers;
let stopOnMin;
let intervalSeconds;
const fullDebugging = false;

let keepDeleting = true;
let onPage = false;
let interval;

let wasZero = false;
let filterStreamFaction = 'allnopixel';
let filterStreamText = '';
let filterStreamTextLookup = '';
let isFilteringText = false;

let useColors = {};
let useColorsDark = {};
let useColorsLight = {};

const FSTATES = {
    remove: 0,
    nopixel: 1,
    other: 2,
    hide: 3,
};

const SORTS = {
    recommended: 1,
    high: 2,
    low: 3,
    recent: 4,
};

const REAL_VIEWS = new Map([ // Key represents alwaysRoll value
    [false, ['allnopixel', 'alltwitch']],
    [true, ['alltwitch']],
]);

let realViews = REAL_VIEWS.get(false); // Views with real-stream elements

const universalFactions = ['allnopixel', 'alltwitch'];

const onDefaultView = () => filterStreamFaction === 'allnopixel' && isFilteringText === false;

const onRealView = () => realViews.includes(filterStreamFaction) && isFilteringText === false;

const onUniversalFaction = () => universalFactions.includes(filterStreamFaction) && isFilteringText === false;

// Does view contain multiple actual RP factions (rather than just a dedicated RP faction)
// Both real-stream and manual-stream
const onNpMetaFaction = () => {
    const npMetaFactions = [...universalFactions, 'othernp', 'publicnp', 'international', 'guessed'];
    return isFilteringText || npMetaFactions.includes(filterStreamFaction);
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

RegExp.escape = function (string) {
    return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
};

let activateInterval;
let stopInterval;

const filterStreams = async () => { // Remember: The code here runs upon loading twitch.tv, not the GTAV page. For the latter, use activateInterval.
    console.log(`[${dateStr()}] Fetching NP stream data...`);
    const isDeveloper = typeof document.cookie === 'string' && document.cookie.includes('name=vaeben');

    let live;
    let streamsMap;
    let filterListeners = [];
    let timeId = `#${new Date().getTime()}`;

    const requestLiveData = async () => {
        const fetchHeaders = new Headers();
        fetchHeaders.append('pragma', 'no-cache');
        fetchHeaders.append('cache-control', 'no-cache');

        // https://vaeb.io:3030 | http://localhost:3029
        // const dataRequest = new Request('https://vaeb.io:3030/live'); // API code is open-source: https://github.com/Vaeb/TNO-Backend
        const dataRequest = new Request('http://localhost:3029/live'); // API code is open-source: https://github.com/Vaeb/TNO-Backend

        const maxTries = 4;
        for (let i = 0; i < maxTries; i++) {
            try {
                const fetchResult = await fetch(dataRequest);
                live = await fetchResult.json();
                break;
            } catch (err) {
                if (i < (maxTries - 1)) {
                    console.log('Failed to fetch live data, retrying...');
                    await sleep(2000);
                } else {
                    console.error('Failed to fetch live data:');
                    throw new Error(err);
                }
            }
        }

        if (live == null || live.streams == null || live.streams.length === 0) {
            console.log('Failed to fetch live data (empty):', live);
            return false;
        }

        // let waitForFilterResolve;
        // const waitForFilter = new Promise((resolve) => {
        //     waitForFilterResolve = resolve;
        // });

        // const waitForFilterAndStreams = Promise.all([waitForFilter, waitForAllStreams]);
        // waitForFilterAndStreams.then(() => {
        //     console.log('filter and streams ready');
        // });

        ({ minViewers, stopOnMin, intervalSeconds, useColorsDark, useColorsLight } = live);

        console.log(`[${dateStr()}] Fetched data!`);
        console.log('live', live);

        streamsMap = Object.assign({}, ...live.streams.map(stream => ({ [stream.channelName.toLowerCase()]: stream })));
        console.log('streamsMap', streamsMap);

        return true;
    };

    const requestResult = await requestLiveData();
    console.log('requestResult', requestResult);

    if (requestResult !== true) return;

    const bodyHexColor = getComputedStyle(document.body).getPropertyValue('--color-background-body');
    let isDark = true;

    if (bodyHexColor === '#f7f7f8') {
        useColors = useColorsLight;
        isDark = false;
    } else {
        useColors = useColorsDark;
    }

    let sortType = SORTS.recommended;

    const fixSortType = async (n) => {
        const sortByLabel = await waitForElement('label[for="browse-header-filter-by"]', n);
        const sortByDiv = sortByLabel.parentNode.parentNode;

        const sortTypeText = sortByDiv.querySelector('button[data-a-target="browse-sort-menu"]').textContent.toLowerCase();
        if (sortTypeText.includes('recommended')) {
            sortType = SORTS.recommended;
        } else if (sortTypeText.includes('high to')) {
            sortType = SORTS.high;
        } else if (sortTypeText.includes('low to')) {
            sortType = SORTS.low;
        } else if (sortTypeText.includes('recent')) {
            sortType = SORTS.recent;
        }
    };

    // If tnoReloadDefault hasn't been manually set yet then set to false if sort=Recommended, else set to true
    let [tnoStatus, tnoEnglish, tnoPublic, tnoInternational, tnoOthers, tnoWlOverride, tnoSearch, tnoScrolling, tnoAlwaysCustom, tnoReloadDefault, tnoAllowAll] = await getStorage([
        ['tnoStatus', true],
        ['tnoEnglish', true],
        ['tnoPublic', true],
        ['tnoInternational', true],
        ['tnoOthers', false],
        ['tnoWlOverride', true],
        ['tnoSearch', true],
        ['tnoScrolling', false],
        ['tnoAlwaysCustom', false],
        ['tnoReloadDefault', false],
        ['tnoAllowAll', false],
    ]);

    const filterEnabled = !isDeveloper || !tnoAllowAll; // Fail-safe incase extension accidentally gets published with tnoAllowAll enabled

    let isDeleting = false;
    let minLoadedViewers = null;
    let minLoadedText = null;
    let rollStart = 0;
    let alwaysRoll = tnoAlwaysCustom;

    realViews = REAL_VIEWS.get(alwaysRoll);
    const rollAddMax = 30;

    // const resetFiltering = () => {
    //     const elements = Array.from(document.getElementsByTagName('article')).filter(element => element.classList.contains('npChecked'));
    //     console.log('resetting for', elements.length, 'elements');
    //     elements.forEach((element) => {
    //         element.classList.remove('npChecked');
    //     });
    // };

    const escapeChars = {
        '¢': 'cent',
        '£': 'pound',
        '¥': 'yen',
        '€': 'euro',
        '©': 'copy',
        '®': 'reg',
        '<': 'lt',
        '>': 'gt',
        '"': 'quot',
        '&': 'amp',
        "'": '#39',
    };

    let regexString = '[';
    for (const key of Object.keys(escapeChars)) {
        regexString += key;
    }
    regexString += ']';

    const regex = new RegExp(regexString, 'g');

    const encodeHtml = str => str.replace(regex, m => `&${escapeChars[m]};`);

    const getMainElFromArticle = el => el.parentElement.parentElement.parentElement.parentElement;

    const resetFiltering = (onlyChecked = false) => {
        if (!onlyChecked) {
            const manualElements = Array.from(document.getElementsByTagName('article')).filter(element => element.classList.contains('npManual'));
            console.log('removing', manualElements.length, 'manual elements');
            for (const element of manualElements) {
                getMainElFromArticle(element).remove();
            }
        }

        const elements = Array.from(document.getElementsByTagName('article')).filter(element => element.classList.contains('npChecked'));
        console.log('resetting for', elements.length, 'elements');
        elements.forEach((element) => {
            element.classList.remove('npChecked');
        });
    };

    const matchesFilterStreamText = stream =>
        stream.tagText.toLowerCase().includes(filterStreamText)
            || (stream.characterName && stream.characterName.toLowerCase().includes(filterStreamText))
            || (stream.nicknameLookup && stream.nicknameLookup.includes(filterStreamTextLookup))
            || stream.channelName.toLowerCase().includes(filterStreamText)
            || stream.title.toLowerCase().includes(filterStreamText);

    const deleteOthers = () => {
        if (onPage == false) return;
        // if (onPage == false || isDeleting === true) return;
        isDeleting = true;

        isFilteringText = filterStreamText !== '';

        const useTextColor = '#000';
        // const useTextColor = isDark ? '#000' : '#f7f7f8';
        const isRealView = onRealView();
        const isUniversalFaction = onUniversalFaction();
        const isNpMetaFaction = onNpMetaFaction();
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
            const channelElNode = [...channelEl.childNodes].find(node => node.nodeType === 3);
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

            const channelName = channelElNode.textContent.toLowerCase();
            const stream = streamsMap[channelName];

            const nowFilterEnabled = filterEnabled && filterStreamFaction !== 'alltwitch';
            const tnoWlOverrideNow = tnoWlOverride && stream && stream.wlOverride && isNpMetaFaction;
            const tnoOthersNow = tnoOthers || filterStreamFaction === 'other' || tnoWlOverrideNow;
            const tnoPublicNow = tnoPublic || filterStreamFaction === 'publicnp' || tnoWlOverrideNow;
            const tnoInternationalNow = tnoInternational || filterStreamFaction === 'international' || tnoWlOverrideNow;

            let streamState; // remove, mark-np, mark-other
            if (isManualStream === false && isRealView === false) { // If real-stream and on a view with manual-streams-only
                streamState = FSTATES.hide;
            } else {
                if (nowFilterEnabled) {
                    // If filtering streams is enabled
                    if (!stream) {
                        // Not an RP stream
                        streamState = FSTATES.remove;
                    } else if (stream.tagFaction === 'other') {
                        // Non-NoPixel RP stream
                        if (tnoOthersNow || stream.noOthersInclude) {
                            streamState = FSTATES.other;
                        } else {
                            streamState = FSTATES.remove;
                        }
                    } else {
                        // NoPixel stream
                        if ((tnoPublicNow || stream.noPublicInclude) && (tnoInternationalNow || stream.noInternationalInclude)) {
                            // NoPixel Public if allowed or NoPixel International if allowed or NoPixel WL Stream
                            streamState = FSTATES.nopixel;
                        } else {
                            // Public/International stream when not allowed
                            streamState = FSTATES.remove;
                        }
                    }
                } else {
                    if (stream && stream.tagFaction !== 'other') {
                        // If NoPixel streamer that isn't on another server
                        if (isUniversalFaction || isFilteringText || ((tnoPublicNow || stream.noPublicInclude) && (tnoInternationalNow || stream.noInternationalInclude))) {
                            streamState = FSTATES.nopixel;
                        } else {
                            // Public/International stream when not allowed and using filter
                            streamState = FSTATES.remove;
                        }
                    } else {
                        streamState = FSTATES.other;
                    }
                }
            }

            if (streamState === FSTATES.other) {
                // Other included RP servers
                const streamPossible = stream || {};

                if (element.style.display === 'none') {
                    element.style.display = null;
                }

                if (element.style.visibility === 'hidden') {
                    element.style.visibility = null;
                }

                const allowStream = isUniversalFaction || isFilteringText || filterStreamFaction === 'other';

                if (allowStream === false) {
                    streamState = FSTATES.remove;
                } else {
                    channelEl.style.color = useColors.other;
                    liveElDiv.style.backgroundColor = useColorsDark.other;
                    liveEl.style.color = useTextColor;
                    liveEl.style.setProperty('text-transform', 'none', 'important');
                    liveEl.textContent = streamPossible.tagText ? streamPossible.tagText : '';
                }
            } else if (streamState === FSTATES.nopixel) {
                // NoPixel stream
                if (element.style.display === 'none') {
                    element.style.display = null;
                }

                if (element.style.visibility === 'hidden') {
                    element.style.visibility = null;
                }

                let allowStream = false;

                if (isFilteringText) {
                    allowStream = true;
                } else {
                    // Don't do filtering on meta factions (not faction specific)
                    allowStream = isUniversalFaction;
                    if (allowStream === false) {
                        if (filterStreamFaction === 'publicnp') {
                            allowStream = stream.tagFactionSecondary === 'publicnp';
                        } else if (filterStreamFaction === 'international') {
                            allowStream = stream.tagFactionSecondary === 'international';
                        // } else if (isDefaultView && rollStart > 0) {
                            // allowStream = stream.factionsMap.whitelistnp;
                        } else {
                            if (stream.factionsMap[filterStreamFaction]) {
                                allowStream = true;
                            } else if (filterStreamFaction === 'independent' && stream.factionsMap.othernp) {
                                allowStream = true;
                            } else {
                                allowStream = false;
                            }
                        }
                    }
                }

                if (allowStream === false) {
                    // Doesn't match required faction
                    streamState = FSTATES.remove;
                } else {
                    channelEl.style.color = useColors[stream.tagFaction];
                    liveElDiv.style.backgroundColor = useColorsDark[stream.tagFaction];
                    liveEl.style.color = useTextColor;
                    // if (stream.characterName && stream.characterName.includes(']')) {
                    // const titleMatch = stream.characterName.match(/\[(.*?)\]/);
                    // const title = encodeHtml(titleMatch[1]);
                    // const name = stream.characterName.substring(titleMatch.index + title.length + 3);
                    // if (stream.tagText.includes('♛')) title = `♛ ${title}`;
                    // liveEl.innerHTML = encodeHtml(stream.tagText).replace(title, `<span style="color: #4d3537;">${title}</span>`);
                    // } else {
                    liveEl.textContent = stream.tagText;
                    // }

                    if (stream.tagText.startsWith('《')) {
                        liveEl.style.setProperty('margin-left', '-2px');
                    }

                    // For titles, add opacity 0.7 span (?)

                    if (stream.tagFactionSecondary === 'publicnp' || stream.tagFactionSecondary === 'international') {
                        console.log('on', stream.tagFactionSecondary, channelName);
                        liveElDiv.style.backgroundImage = `-webkit-linear-gradient(-60deg, ${useColorsDark[stream.tagFactionSecondary]} 50%, ${useColorsDark[stream.tagFaction]} 50%)`;
                        // liveElDiv.style.backgroundImage = `linear-gradient(to top left, ${liveElDivBgColor} 50%, ${useColorsDark[stream.tagFactionSecondary]} 50%)`;
                    }
                }
            }

            if (streamState === FSTATES.remove || streamState === FSTATES.hide) {
                // Remove stream
                // liveEl.textContent = 'REMOVED';
                // channelEl.style.color = '#ff0074';

                if (viewersNum < minViewersUse && isManualStream === false) {
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
                if (fullDebugging) console.log(`[${dateStr()}] Handled allowed stream: ${channelName}`);
            }
        });

        if (streamCount) {
            if (minLoadedText != null) streamCount.textContent = `Smallest stream on page: ${minLoadedText}`;

            // if (!isUniversalFaction) { // visibility: visible;
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

    const identifyEnglish = () => {
        // Make sure it doesn't run until stream elements (and tags) are fully loaded
        const streamElements = $('article:visible').toArray();
        for (let i = 0; i < streamElements.length; i++) {
            const streamEl = streamElements[i];
            const channelName = [...streamEl.querySelector("a[data-a-target='preview-card-channel-link']").childNodes]
                .find(node => node.nodeType === 3)
                .textContent.toLowerCase();
            const streamTags = streamEl.querySelectorAll('button.tw-tag');
            if (streamsMap[channelName] && streamTags.length === 1) {
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

        // console.log('englishWord', englishWord);

        const hasEnglishTag = document.querySelector(`button[data-a-target="form-tag-${englishWord}"]`) != null;

        if (!hasEnglishTag) {
            let englishTag;

            let numAttempts = 0;
            while (englishTag == null) {
                // console.log('Starting attempt to add English tag...');
                const inp = document.querySelector('#dropdown-search-input');
                inp.select();

                // console.log(`Selected dropdown, looking for ${englishWord}`);

                const tagSearchDropdown = $('div.tag-search__scrollable-area:visible')[0];
                const tagSearchContainer = $('div[data-a-target="top-tags-list"]')[0];
                // const searchResults = $('div[aria-label="Search Results"]:visible')[0];
                const isVis1 = tagSearchDropdown != null && tagSearchContainer != null;
                const isReady1 = isVis1 && tagSearchDropdown.querySelector('div.tw-loading-spinner') == null;

                // console.log('Tag dropdown ready:', isVis1, isReady1);

                // eslint-disable-next-line no-await-in-loop
                englishTag = await waitForElement(() => {
                    // const tagSearchDropdownNow = document.querySelector('div.tag-search__scrollable-area');
                    const tagSearchContainerNow = document.querySelector('div[data-a-target="top-tags-list"]');
                    if (!tagSearchContainerNow) return null;
                    const englishXPath = `descendant::div[text()="${englishWord}"]`;
                    // console.log('Looking in tags list for:', englishXPath);
                    const snapshots = document.evaluate(englishXPath, tagSearchContainerNow, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
                    // console.log('Results:', snapshots.snapshotLength, snapshots);
                    if (snapshots.snapshotLength < 1) return null;
                    const item1 = snapshots.snapshotItem(0);
                    // console.log('item1', item1);
                    // if (!item1.title || item1.title === englishWord) return item1;
                    return item1;
                }, 1000);

                const isVis2 = $('div[data-a-target="top-tags-list"]')[0] != null;

                // console.log('English tag:', englishTag, '|', 'Tags list ready:', isVis2);

                if (englishTag == null && isReady1 && isVis2) {
                    numAttempts++;
                    console.log('tag-search appeared', numAttempts);
                }

                if (numAttempts >= 2) {
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

    let destroyFilter;
    let setupFilter;
    let addFactionStreams;

    const onSettingChanged = async () => {
        destroyFilter(); // Remove previous buttons/events
        await setupFilter(); // Setup new buttons/events
        resetFiltering(); // Reset twitch elements to original state (npChecked/remove)
        addFactionStreams(undefined); // Add pseudo elements for faction
        startDeleting();
        console.log('Refreshed for setting changes!');
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
                            <span class="tno-reload settings-reload">&#x27f3;</span>
                        </div>
                        <div class="settings-options">
                            <div class="settings-option">
                                <span class="settings-name bold">Enabled:</span>
                                <span class="settings-value">
                                    <input id="setting-status" type="checkbox" class="toggle" ${tnoStatus ? 'checked' : ''}>
                                </span>
                            </div>
                            <div class="settings-option">
                                <span class="settings-name"><span class="bold">Show</span> NoPixel public streams:</span>
                                <span class="settings-value">
                                    <input id="setting-public" type="checkbox" class="toggle" ${tnoPublic ? 'checked' : ''}>
                                </span>
                            </div>
                            <div class="settings-option">
                                <span class="settings-name"><span class="bold">Show</span> NoPixel international streams:</span>
                                <span class="settings-value">
                                    <input id="setting-international" type="checkbox" class="toggle" ${tnoInternational ? 'checked' : ''}>
                                </span>
                            </div>
                            <div class="settings-option">
                                <span class="settings-name"><span class="bold">Show</span> other roleplay servers:</span>
                                <span class="settings-value">
                                    <input id="setting-others" type="checkbox" class="toggle" ${tnoOthers ? 'checked' : ''}>
                                </span>
                            </div>
                            <div class="settings-option">
                                <span class="settings-name tooltip">Always <span class="bold">show</span> streamers who would<br/>normally be on the WL server:
                                    <span class="tooltiptext tooltiptext-hover">Overrides the "show" settings above to always include streamers from NoPixel-Whitelist, such as Buddha, when they play on another server (such as NoPixel Public).</span>
                                </span>
                                <span class="settings-value">
                                    <input id="setting-wl-override" type="checkbox" class="toggle" ${tnoWlOverride ? 'checked' : ''}>
                                </span>
                            </div>
                            <div class="settings-option">
                                <span class="settings-name">View search box:</span>
                                <span class="settings-value">
                                    <input id="setting-search" type="checkbox" class="toggle" ${tnoSearch ? 'checked' : ''}>
                                </span>
                            </div>
                            <div class="settings-option">
                                <span class="settings-name tooltip">Scrolling adjustments:
                                    <span class="tooltiptext tooltiptext-hover">Reduces scrolling lag by making Twitch only fetch one batch of new streams after scrolling to the page bottom.</span>
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
                            <div class="settings-option">
                                <span class="settings-name tooltip">Use custom stream elements instead of filtering:
                                <span class="tooltiptext tooltiptext-hover tooltiptext-wider1">
                                    When you use the "Filter streams" dropdown to view a faction, it works by hiding all streams on the page and creating new custom ones that look the same.
                                    Enabling this setting will use the same system on the default view. The benefit of this is no lag/delay when scrolling down, even to the 1 viewer NoPixel streams.
                                    The downside is if you sort streams by Recommended, the order of streams will instead be based on viewcount.<br/>
                                    It could also temporarily break if Twitch updates their site (in which case just disable this setting for a few days).
                                </span>
                                </span>
                                <span class="settings-value">
                                    <input id="setting-custom" type="checkbox" class="toggle" ${tnoAlwaysCustom ? 'checked' : ''}>
                                </span>
                            </div>
                            <div class="settings-option">
                                <span class="settings-name tooltip">Refresh button updates default view:
                                    <span class="tooltiptext tooltiptext-hover">Clicking the green refresh button while viewing a faction will also refresh the default view. Uses custom stream elements.</span>
                                </span>
                                <span class="settings-value">
                                    <input id="setting-reload-def" type="checkbox" class="toggle" ${tnoReloadDefault ? 'checked' : ''}>
                                </span>
                            </div>
                            ${
    isDeveloper
        ? `
                            <div class="settings-option">
                                <span class="settings-name">Enable filtering</span>
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
                    const $settingSearch = $('#setting-search');
                    const $settingScrolling = $('#setting-scrolling');
                    const $settingPublic = $('#setting-public');
                    const $settingInternational = $('#setting-international');
                    const $settingOthers = $('#setting-others');
                    const $settingWlOverride = $('#setting-wl-override');
                    const $settingCustom = $('#setting-custom');
                    const $settingReloadDef = $('#setting-reload-def');
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

                    $settingSearch.change(function () {
                        const newValue = this.checked;
                        setStorage('tnoSearch', newValue);
                        tnoSearch = newValue;
                        console.log('Set view-search to:', newValue);
                        onSettingChanged();
                    });

                    $settingScrolling.change(function () {
                        const newValue = this.checked;
                        setStorage('tnoScrolling', newValue);
                        tnoScrolling = newValue;
                        console.log('Set scrolling-adjustments to:', newValue);
                        onSettingChanged();
                    });

                    $settingPublic.change(function () {
                        const newValue = this.checked; // Reverse for remove
                        setStorage('tnoPublic', newValue);
                        tnoPublic = newValue;
                        console.log('Set include-public to:', newValue);
                        onSettingChanged();
                    });

                    $settingInternational.change(function () {
                        const newValue = this.checked; // Reverse for remove
                        setStorage('tnoInternational', newValue);
                        tnoInternational = newValue;
                        console.log('Set include-international to:', newValue);
                        onSettingChanged();
                    });

                    $settingOthers.change(function () {
                        const newValue = this.checked; // Reverse for remove
                        setStorage('tnoOthers', newValue);
                        tnoOthers = newValue;
                        console.log('Set include-others to:', newValue);
                        onSettingChanged();
                    });

                    $settingWlOverride.change(function () {
                        const newValue = this.checked;
                        setStorage('tnoWlOverride', newValue);
                        tnoWlOverride = newValue;
                        console.log('Set wl-override to:', newValue);
                        onSettingChanged();
                    });

                    $settingCustom.change(function () {
                        const newValue = this.checked;
                        setStorage('tnoAlwaysCustom', newValue);
                        tnoAlwaysCustom = newValue;
                        alwaysRoll = newValue;
                        realViews = REAL_VIEWS.get(alwaysRoll);
                        if (newValue === false) rollStart = 0;
                        console.log('Set always-custom to:', newValue);
                        onSettingChanged();
                    });

                    $settingReloadDef.change(function () {
                        const newValue = this.checked;
                        setStorage('tnoReloadDefault', newValue);
                        tnoReloadDefault = newValue;
                        console.log('Set reload-default to:', newValue);
                        onSettingChanged();
                    });

                    if ($settingShowAll) {
                        $settingShowAll.change(function () {
                            const newValue = !this.checked;
                            setStorage('tnoAllowAll', newValue);
                            tnoAllowAll = newValue;
                            console.log('Set show-all to:', newValue);
                            onSettingChanged();
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

    const makeScrollEvent = (lastEl) => {
        console.log('Making scroll event for:', lastEl);

        const options = {
            root: document.documentElement,
        };

        let observer;

        // eslint-disable-next-line prefer-const
        observer = new IntersectionObserver((entries, observer) => {
            entries.forEach((entry) => {
                if (entry.intersectionRatio > 0) {
                    observer.unobserve(lastEl);
                    console.log('Fetching next batch of streams');
                    addFactionStreams(undefined, true);
                }
            });
        }, options);

        observer.observe(lastEl);
    };

    // eslint-disable-next-line prefer-const
    addFactionStreams = (streams = undefined, continueRoll = false) => {
        if (live === undefined) {
            console.log('Faction filter failed - Streams not fetched yet...');
            return;
        }

        let useRoll = false;
        if (onDefaultView() && (alwaysRoll || rollStart > 0)) {
            useRoll = true;
            if (!continueRoll) rollStart = 0;
        }

        const rollIds = [];

        if (streams === undefined) {
            streams = live.streams;

            if (isFilteringText) {
                streams = streams.filter(stream => matchesFilterStreamText(stream));
            }

            if (isFilteringText === false) { // !onUniversalFaction()
                if (useRoll) {
                    const numStreams = streams.length;
                    let numAdded = 0;
                    const results = [];
                    while (numAdded < rollAddMax && rollStart < numStreams) {
                        const idx = rollStart;
                        const stream = streams[idx];
                        rollStart++;
                        // Given stream is acceptable...
                        results.push(stream);
                        rollIds.push(idx);
                        numAdded++;
                    }
                    streams = results;
                } else {
                    streams = streams.filter((stream) => {
                        if (['publicnp', 'international'].includes(filterStreamFaction)) {
                            return stream.tagFactionSecondary === filterStreamFaction;
                        }
                        if (stream.factionsMap[filterStreamFaction]) return true;
                        if (filterStreamFaction === 'independent' && stream.factionsMap.othernp) return true;
                        return false;
                    });
                }
            }
        }

        console.log('filtered streams:', streams);

        const baseEl = document.querySelector('[data-target="directory-first-item"]');
        const baseParent = baseEl.parentElement;
        const wasRoll = rollIds.length > 0;

        // Includes npManual, _ORDER_, _TITLE_, _VIEWERS_, _PFP_, _CHANNEL1_, _CHANNEL2_
        // eslint-disable-next-line max-len
        const baseHtml = `<div data-target="" style="order: _ORDER_;"><div class="Layout-sc-nxg1ff-0 hwqnUg"><div><div class="Layout-sc-nxg1ff-0"><article data-a-target="card-10" data-a-id="card-_CHANNEL1_" class="Layout-sc-nxg1ff-0 hTbBzX"><div class="Layout-sc-nxg1ff-0 gIDgyI"><div class="Layout-sc-nxg1ff-0 iTDkvD"><div class="ScTextWrapper-sc-14f6evl-1 cndMhY"><div class="ScTextMargin-sc-14f6evl-2 feEGBq"><div class="Layout-sc-nxg1ff-0 AjNUj"><a lines="1" data-a-target="preview-card-title-link" class="ScCoreLink-sc-udwpw5-0 iwYxXk ScCoreLink-sc-ybxm10-0 iEEhdE tw-link" href="/_CHANNEL1_"><h3 title="_TITLE_" class="CoreText-sc-cpl358-0 hkccBP">_TITLE_</h3></a></div></div><div class="ScTextMargin-sc-14f6evl-2 feEGBq"><p class="CoreText-sc-cpl358-0 gzYAzs"><a data-test-selector="ChannelLink" data-a-target="preview-card-channel-link" class="ScCoreLink-sc-udwpw5-0 iwYxXk tw-link" href="/_CHANNEL1_/videos">_CHANNEL2_</a></p></div><div class="Layout-sc-nxg1ff-0 gwFCeO"><div class="InjectLayout-sc-588ddc-0 bFhJdp"><div class="InjectLayout-sc-588ddc-0 hoDLKA"><button class="ScTag-sc-xzp4i-0 hrkHJN tw-tag" aria-label="English" data-a-target="English"><div class="ScTagContent-sc-xzp4i-1 iYcwjl">English</div></button></div></div></div></div><div class="ScImageWrapper-sc-14f6evl-0 eBvtgw"><a data-a-target="card-10" data-a-id="card-_CHANNEL1_" data-test-selector="preview-card-avatar" class="ScCoreLink-sc-udwpw5-0 hUIOdd tw-link" href="/_CHANNEL1_/videos"><div class="ScAspectRatio-sc-1sw3lwy-1 flFnOO tw-aspect"><div class="ScAspectSpacer-sc-1sw3lwy-0 giUbvo"></div><figure aria-label="_CHANNEL1_" class="ScAvatar-sc-12nlgut-0 hnnsXF tw-avatar"><img class="InjectLayout-sc-588ddc-0 bxsmXn tw-image tw-image-avatar" alt="_CHANNEL1_" src="_PFP_"></figure></div></a></div></div></div><div class="ScWrapper-sc-uo2e2v-0 bbtaKw tw-hover-accent-effect"><div class="ScTransformWrapper-sc-uo2e2v-1 ScCornerTop-sc-uo2e2v-2 dKYJaX eXxFuv"></div><div class="ScTransformWrapper-sc-uo2e2v-1 ScCornerBottom-sc-uo2e2v-3 bNOuEj dzSwHO"></div><div class="ScTransformWrapper-sc-uo2e2v-1 ScEdgeLeft-sc-uo2e2v-4 kIKqjn cdcwLw"></div><div class="ScTransformWrapper-sc-uo2e2v-1 ScEdgeBottom-sc-uo2e2v-5 cuGbfn geiifk"></div><div class="ScTransformWrapper-sc-uo2e2v-1 icKHub"><a data-a-target="preview-card-image-link" class="ScCoreLink-sc-udwpw5-0 hUIOdd tw-link" href="/_CHANNEL1_"><div class="Layout-sc-nxg1ff-0 bcTnJT"><div class="ScAspectRatio-sc-1sw3lwy-1 dJaMsL tw-aspect"><div class="ScAspectSpacer-sc-1sw3lwy-0 lnBtND"></div><img alt="_TITLE_ - _CHANNEL1_" class="tw-image" src="https://static-cdn.jtvnw.net/previews-ttv/live_user__CHANNEL1_-440x248.jpg${timeId}"></div><div class="ScPositionCorner-sc-1iiybo2-1 ibaFTb"><div class="ScChannelStatusTextIndicator-sc-1f5ghgf-0 cbXzwD tw-channel-status-text-indicator" font-size="font-size-6"><p class="CoreText-sc-cpl358-0 joOBZx">LIVE</p></div></div><div class="ScPositionCorner-sc-1iiybo2-1 fIveqX"><div class="ScMediaCardStatWrapper-sc-1ncw7wk-0 gPUAhy tw-media-card-stat">_VIEWERS_ viewers</div></div></div></a></div></div></article></div></div></div></div>`;
        const fbHtml = baseHtml
            .replaceAll('href="/_CHANNEL1_/videos"', 'href="https://www.facebook.com/_CHANNEL1_/live_videos"')
            .replaceAll('href="/_CHANNEL1_"', 'href="https://www.facebook.com/gaming/_CHANNEL1_"');

        for (let i = 0; i < streams.length; i++) {
            const stream = streams[i];
            const channelName = stream.channelName;
            const channelNameLower = channelName.toLowerCase();
            const idx = wasRoll ? rollIds[i] : i;
            const cloneHtml = (stream.facebook ? fbHtml : baseHtml)
                .replace(/(?<=<article .*?)class="/i, 'class="npManual ')
                .replace(/_TNOID_/g, `${idx}`)
                .replace(/_CHANNEL1_/g, channelNameLower)
                .replace(/_CHANNEL2_/g, channelName)
                .replace(/_ORDER_/g, '0')
                .replace(/"_TITLE_/g, `"${encodeHtml(stream.title)}`)
                .replace(/_TITLE_/g, stream.title)
                .replace(/_VIEWERS_/g, numToTwitchViewers(stream.viewers))
                .replace(/_PFP_/g, stream.profileUrl);
            baseEl.insertAdjacentHTML('beforebegin', cloneHtml);
            const streamEl = baseParent.querySelector(`#tno-stream-${idx}`);
            if (wasRoll && i === streams.length - 1) {
                makeScrollEvent(streamEl);
            }
        }
    };

    const addClass = (el, ...classes) => {
        for (const c of classes) {
            if (!el.classList.contains(c)) {
                el.classList.add(c);
            }
        }
    };

    const removeClass = (el, ...classes) => {
        for (const c of classes) {
            if (el.classList.contains(c)) {
                el.classList.remove(c);
            }
        }
    };

    const fixReloadEnabled = () => {
        const filterReloadBtn = document.querySelector('.filter-reload');
        const isDefaultView = onDefaultView();
        const isRealView = onRealView() && !isDefaultView; // all-twitch
        const showOnDefaultNow = isDefaultView && (alwaysRoll || tnoReloadDefault);

        if (isFilteringText || showOnDefaultNow || (isRealView === false && isDefaultView === false)) { // Filtering text or showable-on-default or not universal
            removeClass(filterReloadBtn, 'tno-hide', 'tno-other'); // Full button
        } else {
            if (isDefaultView) {
                removeClass(filterReloadBtn, 'tno-hide'); // Partial (dark-green) button
                addClass(filterReloadBtn, 'tno-other');
            } else {
                removeClass(filterReloadBtn, 'tno-other'); // Red button
                addClass(filterReloadBtn, 'tno-hide');
            }
        }
    };

    destroyFilter = () => {
        const filterDiv = document.querySelector('.tno-filter-options');
        if (!filterDiv) return;
        for (const eventListener of filterListeners) {
            const { el, evName, evFunc } = eventListener;
            el.removeEventListener(evName, evFunc); // try catch
        }
        filterListeners = [];
        const searchDiv = document.querySelector('.tno-search-div');
        filterDiv.remove();
        if (searchDiv) searchDiv.remove();
    };

    const addFilterListener = (el, evName, evFunc) => {
        el.addEventListener(evName, evFunc);
        filterListeners.push({ el, evName, evFunc });
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
        const filterReloadBox = elSelectCustom.querySelector('.filter-reload-box');
        const filterReloadBtn = elSelectCustom.querySelector('.filter-reload');

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
            // console.log('Event happened: watchClickOutside');
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

        const updateCustomSelectChecked = async (value, text, isInit = false) => {
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

            filterStreamFaction = value;
            fixReloadEnabled();

            if (isInit) return;

            elSelectCustomInput.value = '';
            console.log('Updated selected!', filterStreamFaction);
            inputHandler();
            resetFiltering();
            // if (filterStreamFaction !== 'cleanbois') return;
            console.log('FOUND live:', live ? live.streams.length : -1);
            addFactionStreams();
            startDeleting();
        };

        const supportKeyboardNavigation = (e) => {
            // console.log('Key pressed');
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
            addFilterListener(document, 'click', watchClickOutside);
            addFilterListener(document, 'keydown', supportKeyboardNavigation);

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
        // eslint-disable-next-line prefer-arrow-callback
        addFilterListener(elSelectCustomBox, 'click', function (e) {
            // console.log('Clicked select box');
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

            // eslint-disable-next-line prefer-arrow-callback
            addFilterListener(elOption, 'click', function (e) {
                // console.log('Clicked option');
                const value = e.target.getAttribute('data-value');

                updateCustomSelectChecked(value, e.target.textContent);
                closeSelectCustom();
            });

            // eslint-disable-next-line prefer-arrow-callback
            addFilterListener(elOption, 'mouseenter', function (e) {
                // console.log('Mouse entered option');
                updateCustomSelectHovered(index);
            });

            // TODO: Toggle these event listeners based on selectCustom visibility
        });

        // eslint-disable-next-line prefer-arrow-callback
        addFilterListener(elSelectCustomInput, 'input', function (e) {
            // console.log('Input entered');
            inputHandler(e.target.value);
        });

        // eslint-disable-next-line prefer-arrow-callback
        addFilterListener(filterReloadBtn, 'click', async function (e) {
            console.log('Refreshing streams...');
            timeId = `?${new Date().getTime()}`;
            rollStart = 0;
            if (onDefaultView() || tnoReloadDefault) {
                alwaysRoll = true;
                realViews = REAL_VIEWS.get(alwaysRoll);
            }
            destroyFilter(); // Remove previous buttons/events
            await requestLiveData(); // Fetch new data from API endpoint
            await setupFilter(); // Setup new buttons/events
            resetFiltering(); // Reset twitch elements to original state (npChecked/remove)
            addFactionStreams(undefined); // Add pseudo elements for faction
            startDeleting();
            console.log('Refresh complete!');
        });

        if (selectFirst) {
            const initOption = elSelectCustomOpts.querySelector(`[data-value="${filterStreamFaction}"`);
            const initOptionValue = initOption.getAttribute('data-value');
            const initOptionText = initOption.textContent;
            updateCustomSelectChecked(initOptionValue, initOptionText, true);
        }
    };

    const parseLookup = (text, retainCase = false) => {
        text = text.replace(/^\W+|\W+$|[^\w\s]+/g, ' ').replace(/\s+/g, ' ');
        if (!retainCase) text = text.toLowerCase();
        return text.trim();
    };

    let inputNumLast = 0;
    let lastResultsStr;

    const searchForStreams = (searchText) => {
        const inputNumNow = ++inputNumLast;
        filterStreamText = searchText;
        filterStreamTextLookup = parseLookup(searchText);
        isFilteringText = filterStreamText !== '';
        console.log('Filtering for:', filterStreamText);

        const factionStreams = isFilteringText ? live.streams.filter(stream => matchesFilterStreamText(stream)) : undefined;
        const nowResultsStr = JSON.stringify(factionStreams);
        if (nowResultsStr === lastResultsStr) return;

        const numResults = factionStreams ? factionStreams.length : 0;

        let waitMs = 560; // 560

        if (numResults === 0) {
            waitMs = 0;
        } else if (numResults <= 6) {
            waitMs = 100; // 100
        } else if (numResults <= 12) {
            waitMs = 185; // 185
        } else if (numResults <= 18) {
            waitMs = 260; // 260
        } else if (numResults <= 24) {
            waitMs = 335; // 335
        } else if (numResults <= 30) {
            waitMs = 410; // 410
        }

        setTimeout(() => {
            if (inputNumNow !== inputNumLast || nowResultsStr === lastResultsStr) {
                console.log('Cancelled search for', searchText);
                return;
            }
            lastResultsStr = nowResultsStr;
            console.log(`(${waitMs}) Filtering...`);
            fixReloadEnabled();
            resetFiltering();
            // if (filterStreamFaction !== 'cleanbois') return;
            if (onRealView() === false) { // Runs in all cases except on real view
                addFactionStreams(factionStreams);
            }
            startDeleting();
        }, waitMs);
    };

    const genDefaultFaction = () => {
        let baseWord = 'NoPixel';
        const flagWords = [];
        if (tnoOthers) baseWord = 'RP';
        if (!tnoPublic) flagWords.push('-WL');
        if (!tnoInternational) flagWords.push('-U.S.');
        return `All ${baseWord}${flagWords.join('')} (Default)`;
    };

    const setupFilterFactions = async () => {
        const $sortByLabel = $(await waitForElement('label[for="browse-header-filter-by"]'));
        const $sortByDiv = $sortByLabel.parent().parent();
        const $groupDiv = $sortByDiv.parent();
        const $filterDiv = $sortByDiv.clone();

        $filterDiv.insertBefore($sortByDiv);
        $filterDiv.addClass('tno-filter-options');
        $filterDiv.css({ marginRight: '15px' });

        const [$labelDiv, $dropdownDiv] = $filterDiv
            .children()
            .toArray()
            .map(el => $(el));

        const filterFactions = live.filterFactions;
        filterFactions[0][1] = genDefaultFaction();

        if (!tnoPublic || !tnoInternational) {
            // Faction counts unaffected by TNO settings for WL vs non-WL etc.
            const factionCountSpecial = { allnopixel: true, alltwitch: true, publicnp: true, international: true, other: true };
            filterFactions.forEach((data) => {
                if (data[2] === false) return;
                const mini = data[0];
                const existsWl = factionCountSpecial[mini]
                    ? live.factionCount[mini] > 0
                    : live.streams.some(stream => !!stream.factionsMap[mini] && (tnoPublic || stream.noPublicInclude) && (tnoInternational || stream.noInternationalInclude));
                if (!existsWl) data[2] = false;
            });
        }

        if (isDeveloper) {
            const guessedIdx = filterFactions.findIndex(data => data[0] === 'guessed');
            if (guessedIdx && filterFactions[guessedIdx][2] === true) {
                const guessed = filterFactions.splice(guessedIdx, 1)[0];
                filterFactions.splice(2, 0, guessed);
            }
        }

        filterFactions.sort((dataA, dataB) => {
            const emptyA = dataA[2] === false;
            const emptyB = dataB[2] === false;
            if (emptyA && !emptyB) return 1;
            if (emptyB && !emptyA) return -1;
            return 0;
        });

        console.log('>>>>>>>>>>>> setup filter');

        const showOnDefault = alwaysRoll || tnoReloadDefault;

        // const isRealView = onRealView();

        // $labelDiv.find('label').text('Filter factions');
        $labelDiv.remove();
        $dropdownDiv.html(`
            <div class="select">
                <div class="selectWrapper">
                    <div class="selectCustom js-selectCustom" aria-hidden="true">
                        <div class="selectCustom-row${!isDark ? ' lightmodeScreen' : ''}">
                            <div class="filter-reload-box tooltip">
                                <span id="tno-reload-message" class="tooltiptext tooltiptext-hover tooltiptext-wider2">
                                    Refresh live NoPixel data —<br/>
                                    Click once to update streams on all filters${(alwaysRoll || showOnDefault) ? ` and the default view.<br/><br/>
                                    To stop the default view being refreshed, use the settings menu<br/>
                                    (⚙️ Twitch NoPixel Only button).
                                    ` : `.<br/><br/>
                                    This will only refresh the default view when clicked without viewing a faction<br/>(dark green refresh button).<br/><br/>
                                    To make the refresh button always update the default view, use the settings menu<br/>
                                    (⚙️ Twitch NoPixel Only button).
                                    `}
                                </span>
                                <span class="tno-reload filter-reload">&#x27f3;</span>
                            </div>
                            <label class="selectCustom-label tooltip">
                                Filter streams
                                <span id="streamCount" class="tooltiptext tooltiptext2">...</span>
                            </label>
                            <div class="selectCustom-trigger"></div>
                        </div>
                        <div class="selectCustom-options">
                            <input class="selectCustom-input" placeholder="Search..."></input>
                            ${filterFactions
        .map(
            option =>
                `<div style="color: ${useColorsDark[option[0]] || useColorsDark.independent}" class="selectCustom-option${
                    option[2] === false ? ' optionNotLive' : ''
                }" data-value="${option[0]}">${option[1]}${option[2] === false ? ' (Not Live)' : ''}</div>`
        )
        .join('')}
                        </div>
                    </div>
                </div>
            </div>
        `);

        activateSelect(true);

        return [$groupDiv, $filterDiv];
    };

    // eslint-disable-next-line prefer-const
    setupFilter = async () => {
        const [$groupDiv] = await setupFilterFactions();

        if (tnoSearch) {
            $groupDiv.css({ position: 'relative' });

            const $searchDiv = $('<div class="tno-search-div"></div>');
            const $searchInput = $searchDiv.append(`<input class="tno-search-input${isDark ? '' : ' tno-search-input-lightmode'}" placeholder="Search for character name / nickname / stream..."/>`);
            $groupDiv.prepend($searchDiv);

            if (isFilteringText) document.querySelector('.tno-search-input').value = filterStreamText;

            // eslint-disable-next-line prefer-arrow-callback
            addFilterListener($searchInput[0], 'input', function (e) {
                const searchText = e.target.value.toLowerCase().trim();

                const textLen = searchText.length;

                if (searchText === '' || textLen >= 2) {
                    searchForStreams(searchText);
                }
            });
        }
    };

    const twitchGtaUrl = /^https:\/\/www\.twitch\.tv\/directory\/game\/Grand%20Theft%20Auto%20V(?!\/videos|\/clips)/;
    onPage = twitchGtaUrl.test(window.location.href);

    activateInterval = async () => {
        // Remember that this will run twice without reloading when switching from Clips/Videos back to channels
        if (interval != null) {
            console.log("[TNO] Couldn't start interval (already running)");
            return false;
        }

        await fixSortType();

        [tnoStatus, tnoEnglish, tnoPublic, tnoInternational, tnoOthers, tnoWlOverride, tnoSearch, tnoScrolling, tnoAlwaysCustom, tnoReloadDefault, tnoAllowAll] = await getStorage([
            ['tnoStatus', true],
            ['tnoEnglish', true],
            ['tnoPublic', true],
            ['tnoInternational', true],
            ['tnoOthers', false],
            ['tnoWlOverride', true],
            ['tnoSearch', true],
            ['tnoScrolling', false],
            ['tnoAlwaysCustom', false],
            ['tnoReloadDefault', sortType !== SORTS.recommended],
            ['tnoAllowAll', false],
        ]);

        alwaysRoll = tnoAlwaysCustom;
        realViews = REAL_VIEWS.get(alwaysRoll);
        rollStart = 0;

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

        if (alwaysRoll) {
            addFactionStreams(undefined);
        }

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
