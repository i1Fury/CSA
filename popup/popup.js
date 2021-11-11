const settings = ['firstpage', 'bumpbutton', 'clearbutton'];

function handleSwitch(el) {
    let setting = el.id;
    let enabled = el.checked;
    if (settings.includes(setting)) {
        let payload = {}
        payload[setting] = enabled
        chrome.storage.sync.set(payload);
    }
}

settings.forEach(setting => {
    chrome.storage.sync.get(setting, (data) => {
        let el = document.getElementById(setting);
        el.checked = data[setting];
        el.onclick = function () { handleSwitch(this) }
        el.parentNode.parentNode.classList.add('show');
    });
});

