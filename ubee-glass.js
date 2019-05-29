function uuid(length = 16, radix = 32) {
    let token = "";
    while (token.length < length) {
        token += Math.random().toString(radix).slice(2);
    }
    return token;
}

function ubee(...components) {
    // Process each component
    components.forEach(element => {
        element.dataset.glass = uuid();

        ubee_event(element);
        ubee_listen(element);

        element.addEventListener(":update", () => {
            ubee_attribute(element);
            ubee_style(element);
        });

        fire(element, ":update");
    });

    return components;
}

function fire(node, channel, detail) {
    node.dispatchEvent(new CustomEvent(channel, {
        detail
    }));
}

async function load(url) {
    const response = await fetch(url);

    if (!response.ok) {
        const text = await response.text();
        alert(text);
        return null;
    }

    const html = await response.text();

    const pattern_open = /<\s*template[^>]*>/g;
    const pattern_close = /<\/\s*template[^>]*>/g;

    const matches = [];

    let match_open = null;
    let match_close = null;
    let state = "close";

    do {
        match_open = pattern_open.exec(html);
        if (match_open && state === "close") {
            matches.push([match_open.index, match_open[0].length]);
            state = "open";
        }
        match_close = pattern_close.exec(html);
        if (match_close && state === "open") {
            matches.push([match_close.index, match_close[0].length]);
            state = "close";
        }
    } while (match_open);

    const pairs = matches.reduce((pairs, value, index) => {
        index % 2 !== 0 || pairs.push([value, matches[index + 1]]);
        return pairs;
    }, []);

    const components = pairs.reduce((templates, [open, close]) => {
        const tag = html.substring(open[0], open[0] + open[1]);
        templates.push([
            html.substring(open[0] + open[1], close[0]),
            (tag.match(/data-name="([^"]*)"/) || [])[1],
            (tag.match(/data-hidden="([^"]*)"/) || [])[1],
        ]);
        return templates;
    }, []).map(([template_html, name, hidden]) => {
        const template = document.createElement("template");
        template.innerHTML = template_html;
        const node = document.importNode(template.content, true);
        const div = document.createElement("div");
        [...node.childNodes].forEach(component => div.appendChild(component));
        div.dataset.name = name;
        div.hidden = hidden === "true";
        // const component = [...node.children];
        // component.dataset.name = name;
        ubee(div);
        return div;
    });

    const container = document.createElement("div");

    container.dataset.source = url;

    components.forEach(component => container.appendChild(component));

    return container;
}

function ubee_template(template, ...selectors) {
    if (typeof template === "string") {
        const html = template;
        template = document.createElement("template");
        template.innerHTML = html;
    }

    if (selectors.length === 0) {
        selectors.push(`:nth-child(1)`);
    }

    // Get components from selectors
    const components = selectors.map(selector => {
            const node = document.importNode(template.content, true);
            return node.querySelectorAll(selector);
        }).reduce((components, nodes) => {
            components.push(...nodes);
            return components;
        }, []);

    const container = document.createElement("div");

    container.dataset.template = Math.random().toString(32).slice(2);

    components.forEach(component => container.appendChild(component));

    ubee(container);

    return container;
}

function ubee_parse(key) {
    key = key.replace(/([A-Z])/g, word => `-${word.toLowerCase()}`);

    let [_, type, variant] = key.match(/(\w+)-?(.*)/);

    const instance = Number((variant.match(/-(\d+)$/) || []).slice(1)[0] || "0");

    variant = variant.replace(/-\d+$/, "");

    // console.log(variant, instance);
    
    if (variant.match(/-?at-/)) {
        variant = variant.replace(/-?at-/g, "@");
    }
    if (variant.match(/-?in-/)) {
        variant = variant.replace(/-?in-/g, ":");
    }
    if (variant.match(/-?of-/)) {
        variant = variant.replace(/-?of-/g, "#");
    }
    
    // console.log(variant, instance);

    return [type, variant, instance];
}

function ubee_event(element) {
    element.querySelectorAll(`*`).forEach(child => {
        for (let [key, value] of Object.entries(child.dataset || {})) {
            let [type, variant] = ubee_parse(key);
            
            if (type !== "event") {
                continue;
            }
            
            const events = JSON.parse(child.dataset.glassEvent || "{}");

            if (variant in events) {
                continue;
            }

            const id = uuid();

            events[variant] = id;

            child.dataset.glassEvent = JSON.stringify(events);

            const callback = e => {
                e = e instanceof CustomEvent ? e.detail : e;
                new Function(
                    "self",
                    "parent",
                    "event",
                    "fire",
                    "template",
                    value
                )(child, element, e, fire, ubee_template);
                // console.warn("fire", variant, id, child, element, e);
            };

            window.events = window.events || {};

            window.events[id] = callback;

            // console.warn("event", variant, id, child, element);

            child.addEventListener(variant, callback);
        }
    });
}

function ubee_listen(element) {
    element.querySelectorAll(`*`).forEach(child => {
        for (let [key, value] of Object.entries(child.dataset || {})) {
            let [type, variant] = ubee_parse(key);
            
            if (type !== "listen") {
                continue;
            }
            
            const listeners = JSON.parse(child.dataset.glassListen || "{}");

            if (variant in listeners) {
                continue;
            }

            const id = uuid();

            listeners[variant] = id;

            child.dataset.glassListen = JSON.stringify(listeners);

            const callback = e => {
                e = e instanceof CustomEvent ? e.detail : e;
                new Function(
                    "self",
                    "parent",
                    "event",
                    "fire",
                    "template",
                    value
                )(child, element, e, fire, ubee_template);
            };

            window.listeners = window.listeners || {};

            window.listeners[id] = callback;

            element.addEventListener(variant, callback);
        }
    });
}

function ubee_notify(element, channel, detail) {
    element.querySelectorAll(`*`).forEach(child => {
        fire(child, channel, detail);
    });
}

function ubee_attribute(element) {
    [element, ...element.querySelectorAll(`*`)].forEach(child => {
        for (let [key, value] of Object.entries(child.dataset || {})) {
            let [type, variant] = ubee_parse(key);
            if (type !== "attribute") {
                continue;
            }
            if (variant === "html") {
                variant = "innerHTML";
            }
            child[variant] = value;
        }
    });
}

function ubee_style(element) {
    [element, ...element.querySelectorAll(`*`)].forEach(child => {
        for (let [key, value] of Object.entries(child.dataset || {})) {
            let [type, variant] = ubee_parse(key);
            if (type === "style") {
                child.style[variant] = value;
            }
        }
    });
}