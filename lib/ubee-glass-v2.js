window.ubee_util = {
    select(source, ...selectors) {
        return selectors.map(selector => {
            let elements = [];
            if (typeof selector === "function") {
                selector = selector();
            }
            if (typeof selector === "string") {
                elements.push(...source.querySelectorAll(selector));
            }
            if (selector instanceof HTMLElement) {
                elements.push(selector);
            }
            return elements;
        }).reduce((flatten, array) => {
            flatten.push(...array);
            return flatten;
        }, []);
    },
    clearElement(...selectors) {
        this.select(document, ...selectors).forEach(element => {
            while (element.firstChild) {
                element.removeChild(element.firstChild);
            }
        });
    }
};

async function ubee_download(url, options = {}) {
    let response = null;
    
    try {
        response = await fetch(url, options.fetch || {
            mode: "cors"
        });
        if (!response.ok) {
            const error = await response.text();
            console.warn(`ubee-glass/error`, error);
            return;
        }
    } catch(error) {
        console.warn(`ubee-glass/error`, error);
        return;
    }

    const html = await response.text();

    const container = document.createElement("div");

    container.innerHTML = html;

    return container;
}

async function ubee_install(url, components=[], libraries=[], 
    namespace="ubee-glass@kuhni/core", options={}) {
    let componentSelectors = [];
    let librarySelectors = [];

    if (components.length > 0) {
        componentSelectors = components
            .map(id => `[data-component="${id}"]`);
    }

    if (libraries.length > 0) {
        librarySelectors = libraries
            .map(id => `[data-lib="${id}"]`);
    }

    let download = true || components.length === 0;

    if (components.length > 0) {
        components.map(id => `${namespace}#component/${id}`).forEach(pid => {
            if (!localStorage.getItem(pid)) {
                download = true;
            }
        })
    }

    if (libraries.length > 0) {
        libraries.map(id => `${namespace}#lib/${id}`).forEach(pid => {
            if (!localStorage.getItem(pid)) {
                download = true;
            }
        })
    }

    if (download) {
        console.log("ubee glass: download", url);
        
        const container = await ubee_download(url, options);

        // console.log(container.querySelectorAll(`[data-module]`));

        await Promise.all(ubee_util.select(container, ...componentSelectors, ...librarySelectors).map(async element => {
            await ubee_module(...element.querySelectorAll(`[data-module]`));

            let pid = `${namespace}#`;
            
            !element.dataset.component || (pid += `component/${element.dataset.component}`);
            !element.dataset.lib || (pid += `lib/${element.dataset.lib}`);

            if (element.dataset.lib) {
                const libraries = JSON.parse(
                    localStorage.getItem("ubee-glass/libraries") || "{}"
                );

                libraries[pid] = new Date();

                localStorage.setItem("ubee-glass/libraries", JSON.stringify(libraries));
            }
            
            if (true || !localStorage.getItem(pid) || options.forceInstall) {
                console.log("ubee glass: install", element);
                localStorage.setItem(pid, JSON.stringify(ubee_serialize(element)));
            }
        }));
    }
}

window.ubee_modules = [];

async function ubee_module(...modules) {
    for (let module of [...modules]) {
        console.log(module);
        for (let source of [...module.querySelectorAll(`[data-source]`)]) {
            console.log(source.dataset.source);
            let components = [...source.querySelectorAll(`[data-install-component]`)]
                .map(option => option.getAttribute('data-install-component'));

            for (let component of components) {
                let id = `${source.dataset.source}#${component}`;
                if (ubee_modules.indexOf(id) >= 0) {
                    continue;
                }
                ubee_modules.push(id);
                await ubee_install(source.dataset.source, [component]);
            }
            let libraries = [...source.querySelectorAll(`[data-install-lib]`)]
                .map(option => option.getAttribute('data-install-lib'));

            for (let library of libraries) {
                let id = `${source.dataset.source}#${library}`;
                if (ubee_modules.indexOf(id) >= 0) {
                    continue;
                }
                ubee_modules.push(id);
                await ubee_install(source.dataset.source, [], [library]);
            }            
        }
    }
}

function ubee_mount(pid, target) {
    const lib_json = JSON.parse(localStorage.getItem(pid) || "null");
    if (!lib_json) {
        return;
    }
    const lib = ubee_deserialize(lib_json);
    target.appendChild(lib);
}

async function ubee_glass(name, namespace="ubee-glass@kuhni/core") {
    await ubee_module(...document.querySelectorAll(`[data-module]`));

    console.log("módulos disponibles");

    const libraries = JSON.parse(
        localStorage.getItem("ubee-glass/libraries") || "{}"
    );

    // console.log(libraries);

    for (let pid in libraries) {
        ubee_mount(pid, document.body);
    }

    ubee_util.select(document, `[data-glass="${name}"]`).map(glass => {
        console.log(glass);
        ubeefy(glass);
        glass.querySelectorAll(`[data-use]`).forEach(element => {
            console.log(element);
            const pid = `${namespace}#component/${element.dataset.use}`;
            console.log(pid);
            const element_json = localStorage.getItem(pid);
            if (!element_json) {
                console.warn("ubee-glass: error; invalid component", pid);
                return;
            }
            const component = ubee_deserialize(JSON.parse(element_json));
            element.parentNode.replaceChild(component, element);
            delete element.dataset.use;
            Object.entries(element.dataset).forEach(([key, value]) => {
                component.dataset[key] = value;
            });
            ubeefy(component);
        });
    });
}

function ubee_serialize(element) {
    if (!element.tagName && !element.textContent.trim()) {
        return null;
    }

    const element_json = {
        tagName: element.tagName || "#text",
        attributes: [...(element.attributes || [])]
            .map(attribute => [attribute.name, attribute.value]),
        children: [...element.childNodes].map(ubee_serialize).filter(e => !!e),
    };
    if (element_json.tagName === "#text") {
        element_json.textContent = element.textContent;
    }
    console.log(element_json);
    // for (let tag of [...element.childNodes]) {
    //     if (tag.nodeName === "#text" && tag.nodeValue.trim()) {
    //         console.log(tag.nodeValue);
    //         element_json.textContent = tag.nodeValue;
    //     }
    // }
    // if (element.tagName === "STYLE") {
    //     element_json.innerHTML = element.innerHTML;
    // }
    // if (element.children.length === 0) {
    //     element_json.textContent = element.textContent;
    // }
    return element_json;
}

function ubee_deserialize(element_json) {
    let element = element_json.tagName === "#text" ?
        document.createTextNode(element_json.textContent) :
        document.createElement(element_json.tagName);
    for (let [name, value] of element_json.attributes) {
        element.setAttribute(name, value);
    }
    for (let child_json of element_json.children) {
        element.appendChild(ubee_deserialize(child_json));
    }
    return element;
}

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