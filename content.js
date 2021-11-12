const firstPageRefreshDelay = 5000;
const showBumpButton = true;
const showClearButton = true;
const showFirstPage = true;
const bumpMessage = 'Bump';

var autoRefreshFirstPages = null;


function getJsonFromUrl(url) {
    if(!url) url = location.href;
    var question = url.indexOf("?");
    var hash = url.indexOf("#");
    if(hash==-1 && question==-1) return {};
    if(hash==-1) hash = url.length;
    var query = question==-1 || hash==question+1 ? url.substring(hash) :
    url.substring(question+1,hash);
    var result = {};
    query.split("&").forEach(function(part) {
        if(!part) return;
        part = part.split("+").join(" "); // replace every + with space, regexp-free version
        var eq = part.indexOf("=");
        var key = eq>-1 ? part.substr(0,eq) : part;
        var val = eq>-1 ? decodeURIComponent(part.substr(eq+1)) : "";
        var from = key.indexOf("[");
        if(from==-1) result[decodeURIComponent(key)] = val;
        else {
            var to = key.indexOf("]",from);
            var index = decodeURIComponent(key.substring(from+1,to));
            key = decodeURIComponent(key.substring(0,from));
            if(!result[key]) result[key] = [];
            if(!index) result[key].push(val);
            else result[key][index] = val;
    }
  });
  return result;
}


function htmlEntities(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}


class topicListMessage {
    //     setTimeout(function (f, t, dt, og, reload) { dt.innerHTML = og; dt.getElementsByClassName('bump')[0].onclick = function () { bump(f, t, this) }; if (reload) { location.reload(); } }.bind(null, f, t, dt, og, reload), delay * 1000);
    constructor(dt, onclicks) {
        this.dt = dt;
        this.onclicks = onclicks;
        this.title = dt.getElementsByClassName('topictitle')[0].outerHTML;
        this.og = dt.innerHTML;
    }

    set(color, message, delay=0, callback=void(0), precallback=function () {}) {
        this.dt.innerHTML = `${this.title}<br><font class="topiclistmessage" color="${color}">${message}</font></br>`;
        return new Promise(resolve => { precallback(resolve); setTimeout(resolve, delay * 1000); }).then(callback);
    }

    reset() {
        this.dt.innerHTML = this.og;
        for (const [key, value] of Object.entries(this.onclicks)) {
            let el = this.dt.getElementsByClassName(key)[0];
            el.onclick = value.bind(el, this);
        }
    }
}


