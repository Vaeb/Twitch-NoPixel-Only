console.log('TNO Refreshed');

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
