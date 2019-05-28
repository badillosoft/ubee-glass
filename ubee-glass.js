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

function ubee(template, ...selectors) {
    if (typeof template === "string") {
        const html = template;
        template = document.createElement("template");
        template.innerHTML = html;
    }

    // Get components from selectors
    const components = selectors.length === 0 ? [
        document.importNode(template.content, true).firstElementChild
    ] :
    selectors.map(selector => {
        const node = document.importNode(template.content, true);
        return node.querySelectorAll(selector);
    }).reduce((components, nodes) => {
        components.push(...nodes);
        return components;
    }, []);

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