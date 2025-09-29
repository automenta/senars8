/**
 * Creates a throttled function that only invokes `func` at most once per every `wait` milliseconds.
 *
 * @param {Function} func The function to throttle.
 * @param {number} wait The number of milliseconds to throttle invocations to.
 * @returns {Function} Returns the new throttled function.
 */
export const throttle = (func, wait) => {
    let timeoutId = null;
    let lastArgs = null;
    let lastThis = null;

    const later = () => {
        func.apply(lastThis, lastArgs);
        timeoutId = null;
    };

    return function (...args) {
        lastArgs = args;
        lastThis = this;
        if (!timeoutId) {
            timeoutId = setTimeout(later, wait);
        }
    };
};