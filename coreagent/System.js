import {createCore} from './createCore.js';
import Memory from './Memory.js';
import Reasoning from './Reasoning.js';
import Cycle from './Cycle.js';
import Self from './Self.js';
import Plugins from './Plugins.js';
import LM from './lm/LM.js';
import ToolSystem from './tools/ToolSystem.js';

export class System {
    constructor(config = {}) {
        this.core = createCore(config);
        this.lifecycle = {initialized: false, started: false};

        this._setupSelfMonitoring();
    }

    _setupSelfMonitoring() {
        // Listen to system events and feed them back into the rule engine
        this.core.on('cycle:stats', (data) => {
            this.core.evaluateRules({type: 'cycle:stats', data});
        });

        this.core.on('memory:stats', (data) => {
            this.core.evaluateRules({type: 'memory:stats', data});
        });

        this.core.on('task:added', (data) => {
            this.core.evaluateRules({type: 'task:added', data});
        });
    }

    async initialize() {
        if (this.lifecycle.initialized) return this;

        // Register all core components
        this.core
            .register('memory', new Memory(this.core))
            .register('reasoning', new Reasoning(this.core))
            .register('cycle', new Cycle(this.core))
            .register('self', new Self(this.core))
            .register('plugins', new Plugins(this.core))
            .register('lm', new LM(this.core))
            .register('tools', new ToolSystem(this.core, this.core.config.get('tools', {})));

        await this.core.initialize();
        this.lifecycle.initialized = true;

        return this;
    }

    async start() {
        if (!this.lifecycle.initialized) await this.initialize();

        const selfComponent = this.core.self;
        if (selfComponent && typeof selfComponent.start === 'function') {
            await selfComponent.start();
        }

        await this.core.start();
        this.lifecycle.started = true;

        return this;
    }

    async stop() {
        await this.core.stop();
        this.lifecycle.started = false;
        return this;
    }

    use(pluginName, pluginFactory) {
        const plugins = this.core.plugins;
        if (plugins) {
            plugins.register(pluginName, pluginFactory);
        }
        return this;
    }

    async loadPlugin(pluginName) {
        const plugins = this.core.plugins;
        if (plugins) {
            return await plugins.load(pluginName);
        }
    }

    async unloadPlugin(pluginName) {
        const plugins = this.core.plugins;
        if (plugins) {
            return await plugins.unload(pluginName);
        }
    }

    register(name, component) {
        return this.core.register(name, component);
    }

    get(name) {
        return this.core.get(name);
    }

    on(event, handler) {
        return this.core.on(event, handler);
    }

    emit(event, data) {
        return this.core.emit(event, data);
    }

    request(command, data) {
        return this.core.request(command, data);
    }

    getStatus() {
        return {
            initialized: this.lifecycle.initialized,
            started: this.lifecycle.started,
            components: this.core.components ? Array.from(this.core.components.keys()) : [],
            stats: {
                memory: this.core.memory?._getStats?.() || null,
                reasoning: this.core.reasoning?.getStats?.() || null,
                cycle: this.core.cycle?._getStats?.() || null,
                self: this.core.self?._getStats?.() || null,
                rules: this.core.rules?.getStats() || {totalRules: 0},
                lm: this.core.lm?.getPipelineStatistics?.() || null,
                tools: this.core.tools?.getStatistics?.() || null
            }
        };
    }
}

// Create a factory function that matches the original createSystem interface
export function createSystem(userConfig = {}, components = {}, strategiesPath = undefined, additionalComponents = {}) {
    // We can ignore the legacy parameters since we're using the new system
    const system = new System(userConfig);
    return system;
}