async function clear(tlm, f, t, authorId, el) {
    // Get start page now because the confirmation removes the pagination container
    var start = 0;
    try {
        start = parseInt(getJsonFromUrl(Array.prototype.at.call(el.parentNode.parentNode.getElementsByClassName('pagination')[0].getElementsByTagName('a'), -1).href).start);
    } catch {}

    // Ask the user for confirmation
    tlm['confirmation'] = false;
    await tlm.set('#5d5d5d', `<span style="font-size: 1em !important;">Are you sure you want to clear all replies? <a class="confirmation" id="yes" href="javascript:void(0);" style="color: #087508; text-decoration: underline;" onclick="void(0)">Yes</a> or <a class="confirmation" id="yes" href="javascript:void(0);" style="color: #750808; text-decoration: underline;" onclick="void(0)">No</a></span>`, delay=5, callback=() => tlm.reset(), precallback=function (resolve) {
        let options = this.dt.getElementsByClassName('confirmation');
        options[0].onclick = function (resolve, tlm) { tlm.confirmation = true; tlm.reset(); resolve(); }.bind(options[0], resolve, this);
        options[1].onclick = function (resolve, tlm) { tlm.reset(); resolve(); }.bind(options[1], resolve, this);
    }.bind(tlm));

    if (!tlm['confirmation']) {
        console.log('Cancelling!')
        return;
    }

    // Step one: fetch every page from last to first
    var totalPosts = 0;
    var currentPost = 0;

    for (let page = start; page > -1; page -= 10) {
        await fetch(`https://www.chickensmoothie.com/Forum/viewtopic.php?f=${f}&t=${t}&start=${page}`).then(r => r.text()).then(async function (result) {
            // Step two: collect all posts on this page
            var doc = new DOMParser().parseFromString(result, 'text/html');
            let posts = Array.prototype.slice.call(doc.getElementsByClassName('post'));
            if (page == start) {
                totalPosts = start - 1 + posts.length;
            }
            for (let i in posts.reverse()) {
                currentPost += 1
                await tlm.set('#080875', `Deleting post ${currentPost}/${totalPosts}`);

                // Step three: Delete post if it was sent by the user
                let post = posts[i];
                if (post.querySelectorAll('h3.first')[0] && page == 0) { continue; } // If it's the first ever post, stop.
                let author = post.querySelector('div > div.postbody > p > strong > a');
                if (!author.href.includes(authorId)) { // If it runs into someone else's post, stop.
                    return await tlm.set('#750808', `Ran into <a target="_blank" href="${`https://www.chickensmoothie.com/Forum/viewtopic.php?f=${f}&t=${t}&start=${page}#${post.id}`}" style="color: #ad1f1f; text-decoration: underline;">${htmlEntities(author.textContent)}'s message!</a>`, 6, () => tlm.reset());
                }

                await fetch(`https://www.chickensmoothie.com/Forum/posting.php?mode=delete&f=${f}&p=${post.id.substring(1)}`).then(r => r.text()).then(async function (result) {
                    var delDoc = new DOMParser().parseFromString(result, 'text/html');

                    let formData = new FormData(delDoc.querySelector('#confirm'));
                    formData.append('confirm', 'Yes');

                    await fetch(delDoc.querySelector('#confirm').action, {
                        method: 'POST',
                        body: formData
                    });
                });
            }
        });
    }
    await tlm.set('#087508', 'All replies have been deleted!', 1.5, () => { location.reload(); });
}


function post(tlm, f, t, formData, delay) {
    return new Promise(resolve => setTimeout(resolve, delay)).then(function (tlm, f, t, formData) {
        fetch(`https://www.chickensmoothie.com/Forum/posting.php?mode=reply&f=${f}&t=${t}`, {
            method: 'POST',
            body: formData
        }).then(r => r.text()).then(async function(result) {
            if (result.includes('You cannot make another post so soon after your last.')) {
                refreshFirstPages();
                await tlm.set('#750808', 'You cannot make another post so soon after your last.', 3, () => tlm.reset());
            } else {
                var doc = new DOMParser().parseFromString(result, 'text/html');
                await tlm.set('#087508', 'Done! Refreshing page now...', 1.5, () => { location.reload(); });
            }
        });
    }.bind(null, tlm, f, t, formData));
}


async function bump(tlm, f, t, formData, startTime, el) {
    isOnFirstPage(f, t).then(async function (fp) {
        if (fp.result) {
            refreshFirstPages();
            await tlm.set('#750808', 'You cannot bump a post that is already on the first page of a topic!', 3, () => tlm.reset());
        } else {
            await tlm.set('#080875', 'Bumping...');
            await post(tlm, f, t, formData, Math.max(2000 - (performance.now() - startTime), 0));
        }
    });
}


function getFormData(f, t) {
    return fetch(`https://www.chickensmoothie.com/Forum/posting.php?mode=reply&f=${f}&t=${t}`).then(r => r.text()).then(result => {
            if (result.includes('This topic is locked, you cannot edit posts or make further replies.')) {
                return {result: 'locked'};
            }

            var doc = new DOMParser().parseFromString(result, 'text/html');
            let formData = new FormData();
            Array.prototype.forEach.call(doc.querySelector('#postform > div.panel.bg2 > div > fieldset').getElementsByTagName('input'), function (input) {
                formData.append(input.name, input.value);
            });
            Array.prototype.forEach.call(doc.querySelector('#options-panel > div').getElementsByTagName('input'), function (input) {
                formData.append(input.name, input.value);
            });

            formData.append('subject', doc.querySelector('#page-body > h2 > a').textContent);
            formData.append('message', bumpMessage + '\n[size=60]Bumped by [url=https://chrome.google.com/webstore/detail/chicken-smoothie-assistan/dlndlacknelkkhombcehoccclpfkpefl]Chicken Smoothie Assistant[/url]![/size]');
            formData.delete('attach_sig');
            formData.delete('disable_bbcode');
            formData.delete('disable_magic_url');
            formData.delete('notify');
            formData.delete('save');
            formData.delete('preview');
            return {result: 'success', formData: formData, startTime: performance.now()};
        });
}


function isOnFirstPage(f, t) {
    return fetch('https://www.chickensmoothie.com/Forum/viewforum.php?f=' + f).then(r => r.text()).then(result => {
        let postURL = `./viewtopic.php?f=${f}&amp;t=${t}`;
        if (!result.includes(postURL)) { return {result: false}; }
        return {result: true, position: function (result) {
            var doc = new DOMParser().parseFromString(result, 'text/html');
            let unstickyRows = doc.querySelector('#page-body > div:nth-child(6) > div > ul.topiclist.topics').querySelectorAll('.row:not(.sticky)');
            return `(${(Array.prototype.findIndex.call(unstickyRows, (row) => row.innerHTML.includes(postURL)) + 1).toString().padStart(2, 0)}/${unstickyRows.length})`;
        }.bind(null, result)};
    });
}


async function refreshFirstPages() {
    let rows = document.getElementsByClassName('topiclist topics')[0].getElementsByClassName('row');

    Array.prototype.forEach.call(rows, function(row) {

        let data = getJsonFromUrl(row.querySelector('dl > dt > a.topictitle').href);

        isOnFirstPage(data.f, data.t).then(fp => {
            if (!fp.result) {
                row.getElementsByClassName('firstpage')[0].outerHTML = '<dd class="firstpage"><span><font color="#750808" size="3"><b>NO</b></font></span></dd>';
            } else {
                row.getElementsByClassName('firstpage')[0].outerHTML = '<dd class="firstpage"><span><font color="#106107" size="3"><b>YES</b></font></span></dd>';
                row.getElementsByClassName('firstpage')[0].querySelector('span > font').insertAdjacentHTML('afterend', `<label class="position">${fp.position()}</label>`);
            }
        });
    });
}


// Listen for messages
chrome.runtime.onMessage.addListener(async function (msg, sender) {
    try {
        await initStorageCache;
    } catch (e) {
        // Handle error that occurred during storage initialization.
    }
    // If the received message has the expected format...
    if (msg.text === 'posts') {

        // Topics Section
        let rows = document.getElementsByClassName('topiclist topics')[0].getElementsByClassName('row');

        let views = document.querySelector('#page-body > div > div > ul:nth-child(2) > li > dl > dd.views');
        views.insertAdjacentHTML('afterend', '<dd class="firstpage">FIRST PAGE</dd>');
        document.querySelector("#page-body > div > div > ul:nth-child(2) > li > dl > dd.lastpost").style.width = "10%";
        let userid = document.querySelector('#nav_mystuff > a').href.substring(62);

        Array.prototype.forEach.call(rows, function(row) {

            let data = getJsonFromUrl(row.querySelector('dl > dt > a.topictitle').href);

            if (showBumpButton || showClearButton) {
                let atags = row.querySelector('dl > dt').getElementsByTagName('a');
                if (atags[atags.length - 2].href.substring(72) == userid) {
                    getFormData(data.f, data.t).then(formData => {
                        if (formData.result != 'locked') {

                            let onclicks = {}

                            row.getElementsByClassName('topictitle')[0].insertAdjacentHTML('afterend', '<div class="topicbuttons"></div>');

                            // Add bump button
                            if (showBumpButton) {
                                row.getElementsByClassName('topicbuttons')[0].insertAdjacentHTML('beforeend', '<a href="javascript:void(0);" class="topicbutton bump" onclick="void(0);"><b>[Bump]</b></a>');
                                onclicks['bump'] = function (tlm) { bump(tlm, data.f, data.t, formData.formData, formData.startTime, this) };
                            }

                            // Add clear button
                            if (showClearButton) {
                                row.getElementsByClassName('topicbuttons')[0].insertAdjacentHTML('beforeend', '<a href="javascript:void(0);" class="topicbutton clr" onclick="void(0);"><b>[Clear]</b></a>');
                                onclicks['clr'] = function (tlm) { clear(tlm, data.f, data.t, userid, this) }
                            }

                            let tlm = new topicListMessage(row.getElementsByTagName('dt')[0], onclicks);
                            tlm.reset();

                        }
                    });
                }
            }
            let views = row.getElementsByClassName('views')[0];
            views.insertAdjacentHTML('afterend', '<dd class="firstpage"><span><font color="#750808" size="3"><b>NO</b></font></span></dd>');

        });

        refreshFirstPages();
        autoRefreshFirstPages = setInterval(refreshFirstPages, firstPageRefreshDelay);
        // clearInterval(autoRefreshFirstPages);
    }
});