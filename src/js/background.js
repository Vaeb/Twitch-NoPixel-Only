console.log('TNO Refreshed');

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const twitchUrl = /^https:\/\/www\.twitch\.tv\//;
const twitchGtaUrl = /^https:\/\/www\.twitch\.tv\/directory\/game\/Grand%20Theft%20Auto%20V(?!\/videos|\/clips)/;

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.url) {
        if (twitchUrl.test(changeInfo.url)) {
            const onPage = twitchGtaUrl.test(changeInfo.url);
            chrome.tabs.sendMessage(tabId, {
                status: onPage ? 'START' : 'STOP',
            });
        }
    }
});

chrome.action.onClicked.addListener((activeTab) => {
    const newURL = 'https://www.twitch.tv/directory/game/Grand%20Theft%20Auto%20V';
    chrome.tabs.create({ url: newURL });
});

let lastFbLookup = 0;

const handleGetFbStreams = async (msgData, nowTime) => {
    if ((nowTime - lastFbLookup) < 1000 * 60 * 2) {
        console.log('Already looked up recently...');
        return [];
    }
    lastFbLookup = nowTime;

    const { channelsFb, tick } = msgData;
    // ////////// FB STREAM CHECK
    console.log('Checking for fb streams...');
    const fbStreamsRaw = [];
    for (const streamer of channelsFb) {
        console.log('looking up', streamer);
        // const headers = new Headers();
        // headers.append('Content-Type', 'text/html');
        // headers.append('Accept', 'text/html');
        // headers.append('Origin', 'https://twitch.tv');
        // eslint-disable-next-line no-await-in-loop
        const res = await fetch(`https://mobile.facebook.com/gaming/${streamer}`);
        // eslint-disable-next-line no-await-in-loop
        const body = await res.text();
        const isLive = body.includes('playbackIsLiveStreaming&quot;:true');
        const isBad = body.includes('temporarily');
        if (isBad) {
            console.log('Cant check for fb streams right now...');
            return [];
        }
        if (streamer === 'dasMEHDI' && isLive == false) console.log('NOT LIVE', streamer, body);
        if (isLive) {
            fbStreamsRaw.push([streamer, body]);
        }
        console.log('finished with', streamer);
        // eslint-disable-next-line no-await-in-loop
        await sleep(2100);
    }

    const fbStreams = fbStreamsRaw
        .filter(result => result !== undefined)
        .map((data) => {
            const [streamer, body] = data;
            const videoUrl = (body.match(/&quot;videoURL&quot;:&quot;(.*?)&quot;/) || ['', ''])[1]
                .replace(/\\/g, '');
            const viewCountStr = (body.match(/>LIVE<[\s\S]+?<\/i>([\d.K]+)<\/span>/) || [])[1];
            let viewCount = parseFloat(viewCountStr);
            if (viewCountStr.includes('K')) viewCount *= 1000;
            const pfpUrl = (body.match(/[ "]profpic"[\s\S]+?(http.+?)&#039;/) || ['', ''])[1]
                .replace(/\\(\w\w) /g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
            const thumbnailUrl = (body.match(/\sdata-store=[\s\S]+?background: url\(&#039;(http.+?)&#039;/) || ['', ''])[1]
                .replace(/\\(\w\w) /g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
            // console.log(streamer, viewCountStr, videoUrl);

            return {
                userDisplayName: streamer,
                videoUrl,
                title: `《Facebook Gaming - ${streamer}》`,
                viewers: viewCount,
                profileUrlOverride: pfpUrl,
                thumbnailUrl,
                facebook: true,
            };
        })
        .sort((a, b) => b.viewers - a.viewers);

    // const npStreams = await (await fetch('http://localhost:3029/parse_streams', {
    const npStreams = await (await fetch('https://vaeb.io:3030/parse_streams', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fbStreams, tick }),
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
