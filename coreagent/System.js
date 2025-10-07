import { createCore } from './createCore.js';

export class System {
  constructor(config = {}) {
    this.core = createCore(config);
    this.lifecycle = { initialized: false, started: false };
    
    this._setupSelfMonitoring();
  }

  _setupSelfMonitoring() {
    // Listen to system events and feed them back into the rule engine
    this.core.on('cycle:stats', (data) => {
      this.core.evaluateRules({ type: 'cycle:stats', data });
    });
    
    this.core.on('memory:stats', (data) => {
      this.core.evaluateRules({ type: 'memory:stats', data });
    });
    
    this.core.on('task:added', (data) => {
      this.core.evaluateRules({ type: 'task:added', data });
    });
  }

  async initialize() {
    if (this.lifecycle.initialized) return;
    await this.core.initialize();
    this.lifecycle.initialized = true;
  }

  async start() {
    if (!this.lifecycle.initialized) await this.initialize();
    
    const selfComponent = this.core.self;
    if (selfComponent && typeof selfComponent.start === 'function') {
      await selfComponent.start();
    }
    
    await this.core.start();
    this.lifecycle.started = true;
  }

  async stop() {
    await this.core.stop();
    this.lifecycle.started = false;
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
      components: Array.from(this.core.components.keys()),
      stats: {
        memory: this.core.memory?._getStats?.() || null,
        reasoning: this.core.reasoning?.getStats?.() || null,
        cycle: this.core.cycle?._getStats?.() || null,
        self: this.core.self?._getStats?.() || null,
        rules: this.core.rules.getStats()
      }
    };
  }
}