$(async () => {
    const getStorage = key => new Promise((resolve) => {
        chrome.storage.local.get(key, (value) => {
            resolve(value[key]);
        });
    });

    const setStorage = async (key, val) => chrome.storage.local.set({ [key]: val });

    let status = await getStorage('tnoStatus');
    console.log(status);
    if (status !== false && status !== true) { // Initial
        status = true;
        setStorage('tnoStatus', status);
    }

    const updatePower = () => {
        if (status === true) {
            $('#power').text('[Enabled] Click to disable');
        } else {
            $('#power').text('[Disabled] Click to enable');
        }
    };

    updatePower();

    $('#nopixel').click((e) => {
        console.log('clicked');
        e.preventDefault();
        chrome.tabs.create({
            url: 'https://www.twitch.tv/directory/game/Grand%20Theft%20Auto%20V',
        });
        window.close();
    });

    $('#power').click(() => {
        status = !status;
        setStorage('tnoStatus', status);
        updatePower();
    });
});
