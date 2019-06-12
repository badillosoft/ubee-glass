document.addEventListener("#handler", event => {
    document.querySelectorAll(`[data-handler]`).forEach(element => {
        console.log(element);

        const actionName = element.dataset.handler;

        const actors = {
            self: element,
            parent: element,
            wall: element,
            glass: element,
            next$parent() {
                this.parent = this.parent.parentNode;
            },
            next$wall() {
                while (this.wall && this.wall.parentNode && this.wall.parentNode.tagName !== "body" && !this.wall.dataset.wall) {
                    this.wall = this.wall.parentNode;
                }
            },
            next$glass() {
                while (this.glass && this.glass.parentNode && this.glass.parentNode.tagName !== "body" && !this.glass.dataset.glass) {
                    this.glass = this.glass.parentNode;
                }
            }
        };

        actors.next$parent();
        actors.next$wall();
        actors.next$glass();

        document.querySelectorAll(`datalist[data-controller="${actionName}"]`).forEach(datalist => {
            // console.log(datalist);

            datalist.querySelectorAll("option").forEach(option => {
                Object.entries(option.dataset).forEach(([key, value]) => {
                    const rawKey = key.replace(/[A-Z]/g, s => `-${s.toLowerCase()}`);
                    console.log(key, rawKey);

                    const eventName = value;

                    if (rawKey === "continue") {
                        element.addEventListener(`@next:${value}`, async event => {
                            console.log(`@next:${value}`, event);
                            let result = null;
                            if (option.dataset.lambda) {
                                result = await new Function(
                                    "event", "self", "datalist", "option",
                                    "result",
                                    option.dataset.lambda
                                )(
                                    event, element, datalist, option, 
                                    event.detail
                                );
                                console.log("result", result);
                            }
                            if (!option.dataset.next) {
                                return;
                            }
                            element.dispatchEvent(new CustomEvent(`@next:${option.dataset.next}`, {
                                detail: result
                            }));
                        });
                    }

                    if (rawKey.match(/on-?(\w*)/)) {
                        const actorName = rawKey.match(/on-?(\w*)/)[1] || "self";
                        const actor = actors[actorName];
                        console.log(actor);

                        if (!actor) {
                            return;
                        }

                        if (option.dataset.dispatchParent) {
                            actor.addEventListener(eventName, async localEvent => {
                                console.log(eventName);
                                let value = null
                                if (option.dataset.lambda) {
                                    value = await new Function(
                                        "event", "self", "datalist", "option",
                                        "actor", "actors",
                                        option.dataset.lambda.match(/return/) ?
                                            option.dataset.lambda :
                                            `return (${option.dataset.lambda});`
                                    )(
                                        localEvent, element, datalist, option, 
                                        actor, actors
                                    );
                                }
                                element.parentNode.dispatchEvent(
                                    new CustomEvent(option.dataset.dispatchParent, {
                                        detail: value
                                    })
                                );
                            });
                            return;
                        }

                        if (option.dataset.lambda) {
                            actor.addEventListener(eventName, async localEvent => {
                                const result = await new Function(
                                    "event", "self", "datalist", "option",
                                    "actor", "actors",
                                    option.dataset.lambda.match(/return/) ?
                                        option.dataset.lambda :
                                        `return (${option.dataset.lambda});`
                                )(
                                    localEvent, element, datalist, option, 
                                    actor, actors
                                );
                                if (!option.dataset.next) {
                                    return;
                                }
                                element.dispatchEvent(new CustomEvent(`@next:${option.dataset.next}`, {
                                    detail: result
                                }));
                            });
                        }

                        if (option.dataset.fire) {
                            const actionName = option.dataset.fire;

                            actor.addEventListener(eventName, async localEvent => {
                                if (option.dataset.when) {
                                    const success = await new Function(
                                        "event", "self", "datalist", "option",
                                        "actor", "actors",
                                        option.dataset.when.match(/return/) ?
                                            option.dataset.when :
                                            `return (${option.dataset.when});`
                                    )(
                                        localEvent, element, datalist, option, 
                                        actor, actors
                                    );
                                    if (!success) {
                                        return;
                                    }
                                }

                                document.dispatchEvent(new CustomEvent("#fire", {
                                    detail: {
                                        container: document,
                                        elements: [actor],
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

    console.log(options);

    options.elements.forEach(element => {
        // console.log(element);

        if (element.tagName === "OPTION") {
            return;
        }
        
        const actionName = options.actionName || element.dataset.fire;

        console.log("actionName", actionName);

        options.container.querySelectorAll(`datalist[data-action="${actionName}"]`).forEach(datalist => {
            console.log(datalist);
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
                        }));
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
document.dispatchEvent(new CustomEvent("#handler"));