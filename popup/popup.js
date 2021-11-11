function handleSwitch(el) {
    console.log(el.checked);
}

document.querySelector("#button-3 > input").onclick = function () { handleSwitch(this) };