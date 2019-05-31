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
        response = await fetch(url, options.fetch || {});
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

    let download = components.length === 0;

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
            
            if (!localStorage.getItem(pid) || options.forceInstall) {
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

async function ubee_glass(name, namespace="ubee-glass@kuhni/core") {
    await ubee_module(...document.querySelectorAll(`[data-module]`));

    console.log("módulos disponibles");

    ubee_util.select(document, `[data-glass="${name}"]`).map(glass => {
        console.log(glass);
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
            glass.replaceChild(component, element);
        });
    });
}

function ubee_serialize(element) {
    const element_json = {
        tagName: element.tagName,
        attributes: [...element.attributes]
            .map(attribute => [attribute.name, attribute.value]),
        children: [...element.children].map(ubee_serialize),
    };
    console.log(element.childNodes);
    if (element.tagName === "STYLE") {
        element_json.innerHTML = element.innerHTML;
    }
    if (element.children.length === 0) {
        element_json.textContent = element.textContent;
    }
    return element_json;
}

function ubee_deserialize(element_json) {
    const element = document.createElement(element_json.tagName);
    for (let [name, value] of element_json.attributes) {
        element.setAttribute(name, value);
    }
    for (let child_json of element_json.children) {
        element.appendChild(ubee_deserialize(child_json));
    }
    if (element.tagName === "STYLE") {
        element.innerHTML = element_json.innerHTML;
    }
    if (element_json.children.length === 0) {
        element.textContent = element_json.textContent;
    }
    return element;
}