document.addEventListener("#handler", event => {
    document.querySelectorAll(`[data-handler]`).forEach(element => {
        // console.log(element);

        const actionName = element.dataset.handler;

        document.querySelectorAll(`datalist[data-controller="${actionName}"]`).forEach(datalist => {
            // console.log(datalist);

            datalist.querySelectorAll("option").forEach(option => {
                if (option.dataset.on) {
                    // console.log(option);

                    const eventName = option.dataset.on; 

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
document.dispatchEvent(new CustomEvent("#handler"));