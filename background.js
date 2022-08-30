// background.js
var postsUrlRegex =
    /^https?:\/\/(?:[^./?#]+\.)?chickensmoothie\.com\/Forum\/search\.php*/;

const defaults = {
    firstpage: true,
    bumpbutton: true,
    clearbutton: true,
    bumpmessage: "Bump",
};

const settings = {};

async function refresh_settings() {
    const items = await getAllStorageSyncData();
    console.log(items);
    for (const key in defaults) {
        // set the items[key] over the default
        if (items[key] === undefined) {
            chrome.storage.sync.set({ [key]: defaults[key] });
            settings[key] = defaults[key];
        } else {
            settings[key] = items[key];
        }
        // settings[key] = items[key] || defaults[key];
    }
}

function getAllStorageSyncData() {
    // Immediately return a promise and start asynchronous work
    return new Promise((resolve, reject) => {
        // Asynchronously fetch all data from storage.sync.
        chrome.storage.sync.get(null, (items) => {
            // Pass any observed errors down the promise chain.
            if (chrome.runtime.lastError) {
                return reject(chrome.runtime.lastError);
            }
            // Pass the data retrieved from storage down the promise chain.
            resolve(items);
        });
    });
}

function onPageLoad(tabId) {
    chrome.tabs.get(tabId, function (tab) {
        if (postsUrlRegex.test(tab.url)) {
            console.log(settings);
            chrome.tabs.sendMessage(tab.id, {
                text: "posts",
                settings: settings,
            });
        }
        // } else if (viewTopicUrlRegex.test(tab.url)) {
        //     chrome.tabs.sendMessage(tab.id, {text: 'viewtopic', GBumpPath: GBumpPath, RBumpPath: RBumpPath});
        // }
    });
}

chrome.webNavigation.onCompleted.addListener(function (details) {
    refresh_settings()
        .then(() => {
            onPageLoad(details.tabId);
        })
        .catch(console.error);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message === "get-latest-settings") {
        refresh_settings()
            .then(() => {
                sendResponse(settings);
            })
            .catch(console.error);
    }
});

chrome.storage.onChanged.addListener(function (changes, namespace) {
    for (let [key, { oldValue, newValue }] of Object.entries(changes)) {
        console.log(
            `Storage key "${key}" in namespace "${namespace}" changed.`,
            `Old value was "${oldValue}", new value is "${newValue}".`
        );
    }
});

chrome.runtime.onInstalled.addListener((details) => {
    // if (details.reason === chrome.runtime.OnInstalledReason.INSTALL) {
    if (details.reason === chrome.runtime.OnInstalledReason.INSTALL) {
        chrome.tabs.create(
            {
                url: "https://www.chickensmoothie.com/Forum/viewtopic.php?f=5&t=4777498",
            },
            function (tab) {
                console.log(
                    "New tab launched with https://www.chickensmoothie.com/Forum/viewtopic.php?f=5&t=4777498"
                );
            }
        );
    }
    // }
});

// function getAllStorageSyncData() {
//   return new Promise((resolve, reject) => {
//     chrome.storage.sync.get(null, (items) => {
//       if (chrome.runtime.lastError) {
//         return reject(chrome.runtime.lastError);
//       }
//       resolve(items);
//     });
//   });
// }
