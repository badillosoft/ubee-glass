function ubeefy(element, root = null) {
    if (element.tagName === "DATALIST") {
        return;
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
                root.dispatchEvent(new CustomEvent(value, {
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

    document.body.appendChild(container);

    ubeefy(container);
}