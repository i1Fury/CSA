// background.js
var postsUrlRegex = /^https?:\/\/(?:[^./?#]+\.)?chickensmoothie\.com\/Forum\/search\.php*/;

const defaults = {
    'firstpage': true,
    'bumpbutton': true,
    'clearbutton': true,
    'bumpmessage': 'Bump'
};
// const settings = {};
//
// const initSettings = getAllStorageSyncData().then(items => {
//     Object.assign(settings, items);
// });


function onPageLoad(tabId) {
    chrome.tabs.get(tabId, function(tab) {
        if (postsUrlRegex.test(tab.url)) {
            chrome.tabs.sendMessage(tab.id, {text: 'posts'});
        }
        // } else if (viewTopicUrlRegex.test(tab.url)) {
        //     chrome.tabs.sendMessage(tab.id, {text: 'viewtopic', GBumpPath: GBumpPath, RBumpPath: RBumpPath});
        // }
    });
}

chrome.webNavigation.onCompleted.addListener(function(details) {
    onPageLoad(details.tabId);
});


chrome.storage.onChanged.addListener(function (changes, namespace) {
  for (let [key, { oldValue, newValue }] of Object.entries(changes)) {
    console.log(
        `Storage key "${key}" in namespace "${namespace}" changed.`,
        `Old value was "${oldValue}", new value is "${newValue}".`
    );
  }
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