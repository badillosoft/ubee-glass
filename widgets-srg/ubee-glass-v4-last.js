async function ubee_glass(name) {
    if (!window.ubee_watch) {
        console.log("ubee-watch: load socket.io 2.2.0");
        const script_io = document.createElement("script");

        script_io.src = "https://cdnjs.cloudflare.com/ajax/libs/socket.io/2.2.0/socket.io.js";

        await new Promise(resolve => {
            script_io.addEventListener("load", resolve);
            document.head.appendChild(script_io);
        });

        console.log("ubee-watch: socket.io ready");

        window.ubee_watch = script_io;
    }
    if (!window.ubee_glass_interface_ubee_watch) {
        console.log("Ubee Glass - Ubee Watch Interface v1.0");
        const template_ubee_watch = document.createElement("template");
        template_ubee_watch.dataset.interface = "ubee-watch";
        template_ubee_watch.innerHTML = `
            <script>
                // console.warn("ubee-watch");
                // console.warn("ubee-watch");
                console.log('root',root);
                console.log('wall',wall);
                console.log('parentNode',parent.parentNode);
                console.log('parent',parent);
                
                console.log('parent',parent);
                console.log('self',self);

                const socket = io(self.dataset.uri || "http://localhost");

                let ambients = {};

                socket.on('connect', () => {
                    // console.log('ubee-watch : connected', socket.id);
                    ambients = {};

                    self.querySelectorAll("option").forEach(option => {
                        const ambient = option.dataset.ambient;
                        const key = option.dataset.key;
                        socket.emit('look:login', key, ambient, result => {
                            // console.log(result);
                            ambients[ambient] = result.token;
                        });
                    });

                });

                socket.on('ambient:state', (ambient, code, protocol) => {
                    // console.log('ubee-watch: state', ambient, code, protocol);
                    root.dispatchEvent(new CustomEvent("@watch:state", {
                        detail: { ambient, code, protocol }
                    }));
                    root.dispatchEvent(new CustomEvent(\`@watch:state#\${ambient}\`, {
                        detail: { code, protocol }
                    }));
                    root.dispatchEvent(new CustomEvent(\`@watch:state#\${ambient}:\${code}\`, {
                        detail: protocol
                    }));
                });
                
                window.look = (ambient, code, protocol) => {
                    // console.log(ambient);
                    const token = ambients[ambient];
                    if (!token) {
                        console.warn("ubee-watch: invalid ambient:token", ambient, code, protocol);
                    }
                    socket.emit('ambient:state', token, code, protocol, result => {
                        // console.log('ubee-watch: state/emit', code, result);
                    });
                };
            </script>
        `;
        document.body.appendChild(template_ubee_watch);
        window.ubee_glass_interface_ubee_watch = template_ubee_watch;
        // await new Promise(resolve => {
        //     const check = () => {
        //         if (window.ubee_watch) {
        //             resolve();
        //             return;
        //         }
        //         setTimeout(check, 100);
        //     };
        //     check();
        // });
        console.log("Ubee Watch ready.");
    }
    if (!window.ubee_glass_interface_component) {
        console.log("Ubee Glass - Component Interface v1.0");
        const template_component = document.createElement("template");
        template_component.dataset.interface = "component";
        template_component.innerHTML = `
            <script>
                const debug = self.dataset.debug === "true";

                !debug || console.log("component", self);

                for (let [variant, value] of Object.entries(self.dataset || {})) {
                    variant = variant.replace(/[A-Z]/g, s => \`-\${s.toLowerCase()}\`);
                    !debug || console.log(variant, value, self.dataset);
                    if (variant.match(/([^-]+)-([\\w-]+)-to-([^-]+)-([\\w-]+)/)) {
                        const [
                            _, 
                            source, source_event, 
                            target, target_event
                        ] = variant.match(/([^-]+)-([\\w-]+)-to-([^-]+)-([\\w-]+)/);
                        const chsrc = source_event.replace(/-?on-/g, ":")
                            .replace(/-?at-/g, "@")
                            .replace(/-?in-/g, "#");
                        const chtar = target_event.replace(/-?on-/g, ":")
                            .replace(/-?at-/g, "@")
                            .replace(/-?in-/g, "#");

                        !debug || console.log("tunnel event register:", source, chsrc, target, chtar, value);

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
                        const chsrc = source_event.replace(/-?on-/g, ":")
                            .replace(/-?at-/g, "@")
                            .replace(/-?in-/g, "#");

                        !debug || console.log("single event register:", source, chsrc, value);

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
        document.body.appendChild(template_component);
        window.ubee_glass_interface_component = template_component;
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