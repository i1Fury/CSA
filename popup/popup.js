const settings = [
    {
        name: "firstpage",
        type: "toggle",
    },
    {
        name: "bumpbutton",
        type: "toggle",
    },
    {
        name: "clearbutton",
        type: "toggle",
    },
    {
        name: "bumpmessage",
        type: "text",
    },
];

let names = settings.map(setting => setting.name);

function handleSwitch(el) {
    let setting = el.id;
    let enabled = el.checked;
    if (names.includes(setting)) {
        let payload = {};
        payload[setting] = enabled;
        chrome.storage.sync.set(payload);
    }
}

function handleText(e) {
    let el = e.target;
    let setting = el.id;
    let value = el.value;
    if (names.includes(setting)) {
        let payload = {};
        payload[setting] = value;
        chrome.storage.sync.set(payload);
    }
}

settings.forEach((setting) => {
    chrome.storage.sync.get(setting.name, (data) => {
        let el = document.getElementById(setting.name);
        // set el.checked to data[setting] if it exists

        if (setting.type === "toggle") {
            if (data[setting.name] !== undefined) {
                el.checked = data[setting.name];
            } else {
                el.checked = true;
            }
            el.onclick = function () {
                handleSwitch(this);
            };

            el.parentNode.parentNode.classList.add("show");
        }
        if (setting.type === "text") {
            el.value = data[setting.name];
            el.parentNode.classList.add("show");
            el.addEventListener('input', handleText);
        }
    });
});

let textElements = document.getElementsByClassName("text")
// add the show class to all of them
for (let i = 0; i < textElements.length; i++) {
    textElements[i].classList.add("show");
}

// chrome.storage.sync.get('bumpmessage', (data) => {
//     console.log(data);
// });
