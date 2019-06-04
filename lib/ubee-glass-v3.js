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
    } catch (error) {
        console.warn(`ubee-glass/error`, error);
        return;
    }

    const html = await response.text();

    const container = document.createElement("div");

    container.innerHTML = html;

    return container;
}

async function ubee_install(url, components = [], libraries = [],
    namespace = "ubee-glass@kuhni/core", options = {}) {
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

async function ubee_glass(name, namespace = "ubee-glass@kuhni/core") {
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

function ubeefy(self) {
    if (self.tagName === "DATALIST") {
        return;
    }

    if (self.dataset.lib) {
        const library = self.dataset.lib;
        const libraries = JSON.parse(localStorage.getItem(`ubee-glass-lib`));
        if (library in libraries) {
            return document.body.querySelector(`[data-lib="library"]`);
        }
        libraries[library] = new Date().toISOString();
        localStorage.setItem(`ubee-glass-lib`, JSON.stringify(libraries));
    }

    if (self.dataset.test) {
        self.hidden = false;
    }

    self.dataset.id = Math.random().toString(32).slice(2);

    let instance = 0;
    (self.dataset.extend || "").split(/\s*\|\s*/).forEach(name =>
        document.querySelectorAll(`[data-interface="${name.trim()}"]`).forEach(datalist =>
            datalist.querySelectorAll("option").forEach(option =>
                Object.entries(option.dataset || {}).forEach(
                    ([key, value]) => self.dataset[`${key}-${++instance}`] = value
                )
            )
        )
    );

    let root = self.parentNode;
    let wall = self.parentNode;
    let parent = self.parentNode;

    while (root && root.dataset && !root.dataset.glass) {
        root = root.parentNode;
    }

    while (wall && wall.dataset && !wall.dataset.component) {
        wall = wall.parentNode;
    }

    root = root || document.body;
    wall = wall || root;
    parent = parent || self;

    Object.entries(self.dataset).forEach(([key, value]) => {

        const chain = key.replace(/[A-Z]/g, string => `-${string.toLowerCase()}`);

        function eventHandler(pattern, source, target) {
            if (chain.match(pattern)) {
                console.log(pattern, source, target);
                let channel = ((chain.match(pattern) || [])[1] || "").replace(/-\d+$/, "");
                channel = channel.replace(/-?on-/g, ":")
                    .replace(/-?in-/g, "#")
                    .replace(/-?at-/g, "@");
                console.log("channel", chain, channel);
                const [cha, chb] = channel.split(/-to-?/);
                console.log(cha, chb);
                source.addEventListener(cha, async event => {
                    const detail = await new Function(
                        "id",
                        "self",
                        "parent",
                        "wall",
                        "root",
                        "event",
                        "data",
                        "cancel",
                        "channel",
                        `return (${value});`
                    )(                       
                        self.dataset.id,
                        self,
                        parent,
                        wall,
                        root,
                        event,
                        event instanceof CustomEvent ? event.detail : event,
                        () => ({ "@cancel": true }),
                        channel
                    );
                    
                    if (detail && typeof detail === "object" && detail["@cancel"]) {
                        return;
                    } 

                    target.dispatchEvent(new CustomEvent(chb, { detail }));
                    console.log(source, cha, target, chb, detail);
                });
            }
        }

        eventHandler(/^event-and-emit-?(.*)/, self, self);
        eventHandler(/^event-and-fire-?(.*)/, self, root);
        eventHandler(/^event-and-watch-?(.*)/, self, wall);
        eventHandler(/^event-and-notify-?(.*)/, self, parent);

        eventHandler(/^emit-and-fire-?(.*)/, self, root);
        eventHandler(/^emit-and-watch-?(.*)/, self, wall);
        eventHandler(/^emit-and-notify-?(.*)/, self, parent);
        eventHandler(/^emit-and-emit-?(.*)/, self, self);

        eventHandler(/^join-and-fire-?(.*)/, parent, root);
        eventHandler(/^join-and-watch-?(.*)/, parent, wall);
        eventHandler(/^join-and-notify-?(.*)/, parent, parent);
        eventHandler(/^join-and-emit-?(.*)/, parent, self);

        eventHandler(/^look-and-fire-?(.*)/, wall, root);
        eventHandler(/^look-and-watch-?(.*)/, wall, wall);
        eventHandler(/^look-and-notify-?(.*)/, wall, parent);
        eventHandler(/^look-and-emit-?(.*)/, wall, self);

        eventHandler(/^listen-and-fire-?(.*)/, root, root);
        eventHandler(/^listen-and-watch-?(.*)/, root, wall);
        eventHandler(/^listen-and-notify-?(.*)/, root, parent);
        eventHandler(/^listen-and-emit-?(.*)/, root, self);

        if (chain.match(/^subscribe-?(.*)/)) {
            let channel = ((chain.match(/^subscribe-?(.*)/) || [])[1] || "").replace(/-\d+$/, "");
            channel = channel.replace(/-?on-/g, ":")
                .replace(/-?in-/g, "#")
                .replace(/-?at-/g, "@");
            self.addEventListener(channel, event => {
                new Function(
                    "id",
                    "self",
                    "parent",
                    "wall",
                    "root",
                    "event",
                    "data",
                    "cancel",
                    "channel",
                    value
                )(
                    self.dataset.id,
                    self,
                    parent,
                    wall,
                    root,
                    event,
                    event instanceof CustomEvent ? event.detail : event,
                    () => ({ "@cancel": true }),
                    channel
                );
            })
        }
    });



    self.querySelectorAll(":scope > *").forEach(child => ubeefy(child, root || self));

    self.dispatchEvent(new CustomEvent(":update", {
        detail: null
    }));

    return self;
}