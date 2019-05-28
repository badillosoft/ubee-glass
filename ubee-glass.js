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
        templates.push([
            html.substring(open[0] + open[1], close[0]),
            (html.substring(open[0], open[0] + open[1]).match(/data-name="([^"]*)"/) || [])[1]
        ]);
        return templates;
    }, []).map(([template_html, name]) => {
        const template = document.createElement("template");
        template.innerHTML = template_html;
        const node = document.importNode(template.content, true);
        const component = node.firstElementChild;
        component.dataset.name = name;
        return component;
    });

    const div = document.createElement("div");

    div.dataset.source = url;

    components.forEach(component => div.appendChild(component));

    return div;
}

function fire(node, channel, detail) {
    node.dispatchEvent(new CustomEvent(channel, {
        detail
    }));
}

function ubee_parse(key) {
    key = key.replace(/([A-Z])/g, word => `-${word.toLowerCase()}`);

    let [_, type, variant] = key.match(/(\w+)-?(.*)/);

    const instance = Number((variant.match(/-(\d+)$/) || []).slice(1)[0] || "0");

    variant = variant.replace(/-\d+$/, "");

    if (variant.match(/^at-/)) {
        variant = variant.replace(/^at-/, "@");
    } else if (variant.match(/^in-/)) {
        variant = variant.replace(/^in-/, ":");
    } else if (variant.match(/^of-/)) {
        variant = variant.replace(/^of-/, "#");
    }

    return [type, variant, instance];
}

function ubee_event(element) {
    element.querySelectorAll(`*`).forEach(child => {
        for (let [key, value] of Object.entries(child.dataset || {})) {
            let [type, variant] = ubee_parse(key);
            if (type !== "event") {
                continue;
            }
            child.addEventListener(variant, e => {
                e = e instanceof CustomEvent ? e.detail : e;
                new Function(
                    "self",
                    "parent",
                    "event",
                    "fire",
                    value
                )(child, element, e, fire);
            });
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
            element.addEventListener(variant, e => {
                e = e instanceof CustomEvent ? e.detail : e;
                new Function(
                    "self",
                    "parent",
                    "event",
                    "fire",
                    value
                )(child, element, e, fire);
            });
        }
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

function ubee_template(template, ...selectors) {
    if (typeof template === "string") {
        const html = template;
        template = document.createElement("template");
        template.innerHTML = html;
    }

    // Get components from selectors
    const components = selectors.length === 0 ?
        [document.importNode(template.content, true).firstElementChild]
        :
        selectors.map(selector => {
            const node = document.importNode(template.content, true);
            return node.querySelectorAll(selector);
        }).reduce((components, nodes) => {
            components.push(...nodes);
            return components;
        }, []);

    return ubee(...components);
}

function ubee(...components) {
    // Process each component
    components.forEach(element => {
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