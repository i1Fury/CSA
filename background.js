// background.js
var postsUrlRegex = /^https?:\/\/(?:[^./?#]+\.)?chickensmoothie\.com\/Forum\/search\.php*/;

function onPageLoad(tabId) {
    chrome.tabs.get(tabId, function(tab) {
        if (postsUrlRegex.test(tab.url)) {
            chrome.tabs.sendMessage(tab.id, {text: 'posts'});
        } else if (viewTopicUrlRegex.test(tab.url)) {
            chrome.tabs.sendMessage(tab.id, {text: 'viewtopic', GBumpPath: GBumpPath, RBumpPath: RBumpPath});
        }
    });
}


chrome.webNavigation.onCompleted.addListener(function(details) {
    onPageLoad(details.tabId);
});