(async () => {
    localStorage.setItem("ubee-glass-token", Math.random().toString(32).slice(2));
    localStorage.setItem(`ubee-glass-lib`, "{}");
})();

function ubeefy(element, root = null) {
    if (element.tagName === "DATALIST") {
        return;
    }

    if (element.dataset.lib) {
        const library = element.dataset.lib;
        const libraries = JSON.parse(localStorage.getItem(`ubee-glass-lib`));
        if (library in libraries) {
            return document.body.querySelector(`[data-lib="library"]`);
        }
        libraries[library] = new Date().toISOString();
        localStorage.setItem(`ubee-glass-lib`, JSON.stringify(libraries));
    }

    if (element.dataset.test) {
        element.hidden = false;
    }

    let instance = 0;
    (element.dataset.extend || "").split(/\s*\|\s*/).forEach(name =>
        document.querySelectorAll(`[data-interface="${name.trim()}"]`).forEach(datalist =>
            datalist.querySelectorAll("option").forEach(option =>
                Object.entries(option.dataset || {}).forEach(
                    ([key, value]) => element.dataset[`${key}-${++instance}`] = value
                )
            )
        )
    );

    Object.entries(element.dataset).forEach(([key, value]) => {

        const chain = key.replace(/[A-Z]/g, string => `-${string.toLowerCase()}`)
            .replace(/-?on-/g, ":")
            .replace(/-?in-/g, "#")
            .replace(/-?at-/g, "@");

        if (chain.match(/^event-?(.*)/)) {
            const channel = ((chain.match(/^event-?(.*)/) || [])[1] || "").replace(/-\d+$/, "");
            element.addEventListener(channel, event => {
                new Function(
                    "self",
                    "parent",
                    "root",
                    "event",
                    "channel",
                    value
                )(
                    element,
                    element.parentNode,
                    root,
                    event,
                    channel
                );
            })
        }

        if (chain.match(/^listen-?(.*)/)) {
            const channel = ((chain.match(/^listen-?(.*)/) || [])[1] || "").replace(/-\d+$/, "");
            root.addEventListener(channel, event => {
                new Function(
                    "self",
                    "parent",
                    "root",
                    "event",
                    "channel",
                    value
                )(
                    element,
                    element.parentNode,
                    root,
                    event,
                    channel
                );
            })
        }

        if (chain.match(/^fire-?(.*)/)) {
            const channel = ((chain.match(/^fire-?(.*)/) || [])[1] || "").replace(/-\d+$/, "");
            element.addEventListener(channel, event => {
                console.log(channel, value);
                let tarchan = value;
                if (value.match(/\[([^\]]*)\]/)) {
                    let condition = null;
                    [condition, tarchan] = value.match(/\[([^\]]*)\]\s*(.*)/).slice(1);
                    const negation = !!condition[0] === "^";
                    condition = condition.replace("^", "");
                    let cancel = root.dataset[condition] !== "true";
                    cancel = negation ? !cancel : cancel;
                    // console.log(condition, root.dataset[condition], pass);
                    if (!cancel) {
                        return;
                    }
                }
                root.dispatchEvent(new CustomEvent(tarchan, {
                    detail: {
                        event,
                        self: element,
                        parent: element.parentNode,
                        root,
                        channel: {
                            source: channel,
                            target: value
                        }
                    }
                }))
            });
        }

        if (chain.match(/^burn-?(.*)/)) {
            const channel = ((chain.match(/^burn-?(.*)/) || [])[1] || "").replace(/-\d+$/, "");
            root.addEventListener(channel, event => {
                console.log(channel, value);
                let tarchan = value;
                if (value.match(/\[([^\]]*)\]/)) {
                    let condition = null;
                    [condition, tarchan] = value.match(/\[([^\]]*)\]\s*(.*)/).slice(1);
                    const negation = !!condition[0] === "^";
                    condition = condition.replace("^", "");
                    let cancel = root.dataset[condition] !== "true";
                    cancel = negation ? !cancel : cancel;
                    // console.log(condition, root.dataset[condition], pass);
                    if (!cancel) {
                        return;
                    }
                }
                root.dispatchEvent(new CustomEvent(tarchan, {
                    detail: {
                        event,
                        self: element,
                        parent: element.parentNode,
                        root,
                        channel: {
                            source: channel,
                            target: value
                        }
                    }
                }))
            });
        }
    });



    element.querySelectorAll(":scope > *").forEach(child => ubeefy(child, root || element));

    element.dispatchEvent(new CustomEvent(":update", {
        detail: null
    }));

    return element;
}

async function ubeeload(url) {
    const response = await fetch(url);

    if (!response.ok) {
        const text = await response.text();
        alert(text);
        return null;
    }

    const html = await response.text();

    const container = document.createElement("div");

    container.innerHTML = html;

    container.querySelectorAll(`[data-component], [data-lib]`).forEach(
        component => ubeefy(component) ? document.body.appendChild(component) : null
    );
}