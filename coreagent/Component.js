class Component {
    constructor(name, core) {
        this.name = name;
        this.core = core;
        this.initialized = false;
        this.started = false;
    }

    async initialize() {
        if (this.initialized) return this;

        // Set up handlers during initialization
        if (typeof this.setupHandlers === 'function') {
            try {
                this.setupHandlers();
            } catch (error) {
                console.error(`Error setting up handlers for component ${this.name}:`, error);
            }
        }

        this.initialized = true;
        return this;
    }

    async start() {
        if (this.started) return this;

        // Run custom start logic if provided
        if (typeof this.onStart === 'function') {
            try {
                await this.onStart();
            } catch (error) {
                console.error(`Error starting component ${this.name}:`, error);
            }
        }

        this.started = true;
        return this;
    }

    async stop() {
        // Run custom stop logic if provided
        if (typeof this.onStop === 'function') {
            try {
                await this.onStop();
            } catch (error) {
                console.error(`Error stopping component ${this.name}:`, error);
            }
        }

        this.started = false;
        return this;
    }

    // Helper methods using core
    emit(event, data) {
        return this.core.emit(event, data);
    }

    request(command, data) {
        return this.core.request(command, data);
    }
}

export default Component;