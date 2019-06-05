async function ubee_glass(name) {
    if (!window.ubee_glass_interface_component) {
        console.log("Ubee Glass - Component Interface v1.0");

        const template = document.createElement("template");
        template.dataset.interface = "component";
        template.innerHTML = `
            <script>
                // console.log("component", self);

                for (let [variant, value] of Object.entries(self.dataset || {})) {
                    variant = variant.replace(/[A-Z]/g, s => \`-\${s.toLowerCase()}\`);
                    // console.log(variant, value, self.dataset);
                    if (variant.match(/([^-]+)-([\\w-]+)-to-([^-]+)-([\\w-]+)/)) {
                        const [
                            _, 
                            source, source_event, 
                            target, target_event
                        ] = variant.match(/([^-]+)-([\\w-]+)-to-([^-]+)-([\\w-]+)/);
                        const chsrc = source_event.replace(/^on-/, ":")
                            .replace(/^at-/, "@")
                            .replace(/^in-/, "#");
                        const chtar = target_event.replace(/^on-/, ":")
                            .replace(/^at-/, "@")
                            .replace(/^in-/, "#");

                        // console.log("tunnel event register:", source, chsrc, target, chtar, value);

                        const nodes = { self, parent, wall, root };
                        nodes[source].addEventListener(chsrc, async event => {
                            const result = await new Function(
                                "self",
                                "parent",
                                "wall",
                                "root",
                                "cancel",
                                \`return (\${value});\`
                            )(self, parent, wall, root,
                                () => "@@cancel"    
                            );
                            if (result !== "@@cancel") {
                                nodes[target].dispatchEvent(new CustomEvent(chtar, { 
                                    detail: result
                                }));
                            }
                        });
                    }
                    if (variant.match(/([^-]+)-([\\w-]+)/)) {
                        const [
                            _, 
                            source, source_event
                        ] = variant.match(/([^-]+)-([\\w-]+)/);
                        const chsrc = source_event.replace(/^on-/, ":")
                            .replace(/^at-/, "@")
                            .replace(/^in-/, "#");

                        // console.log("single event register:", source, chsrc, value);

                        const nodes = { self, parent, wall, root };
                        nodes[source].addEventListener(chsrc, async event => {
                            const result = await new Function(
                                "self",
                                "parent",
                                "wall",
                                "root",
                                "event",
                                value
                            )(self, parent, wall, root, event);
                        });
                    }
                }
            </script>
        `;
        document.body.appendChild(template);
        window.ubee_glass_interface_component = template;
    }
    document.querySelectorAll(`[data-glass="${name}"]`).forEach(glass => {
        glass.querySelectorAll("*").forEach(element => {
            element.dataset.extend = `component | ${ element.dataset.extend || "" }`;
        });
        glass.querySelectorAll(`[data-extend]`).forEach(element => {
            const ifcs = element.dataset.extend.split(/\s*\|\s*/)
                .filter(ifc => !!ifc.trim())
                .map(ifc => `[data-interface="${ifc}"]`);
            // console.log(element, ifcs.join(","));
            document.querySelectorAll(ifcs.join(",")).forEach(template => {
                // console.log(template);
                const node = document.importNode(template.content, true);
                node.querySelectorAll("style").forEach(style => {
                    element.prepend(style);
                });
                node.querySelectorAll("script").forEach(script => {
                    const code = script.innerHTML;
                    new Function(
                        "self",
                        "parent",
                        "wall",
                        "root",
                        //...,
                        code
                    )(
                        element,
                        element.parentNode,
                        null,
                        glass
                        // ...
                    );
                });
            });
        });
    });
}