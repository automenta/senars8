import Config from './Config.js';
import Rules from './Rules.js';
import {Messages} from './Messages.js';

class Core {
    constructor(configData = {}) {
        this.config = new Config(configData);
        this.components = new Map();
        this.messages = null;
        this.rules = new Rules(this);
        this.lifecycle = {initialized: false, running: false};
    }

    // Metaprogramming for component registration
    get [Symbol.toStringTag]() {
        return 'Core';
    }

    static createProxy(core) {
        return new Proxy(core, {
            get(target, prop) {
                // First check if it's a direct property/method
                if (prop in target) {
                    return target[prop];
                }

                // Then check components
                if (target.components && target.components.has(prop)) {
                    return target.components.get(prop);
                }

                return undefined;
            }
        });
    }

    async initialize() {
        if (this.lifecycle.initialized) return this;

        this.messages = new Messages();
        this.lifecycle.initialized = true;

        // Initialize all registered components
        for (const [name, component] of this.components) {
            if (typeof component.initialize === 'function') {
                try {
                    await component.initialize();
                } catch (error) {
                    console.error(`Error initializing component ${name}:`, error);
                }
            }
        }

        return this;
    }

    async start() {
        if (!this.lifecycle.initialized) await this.initialize();
        this.lifecycle.running = true;

        for (const [name, component] of this.components) {
            if (typeof component.start === 'function') {
                try {
                    component.start();
                } catch (error) {
                    console.error(`Error starting component ${name}:`, error);
                }
            }
        }

        return this;
    }

    async stop() {
        this.lifecycle.running = false;

        for (const [name, component] of this.components) {
            if (typeof component.stop === 'function') {
                try {
                    await component.stop();
                } catch (error) {
                    console.error(`Error stopping component ${name}:`, error);
                }
            }
        }

        return this;
    }

    register(name, component) {
        if (this.components.has(name)) {
            console.warn(`Component ${name} already registered, overwriting`);
        }
        this.components.set(name, component);

        if (this.lifecycle.initialized && typeof component.initialize === 'function') {
            try {
                component.initialize();
            } catch (error) {
                console.error(`Error initializing component ${name} during registration:`, error);
            }
        }
        return this;
    }

    get(name) {
        return this.components.get(name);
    }

    // Message system interface
    on(event, handler) {
        return this.messages?.on(event, handler);
    }

    emit(event, data) {
        return this.messages?.emit(event, data);
    }

    request(command, data) {
        return this.messages?.request(command, data);
    }

    // Rule system interface (dogfooding)
    addRule(rule) {
        return this.rules.addRule(rule);
    }

    evaluateRules(context) {
        return this.rules.evaluate(context);
    }
}

// Return a proxied version of Core to enable direct property access to components
export default function createCore(configData = {}) {
    const core = new Core(configData);
    return Core.createProxy(core);
}