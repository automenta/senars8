class Messages {
    constructor() {
        this.events = new Map();    // Event listeners
        this.commands = new Map();  // Command handlers
        this.middleware = [];
        this.eventQueue = [];
    }

    use(middleware) {
        this.middleware.push(middleware);
    }

    async _applyMiddleware(type, data, next) {
        if (this.middleware.length === 0) {
            return await next(data);
        }

        let index = 0;
        let nextCalled = false;

        const dispatch = async (i, prevResult) => {
            // If we've reached the end, call the final handler
            if (i >= this.middleware.length) {
                return await next(prevResult);
            }

            // Get the current middleware
            const fn = this.middleware[i];

            if (!fn) {
                return await dispatch(i + 1, prevResult);
            }

            // Create the next function for this middleware
            const nextFn = async (result) => {
                if (nextCalled) {
                    throw new Error('next() called multiple times');
                }
                nextCalled = true;
                return await dispatch(i + 1, result);
            };

            try {
                nextCalled = false;
                return await fn(type, prevResult, nextFn);
            } catch (error) {
                console.error(`Error in middleware ${i}:`, error);
                // Skip to next middleware on error
                return await dispatch(i + 1, prevResult);
            }
        };

        return await dispatch(0, data);
    }

    // Event methods
    on(event, callback) {
        if (!this.events.has(event)) {
            this.events.set(event, []);
        }
        this.events.get(event).push(callback);
    }

    async emit(event, data) {
        // Add to internal queue for potential processing
        this.eventQueue.push({event, data, timestamp: Date.now()});

        if (this.eventQueue.length > 1000) {
            this.eventQueue = this.eventQueue.slice(-500); // Keep last 500
        }

        const listeners = this.events.get(event);
        if (!listeners) return;

        try {
            const processedData = await this._applyMiddleware('event', data, async (d) => d);

            const promises = [];
            for (const callback of listeners) {
                promises.push(
                    (async () => {
                        try {
                            await callback(processedData);
                        } catch (e) {
                            console.error(`Error in event listener for ${event}:`, e);
                        }
                    })()
                );
            }

            await Promise.all(promises);
        } catch (error) {
            console.error(`Error emitting event ${event}:`, error);
        }
    }

    // Command methods
    handle(command, handler) {
        this.commands.set(command, handler);
    }

    async request(command, data) {
        const handler = this.commands.get(command);
        if (!handler) {
            console.warn(`No handler registered for command: ${command}`);
            return null;
        }

        try {
            const processedData = await this._applyMiddleware('command', data, async (d) => d);
            return await handler(processedData);
        } catch (error) {
            console.error(`Error handling command ${command}:`, error);
            return null;
        }
    }

    off(event, callback) {
        const listeners = this.events.get(event);
        if (listeners) {
            const index = listeners.indexOf(callback);
            if (index !== -1) listeners.splice(index, 1);
            if (listeners.length === 0) this.events.delete(event);
        }
    }

    clear() {
        this.events.clear();
        this.commands.clear();
        this.middleware = [];
        this.eventQueue = [];
    }
}

export {Messages};

export {Messages};