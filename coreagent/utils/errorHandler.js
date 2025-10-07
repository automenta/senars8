const createUnifiedErrorHandler = (namespace) => {
    const handleError = (error, context = {}) => {
        const errorInfo = {
            namespace,
            message: error.message,
            stack: error.stack,
            context,
            timestamp: Date.now()
        };

        console.error(`[${namespace}] Error:`, errorInfo);
        return errorInfo;
    };

    const wrapAsync = (fn, context = {}) => {
        return async (...args) => {
            try {
                return await fn(...args);
            } catch (error) {
                handleError(error, {...context, args: args.length});
                throw error;
            }
        };
    };

    const wrapSync = (fn, context = {}) => {
        return (...args) => {
            try {
                return fn(...args);
            } catch (error) {
                handleError(error, {...context, args: args.length});
                throw error;
            }
        };
    };

    return {handleError, wrapAsync, wrapSync};
};

export {createUnifiedErrorHandler};