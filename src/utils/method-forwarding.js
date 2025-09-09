/**
 * Forwards a list of methods from a source object to a target object.
 * @param {object} source - The object to add the forwarded methods to.
 * @param {object} target - The object that has the methods to be forwarded.
 * @param {string[]} methodNames - An array of method names to forward.
 */
function forwardMethods(source, target, methodNames) {
    if (!source || !target || !Array.isArray(methodNames)) {
        return;
    }

    for (const methodName of methodNames) {
        if (typeof target[methodName] === 'function') {
            source[methodName] = (...args) => target[methodName](...args);
        }
    }
}

module.exports = {forwardMethods};
