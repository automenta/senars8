import Config from './Config.js';
import Rules from './Rules.js';
import { Messages } from './Messages.js';

class Core {
  constructor(configData = {}) {
    this.config = new Config(configData);
    this.components = new Map();
    this.messages = null;
    this.rules = new Rules(this);
    this.lifecycle = { initialized: false, running: false };
  }

  // Metaprogramming for component registration
  get [Symbol.toStringTag]() { return 'Core'; }
  
  static createProxy(core) {
    return new Proxy(core, {
      get(target, prop) {
        if (target.components.has(prop)) {
          return target.components.get(prop);
        }
        return target[prop];
      }
    });
  }

  async initialize() {
    if (this.lifecycle.initialized) return;
    
    this.messages = new Messages();
    this.lifecycle.initialized = true;
    
    // Initialize all registered components
    for (const [name, component] of this.components) {
      if (typeof component.initialize === 'function') {
        await component.initialize();
      }
    }
  }

  async start() {
    if (!this.lifecycle.initialized) await this.initialize();
    this.lifecycle.running = true;
    
    for (const [name, component] of this.components) {
      if (typeof component.start === 'function') {
        await component.start();
      }
    }
  }

  async stop() {
    this.lifecycle.running = false;
    
    for (const [name, component] of this.components) {
      if (typeof component.stop === 'function') {
        await component.stop();
      }
    }
  }

  register(name, component) {
    if (this.components.has(name)) {
      console.warn(`Component ${name} already registered, overwriting`);
    }
    this.components.set(name, component);
    
    if (this.lifecycle.initialized && typeof component.initialize === 'function') {
      component.initialize();
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
export default function createCoreInstance(configData = {}) {
  const core = new Core(configData);
  return Core.createProxy(core);
}