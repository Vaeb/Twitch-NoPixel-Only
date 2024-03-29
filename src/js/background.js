console.log('TNO Refreshed');

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const twitchUrl = /^https:\/\/www\.twitch\.tv\//;
const twitchGtaUrl = /^https:\/\/www\.twitch\.tv\/directory\/(game\/Grand%20Theft%20Auto%20V|category\/grand-theft-auto-v)(?!\/videos)/;
const twitchGtaUrlClips = /^https:\/\/www\.twitch\.tv\/directory\/(game\/Grand%20Theft%20Auto%20V|category\/grand-theft-auto-v)\/clips/;

const curPage = {};
const curRange = {};

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    const url = changeInfo.url;
    if (url) {
        if (twitchUrl.test(url)) {
            const onPage = twitchGtaUrl.test(url);
            const oldPage = curPage[tabId];
            const oldRange = curRange[tabId];
            if (onPage) {
                curRange[tabId] = (url.match(/\brange=(\w+)/i) || [])[1];
                if (twitchGtaUrlClips.test(url)) {
                    curPage[tabId] = 'clips';
                } else {
                    curPage[tabId] = 'live';
                }
            } else {
                curPage[tabId] = undefined;
                curRange[tabId] = undefined;
            }
            // diff & clips page must have range in url
            const bigChange = (curPage[tabId] !== oldPage || curRange[tabId] !== oldRange) && (curPage[tabId] !== 'clips' || curRange[tabId] !== undefined);
            console.log(bigChange, tabId, curPage[tabId], oldPage, curRange[tabId], oldRange, url);
            chrome.tabs.sendMessage(tabId, {
                status: onPage ? 'START' : 'STOP',
                curPage: curPage[tabId],
                range: curRange[tabId],
                bigChange,
            });
        }
    }
});

chrome.action.onClicked.addListener((activeTab) => {
    const newURL = 'https://www.twitch.tv/directory/category/grand-theft-auto-v';
    chrome.tabs.create({ url: newURL });
});

const getRandomDec = (min, max) => Math.random() * (max - min) + min;

const shuffle = (arr) => {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
};

const parseTitle = badTitle => badTitle
    .replace(/[-_]|\b[a-z]|['][a-z]/g, (c) => {
        if (c[0] === "'") return c;
        if (['-', '_'].includes(c)) return ' ';
        return c.toUpperCase();
    })
    .replace(/\bGTAV?/ig, c => c.toUpperCase())
    .replace(/nopixel/ig, 'NoPixel')
    .replace(/\brp/ig, 'RP')
    .trim();

let lastFbLookup = 0;

