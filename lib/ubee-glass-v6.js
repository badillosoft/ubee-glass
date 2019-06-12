console.log("Ubee Glass v6.0");

document.addEventListener("#handler", event => {
    const { elements } = event.detail;

    elements.forEach(element => {
        const actionName = element.dataset.handler;

        document.querySelectorAll(`datalist[data-controller="${actionName}"]`).forEach(datalist => {

            datalist.querySelectorAll("option").forEach(option => {
                Object.entries(option.dataset || {}).forEach(([key, value]) => {
                    if (key.match(/on-?(\w*)-?(\d*)/)) {
                        let [targetName, level] = key.match(/on-?(\w*)-?(\d*)/).slice(1);

                        targetName = targetName || "self";
                        level = level || 0;

                        const actors = {
                            self: element,
                            parent: element,
                            wall: element,
                            glass: element,
                            next$parent() {
                                this.parent = this.parent.parentNode;
                            },
                            next$wall() {
                                while (this.wall && this.wall.parentNode && this.wall.parentNode.tagName !== "body" && !this.wall.parentNode.dataset.wall) {
                                    console.log(this.wall, this.wall.parentNode)
                                    this.wall = this.wall.parentNode;
                                }
                            },
                            next$glass() {
                                while (this.glass && this.glass.parent && !this.glass.parent.dataset.glass) {
                                    this.glass = this.glass.parent;
                                }
                            }
                        };


                        actors.next$parent();
                        actors.next$wall();
                        actors.next$glass();

                        for (let i = 0; i < level + 1; i++) {
                            if (actors[`next$${targetName}`]) {
                                actors[`next$${targetName}`]();
                            }
                        }
    
                        console.log(element, key, targetName, level, value, actors);
    
                        const eventName = value; 
    
                        if (option.dataset.fire) {
                            const actionName = option.dataset.fire;
        
                            element.addEventListener(eventName, localEvent => {
                                document.dispatchEvent(new CustomEvent("#fire", {
                                    detail: {
                                        container: element.parentNode,
                                        elements: [element],
                                        actionName,
                                        data: localEvent,
                                    }
                                }));
                            });
                        }
                    }
                });
            });
        });
    });
});

document.addEventListener("#fire", event => {
    const options = Object.assign({
        container: document,
        elements: null,
        data: null,
        actionName: null
    }, event.detail || {});

    options.elements = options.elements || document.querySelectorAll(`[data-fire]`);

    // console.log(options);

    options.elements.forEach(element => {
        // console.log(element);

        if (element.tagName === "OPTION") {
            return;
        }
        
        const actionName = options.actionName || element.dataset.fire;

        // console.log("actionName", actionName);

        options.container.querySelectorAll(`datalist[data-action="${actionName}"]`).forEach(datalist => {
            // console.log(datalist);
            datalist.querySelectorAll("option").forEach(option => {
                // console.log(option);

                let applicator = () => {};
                
                let target = element;

                if (option.dataset.key) {
                    let keys = option.dataset.key.split(".");
                    while (keys.length > 1) {
                        target = target[keys[0]];
                        keys = keys.slice(1);
                    }
                    applicator = value => {
                        target[keys[0]] = value;
                    };
                }
                if (option.dataset.function) {
                    let keys = option.dataset.function.split(".");
                    while (keys.length > 1) {
                        target = target[keys[0]];
                        keys = keys.slice(1);
                    }
                    applicator = value => {
                        value = value instanceof Array ? value : [value];
                        target[keys[0]](...value);
                    };
                }
                if (option.dataset.dispatch) {
                    applicator = value => {
                        target.dispatchEvent(new CustomEvent(option.dataset.dispatch, {
                            detail: value
                        }))
                    };
                }

                let value = null;
                
                if (option.dataset.value) {
                    value = option.dataset.value;
                }
                if (option.dataset.lambda) {
                    value = new Function(
                        "element", "datalist", "option", "data",
                        option.dataset.lambda.match(/return/) ?
                            option.dataset.lambda :
                            `return (${option.dataset.lambda});`
                    )(
                        element, datalist, option, options.data
                    );
                }

                // console.log(target, value);

                applicator(value);
            });
        });
    });
});

document.dispatchEvent(new CustomEvent("#fire"));
document.dispatchEvent(new CustomEvent("#handler", {
    detail: {
        elements: document.querySelectorAll(`[data-handler]`)
    }
}));