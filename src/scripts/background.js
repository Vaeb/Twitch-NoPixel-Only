console.log('TNO Refreshed');

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.url) {
        if (/^https:\/\/www\.twitch\.tv\//.test(changeInfo.url)) {
            const onPage = /^https:\/\/www\.twitch\.tv\/directory\/game\/Grand%20Theft%20Auto%20V/.test(changeInfo.url);
            chrome.tabs.sendMessage(tabId, {
                status: onPage ? 'START' : 'STOP',
            });
        }
    }
});