const handleGetFbStreams = async (msgData, nowTime) => {
    const {
        channelsFb,
        tick,
        fbDebounce,
        fbMaxLookup,
        fbSleep,
        fbGroupSize,
        fbGroupSleepInc,
        fbRandomRadius,
        fbLastMajorChange,
    } = msgData;

    if ((nowTime - lastFbLookup) < fbDebounce) {
        console.log(new Date(), 'Already looked up recently...');
        return [];
    }
    lastFbLookup = nowTime;
    const isInitial = fbLastMajorChange == 0;

    let channelsFbNow = shuffle([...channelsFb]);
    if (fbMaxLookup > -1 && isInitial === false) {
        channelsFbNow = channelsFbNow.slice(0, fbMaxLookup);
    }

    // ////////// FB STREAM CHECK
    console.log(new Date(), 'Checking for fb streams...', fbMaxLookup, isInitial);
    const fbStreamsRaw = [];
    for (const [channelNum, streamer] of Object.entries(channelsFbNow)) {
        console.log('looking up', streamer);
        // const headers = new Headers();
        // headers.append('Content-Type', 'text/html');
        // headers.append('Accept', 'text/html');
        // headers.append('Origin', 'https://twitch.tv');
        // eslint-disable-next-line no-await-in-loop
        const res = await fetch(`https://mobile.facebook.com/gaming/${streamer}`);
        // eslint-disable-next-line no-await-in-loop
        const body = await res.text();
        lastFbLookup = +new Date();

        const isLive = body.includes('playbackIsLiveStreaming&quot;:true');
        const isBad = body.includes('temporarily');
        if (isBad) {
            console.log('Cant check for fb streams right now...');
            return [];
        }
        // if (streamer === 'dasMEHDI' && isLive == false) console.log('NOT LIVE', streamer, body);
        if (isLive) {
            fbStreamsRaw.push([streamer, body]);
        }
        console.log('finished with', streamer, isLive);
        if (isLive) console.log('>> LIVE!');

        if (channelNum < channelsFbNow.length - 1) {
            const groupNum = Math.floor(channelNum / fbGroupSize);
            const baseDebounce = fbSleep + (fbGroupSleepInc * groupNum);
            const nowDebounce = isInitial ? fbSleep : baseDebounce + getRandomDec(-fbRandomRadius, fbRandomRadius);
            console.log(groupNum, baseDebounce, nowDebounce, isInitial);
            // eslint-disable-next-line no-await-in-loop
            await sleep(nowDebounce);
        }
    }

    const fbStreams = {};
    for (const data of fbStreamsRaw) {
        if (data === undefined) continue;
        const [streamer, body] = data;
        let videoUrl = (body.match(/&quot;videoURL&quot;:&quot;(.*?)&quot;/) || ['', ''])[1]
            .replace(/\\/g, '');
        const viewCountStr = (body.match(/>LIVE<[\s\S]+?<\/i>([\d.,K]+)<\/span>/) || [])[1];
        let viewCount = parseFloat(viewCountStr ? viewCountStr.replace(/,/g, '.') : viewCountStr);
        if (viewCountStr.includes('K')) viewCount *= 1000;
        const pfpUrl = (body.match(/[ "]profpic"[\s\S]+?(http.+?)&#039;/) || ['', ''])[1]
            .replace(/\\(\w\w) /g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
        const thumbnailUrl = (body.match(/\sdata-store=[\s\S]+?background: url\(&#039;(http.+?)&#039;/) || ['', ''])[1]
            .replace(/\\(\w\w) /g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));

        let title;
        const videoUrlParts = videoUrl.toLowerCase().trim().split(/[?\/]+/).filter(part => part !== '');
        const intRegex = /^\d+$/;
        let videosPos = -999;
        for (let i = 0; i < videoUrlParts.length; i++) {
            if (videoUrlParts[i] === 'videos') {
                videosPos = i;
            } else if (intRegex.test(videoUrlParts[i]) && i === videosPos + 2) {
                const videoUrlTitle = videoUrlParts[i - 1];
                videoUrl = videoUrl.replace(`/${videoUrlTitle}`, '');
                title = `《FB》${parseTitle(videoUrlTitle)}`;
                break;
            }
        }
        console.log('title', title);

        fbStreams[streamer] = {
            userDisplayName: streamer,
            videoUrl,
            title: title !== undefined ? title : `《Facebook Gaming - ${streamer}》`,
            viewers: viewCount,
            profileUrlOverride: pfpUrl,
            thumbnailUrl,
            facebook: true,
        };
    }

    // const npStreams = await (await fetch('http://localhost:3029/parse_streams', {
    const npStreams = await (await fetch('https://vaeb.io:3030/parse_streams', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fbChannels: channelsFbNow, fbStreams, tick }),
    })).json();

    console.log('GOT npStreams FROM SERVER:', npStreams);

    if (npStreams != null && npStreams.length > 0) {
        console.log('using');
        return npStreams;
    }

    return [];
};

// eslint-disable-next-line consistent-return
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const { msgType, msgData } = message;
    const nowTime = +new Date();

    if (msgType === 'get-fb-streams') {
        handleGetFbStreams(msgData, nowTime).then(sendResponse);
        return true;
    }
});
