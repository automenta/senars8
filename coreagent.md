# NEXT2.md: Ultimate Combined Core/Agent Design (Simplified) - CORRECTED

## Overview

This document outlines a development plan to create a new, clean implementation of a unified Core/Agent system that
incorporates all the refactoring patterns identified. This "ultimate" design eliminates the current messy codebase and
provides a foundation for attaching subsystems in a modular way, with optimized rule evaluation and metaprogramming.

## Vision

A minimal, elegant Core/Agent that:

- Follows all identified refactoring patterns
- Provides a clean foundation for subsystem attachment
- Eliminates current architectural complexity
- Embodies the project's coding guidelines (Elegant, Consolidated, Consistent, Organized, DRY, Abstract, Modularized,
  Parameterized, Terse, Professional)
- Uses optimized rule evaluation (winnowing instead of exhaustive)
- Leverages metaprogramming for elegance
- Uses system's own facilities ("dogfooding")
- Achieves more with less through simplified identifiers and architecture

## Design Philosophy: Achieve More with Less

- **Simpler identifiers**: CycleSubsystem → Cycle, PluginManager → Plugins, MessageSystem → Messages, ReasoningEngine →
  Reasoning
- **Unified communication**: Single Messages system handling both events and commands
- **Component-based architecture**: All major functionality as Components with standardized interfaces
- **Self-optimization**: System uses its own facilities to optimize its behavior

## Development Plan

### Core Foundation with Metaprogramming

- [ ] **Create Core Agent with simplified interface**

```javascript
// core/Core.js
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
```

- [ ] **Create simplified configuration system**

```javascript
// core/Config.js
class Config {
  constructor(data = {}) {
    this._data = data;
    this._cache = new Map(); // Cache for repeated access
  }

  get(path, defaultValue) {
    const cacheKey = `${path}:${JSON.stringify(defaultValue)}`;
    if (this._cache.has(cacheKey)) {
      return this._cache.get(cacheKey);
    }

    const result = this._getNested(this._data, path, defaultValue);
    this._cache.set(cacheKey, result);
    return result;
  }

  set(path, value) {
    this._setNested(this._data, path, value);
    this._cache.clear(); // Invalidate cache
  }

  update(newData) {
    this._deepMerge(this._data, newData);
    this._cache.clear(); // Invalidate cache
  }

  getNumber(path, defaultValue = 0) {
    return this.validated(path, (v) => typeof v === 'number', defaultValue);
  }

  getString(path, defaultValue = '') {
    return this.validated(path, (v) => typeof v === 'string', defaultValue);
  }

  getBoolean(path, defaultValue = false) {
    return this.validated(path, (v) => typeof v === 'boolean', defaultValue);
  }

  validated(path, validator, defaultValue) {
    const value = this.get(path, defaultValue);
    return validator(value) ? value : defaultValue;
  }

  _getNested(obj, path, defaultValue) {
    return path.split('.').reduce((current, key) => current?.[key], obj) ?? defaultValue;
  }

  _setNested(obj, path, value) {
    const parts = path.split('.');
    const lastKey = parts.pop();
    const target = parts.reduce((current, key) => {
      if (!current[key]) current[key] = {};
      return current[key];
    }, obj);
    target[lastKey] = value;
  }

  _deepMerge(target, source) {
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        if (!target[key]) target[key] = {};
        this._deepMerge(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    }
  }
}

export default Config;
```

### Unified Communication System

- [ ] **Create unified Messages system (events and commands)**

```javascript
// core/Messages.js
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
    let index = 0;
    
    const dispatch = async (i) => {
      if (i <= index) throw new Error('next() called multiple times');
      index = i;
      
      let fn = this.middleware[i];
      if (i === this.middleware.length) fn = next;
      
      if (!fn) return data;
      
      return await fn(type, data, () => dispatch(i + 1));
    };
    
    return await dispatch(0);
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
    this.eventQueue.push({ event, data, timestamp: Date.now() });
    
    if (this.eventQueue.length > 1000) {
      this.eventQueue = this.eventQueue.slice(-500); // Keep last 500
    }
    
    const listeners = this.events.get(event);
    if (!listeners) return;

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

export { Messages };
```

### Optimized Rule System with Winnowing

- [ ] **Create optimized rule system with winnowing**

```javascript
// core/Rules.js
class Rules {
  constructor(core) {
    this.core = core;
    this.rules = [];
    this.index = new Map(); // Index rules by type for fast lookup
  }

  addRule(rule) {
    const id = rule.id || `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    rule.id = id;
    
    // Index by type for efficient filtering
    const type = rule.type || 'general';
    if (!this.index.has(type)) {
      this.index.set(type, []);
    }
    this.index.get(type).push(rule);
    
    this.rules.push(rule);
    return id;
  }

  // Winnow instead of exhaustive evaluation
  evaluate(context) {
    const results = [];
    
    // Get relevant rule types from context
    const relevantTypes = this._getRelevantTypes(context);
    
    for (const type of relevantTypes) {
      const typeRules = this.index.get(type) || [];
      
      // Winnow rules: filter by conditions first, then execute
      const matchingRules = this._winnowRules(typeRules, context);
      
      for (const rule of matchingRules) {
        const result = this._executeRule(rule, context);
        if (result) {
          results.push(result);
          
          // Short-circuit if rule says to halt evaluation
          if (rule.haltOnMatch) {
            break;
          }
        }
      }
    }
    
    return results;
  }

  _winnowRules(rules, context) {
    return rules.filter(rule => this._matchesConditions(rule, context));
  }

  _matchesConditions(rule, context) {
    if (!rule.conditions) return true;
    
    return rule.conditions.every(condition => {
      try {
        return condition(context);
      } catch (e) {
        console.error(`Condition evaluation failed:`, e);
        return false;
      }
    });
  }

  _executeRule(rule, context) {
    if (typeof rule.action === 'function') {
      try {
        return rule.action(context, this.core);
      } catch (e) {
        console.error(`Rule execution failed:`, e);
        return null;
      }
    }
    return null;
  }

  _getRelevantTypes(context) {
    const types = new Set(['general']);
    
    if (context.type) types.add(context.type);
    if (context.punctuation) types.add(context.punctuation);
    if (context.task) types.add('task');
    if (context.belief) types.add('belief');
    
    return Array.from(types);
  }

  removeRule(id) {
    this.rules = this.rules.filter(rule => rule.id !== id);
    
    for (const [type, rules] of this.index) {
      this.index.set(type, rules.filter(rule => rule.id !== id));
    }
  }

  getStats() {
    return {
      totalRules: this.rules.length,
      indexedTypes: Array.from(this.index.keys()),
      rulesByType: Object.fromEntries(
        Array.from(this.index.entries()).map(([type, rules]) => [type, rules.length])
      )
    };
  }
}

export default Rules;
```

### Component Base Class with Metaprogramming

- [ ] **Create component base class (Achieve more with less)**

```javascript
// core/Component.js
class Component {
    constructor(name, core) {
        this.name = name;
        this.core = core;
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) return;

        // Set up handlers during initialization
        if (typeof this.setupHandlers === 'function') {
            this.setupHandlers();
        }

        this.initialized = true;
    }

    async start() {
        // Run custom start logic if provided
        if (typeof this.onStart === 'function') {
            await this.onStart();
        }
    }

    async stop() {
        // Run custom stop logic if provided
        if (typeof this.onStop === 'function') {
            await this.onStop();
        }
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
```

### Memory Component

- [ ] **Create Memory component**

```javascript
// core/Memory.js
import Component from './Component.js';

class Memory extends Component {
    constructor(core) {
        super('memory', core);
        this.tasks = new Map();
        this.terms = new Map();
        this.cache = new Map();
    }

    setupHandlers() {
        this.core.messages.handle('memory:get-all', () => [...this.tasks.values()]);
        this.core.messages.handle('memory:get-by-id', (id) => this._getById(id));
        this.core.messages.handle('memory:add-task', (task) => this._addTask(task));
        this.core.messages.handle('memory:query', (query) => this._query(query));
        this.core.messages.handle('memory:get-focus-set', () => this._getFocusSet());
        this.core.messages.handle('memory:getStats', () => this._getStats());
    }

    _getById(id) {
        return this.tasks.get(id);
    }

    _addTask(task) {
        if (!task.id) task.id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
        this.tasks.set(task.id, task);
        this._invalidateCache();
        this.core.emit('task:add', task); // Use standard event
    }

    _query(query) {
        const cacheKey = JSON.stringify(query);
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        let result = [...this.tasks.values()];

        if (query.type) {
            result = result.filter(task => task.type === query.type);
        }
        if (query.priorityThreshold) {
            result = result.filter(task => task.priority >= query.priorityThreshold);
        }

        // Cache for 5 seconds
        this.cache.set(cacheKey, result);
        setTimeout(() => this.cache.delete(cacheKey), 5000);

        return result;
    }

    _getFocusSet() {
        const focusSetSize = this.core.config.getNumber('FOCUS_SET_SIZE', 20);
        const allTasks = [...this.tasks.values()];
        allTasks.sort((a, b) => (b.priority || 0) - (a.priority || 0));
        return allTasks.slice(0, focusSetSize);
    }

    _getStats() {
        return {
            tasks: this.tasks.size,
            utilization: this.tasks.size / (this.core.config.getNumber('MEMORY_CAPACITY', 1000) || 1000)
        };
    }

    _invalidateCache() {
        this.cache.clear();
    }

    async onStart() {
        // Start any background maintenance tasks
    }

    async onStop() {
        this.tasks.clear();
        this.terms.clear();
        this.cache.clear();
    }
}

export default Memory;
```

### Reasoning Component

- [ ] **Create Reasoning component with winnowing strategies**

```javascript
// core/Reasoning.js
import Component from './Component.js';

class Reasoning extends Component {
    constructor(core) {
        super('reasoning', core);
        this.strategies = new Map();
        this.strategyIndex = new Map();
        this._registerDefaultStrategies();
    }

    _registerDefaultStrategies() {
        const defaultStrategies = [
            {
                name: 'deductive',
                priority: 0.9,
                canHandle: (task, belief) => task.type === 'implication' && belief.term?.key === task.terms?.[0]?.key,
                execute: this._deductiveReason.bind(this)
            },
            {
                name: 'abductive',
                priority: 0.8,
                canHandle: (task, belief) => task.type === 'question' && belief.type === 'belief',
                execute: this._abductiveReason.bind(this)
            },
            {
                name: 'inductive',
                priority: 0.7,
                canHandle: (task, belief) => task.type === 'belief' && belief.type === 'belief',
                execute: this._inductiveReason.bind(this)
            }
        ];

        defaultStrategies.forEach(strategy => {
            this.addStrategy(strategy);
        });
    }

    addStrategy(strategy) {
        this.strategies.set(strategy.name, strategy);

        if (!this.strategyIndex.has(strategy.name)) {
            this.strategyIndex.set(strategy.name, strategy);
        }
    }

    setupHandlers() {
        // Handle both new and legacy command names for compatibility
        this.core.messages.handle('reasoning:process', (data) => this._processTask(data));
        this.core.messages.handle('reasoner:processTask', (data) => this._processTaskLegacy(data)); // Legacy compatibility
    }

    // Support legacy interface
    async _processTaskLegacy(payload) {
        const {focusSet = [], options = {}} = payload || {};
        if (!Array.isArray(focusSet)) {
            throw new Error(`Focus set must be an array, received: ${typeof focusSet}`);
        }

        if (focusSet.length === 0) return [];

        const allDerivedTasks = [];
        const maxDerivedTasks = options.maxDerivedTasks || Infinity;

        for (const task of focusSet) {
            if (allDerivedTasks.length >= maxDerivedTasks) break;

            // Get beliefs to combine with each task
            const beliefs = await this.core.request('memory:query', {
                type: 'belief',
                limit: 50
            });

            const result = await this._processTask({task, beliefs});
            if (result) {
                allDerivedTasks.push(result);
                if (allDerivedTasks.length >= maxDerivedTasks) break;
            }
        }

        return allDerivedTasks.slice(0, maxDerivedTasks);
    }

    async _processTask({task, beliefs = []}) {
        // Winnow: quickly filter strategies that can handle this task-belief combination
        const viableStrategies = this._winnowStrategies(task, beliefs);

        // Sort by priority
        viableStrategies.sort((a, b) => b.priority - a.priority);

        for (const strategy of viableStrategies) {
            for (const belief of beliefs) {
                const result = await strategy.execute(task, belief, {
                    memory: this.core.memory  // CORRECTED: Use direct property access instead of get()
                });

                if (result && result.success && result.derived) {
                    this.core.emit('task:derived', result.derived);
                    return result.derived;
                }
            }
        }

        // Self-application
        return this._applySelfStrategies(task);
    }

    _winnowStrategies(task, beliefs) {
        const results = [];

        for (const [name, strategy] of this.strategies) {
            for (const belief of beliefs) {
                if (strategy.canHandle(task, belief)) {
                    results.push(strategy);
                    break;
                }
            }

            if (strategy.canHandle(task, task)) {
                results.push(strategy);
            }
        }

        return results;
    }

    async _applySelfStrategies(task) {
        const selfStrategies = this.strategies
            .values()
            .filter(strategy => strategy.canHandle(task, task));

        for (const strategy of selfStrategies) {
            const result = await strategy.execute(task, task, {
                memory: this.core.memory  // CORRECTED: Use direct property access instead of get()
            });

            if (result && result.success && result.derived) {
                this.core.emit('task:derived', result.derived);
                return result.derived;
            }
        }

        return null;
    }

    _deductiveReason(task, belief, context) {
        if (task.type === 'implication' && task.terms?.length === 2 &&
            belief.term?.key === task.terms[0].key) {
            return Promise.resolve({
                derived: {
                    termKey: task.terms[1].key,
                    type: 'belief',
                    priority: Math.min(task.priority || 0.5, belief.priority || 0.5) * 0.8,
                    truthValue: {
                        frequency: Math.min(task.truthValue?.frequency || 0.5, belief.truthValue?.frequency || 0.5),
                        confidence: (task.truthValue?.confidence || 0.5) * (belief.truthValue?.confidence || 0.5)
                    }
                },
                success: true
            });
        }
        return Promise.resolve({derived: null, success: false});
    }

    _abductiveReason(task, belief, context) {
        return Promise.resolve({derived: null, success: false});
    }

    _inductiveReason(task, belief, context) {
        return Promise.resolve({derived: null, success: false});
    }
}

export default Reasoning;
```

### Cycle Component

- [ ] **Create Cycle component with adaptive timing**

```javascript
// core/Cycle.js
import Component from './Component.js';

class Cycle extends Component {
    constructor(core) {
        super('cycle', core);
        this.cycleCount = 0;
        this.running = false;
        this.cycleTimings = [];
        this.baseInterval = 100;
        this.adaptiveInterval = this.baseInterval;

        this.focusSetSize = this.core.config.getNumber('FOCUS_SET_SIZE', 20);
        this.priorityThreshold = this.core.config.getNumber('ACTIONABLE_GOAL_PRIORITY_THRESHOLD', 0.1);
    }

    setupHandlers() {
        this.core.messages.handle('cycle:start', () => this.start());
        this.core.messages.handle('cycle:stop', () => this.stop());
        this.core.messages.handle('cycle:get-stats', () => this._getStats());
    }

    async start() {
        this.running = true;
        while (this.running) {
            const startTime = Date.now();
            await this._executeCycle();
            const cycleDuration = Date.now() - startTime;

            this._trackCyclePerformance(cycleDuration);

            const nextInterval = this._calculateNextInterval();
            await this._wait(Math.max(0, nextInterval - cycleDuration));
        }
    }

    async _executeCycle() {
        this.core.emit('cycle:start', {
            cycle: ++this.cycleCount,
            timestamp: Date.now()
        });

        try {
            const focusSet = await this.core.request('memory:get-focus-set', {
                size: this.focusSetSize
            });

            if (focusSet?.length > 0) {
                const beliefs = await this.core.request('memory:query', {
                    type: 'belief',
                    limit: 50
                });

                for (const task of focusSet) {
                    // Use legacy command name for compatibility with existing system
                    const result = await this.core.request('reasoner:processTask', {
                        focusSet: [task] // Match existing interface
                    });

                    if (result && Array.isArray(result)) {
                        for (const derivedTask of result) {
                            await this.core.request('memory:add-task', derivedTask);
                        }
                    }
                }

                const actionableGoals = focusSet.filter(task =>
                    task.punctuation === '!' && task.priority >= this.priorityThreshold
                );

                if (actionableGoals.length > 0) {
                    for (const goal of actionableGoals) {
                        await this.core.request('action:execute', goal);
                    }
                }
            }
        } catch (error) {
            console.error('Error in cycle execution:', error);
        }

        this.core.emit('cycle:complete', {
            cycle: this.cycleCount,
            timestamp: Date.now()
        });
    }

    _trackCyclePerformance(duration) {
        this.cycleTimings.push({
            cycle: this.cycleCount,
            duration,
            timestamp: Date.now()
        });

        if (this.cycleTimings.length > 20) {
            this.cycleTimings.shift();
        }
    }

    _calculateNextInterval() {
        if (this.cycleTimings.length < 3) {
            return this.baseInterval;
        }

        const recentCycles = this.cycleTimings.slice(-5);
        const avgDuration = recentCycles.reduce((sum, cycle) => sum + cycle.duration, 0) / recentCycles.length;

        let newInterval = this.baseInterval;

        if (avgDuration > 200) {
            newInterval = Math.min(this.baseInterval * 2, this.baseInterval * 3);
        } else if (avgDuration < 50) {
            newInterval = Math.max(this.baseInterval * 0.5, this.baseInterval * 0.7);
        }

        const memoryLoad = this.core.memory?._getLoad?.() || 0;  // CORRECTED: Use direct property access instead of get()
        if (memoryLoad > 0.8) {
            newInterval *= 1.2;
        } else if (memoryLoad < 0.2) {
            newInterval *= 0.9;
        }

        this.adaptiveInterval = newInterval;
        return this.adaptiveInterval;
    }

    _getStats() {
        return {
            cycleCount: this.cycleCount,
            running: this.running,
            averageCycleDuration: this.cycleTimings.length > 0
                ? this.cycleTimings.reduce((sum, c) => sum + c.duration, 0) / this.cycleTimings.length
                : 0,
            currentInterval: this.adaptiveInterval,
            baseInterval: this.baseInterval,
            focusSetSize: this.focusSetSize,
            performanceHistory: this.cycleTimings.slice(-10)
        };
    }

    async stop() {
        this.running = false;
    }

    _wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

export default Cycle;
```

### Plugins Component

- [ ] **Create Plugins component with hot reloading**

```javascript
// core/Plugins.js
import Component from './Component.js';

class Plugins extends Component {
  constructor(core) {
    super('plugins', core);
    this.plugins = new Map();
    this.instances = new Map();
    this.metadata = new Map();
  }

  register(pluginName, pluginFactory, metadata = {}) {
    this.plugins.set(pluginName, pluginFactory);
    this.metadata.set(pluginName, {
      ...metadata,
      registeredAt: Date.now()
    });
  }

  async load(pluginName) {
    const factory = this.plugins.get(pluginName);
    if (!factory) {
      throw new Error(`Plugin ${pluginName} not found`);
    }
    
    try {
      const plugin = await factory(this.core);
      this.instances.set(pluginName, plugin);
      this.core.register(pluginName, plugin);
      
      if (typeof plugin.initialize === 'function') {
        await plugin.initialize();
      }
      
      const meta = this.metadata.get(pluginName) || {};
      meta.loadedAt = Date.now();
      meta.status = 'active';
      this.metadata.set(pluginName, meta);
      
      this.core.emit('plugin:loaded', { 
        name: pluginName, 
        metadata: meta 
      });
      
      return plugin;
    } catch (error) {
      console.error(`Failed to load plugin ${pluginName}:`, error);
      const meta = this.metadata.get(pluginName) || {};
      meta.status = 'error';
      meta.error = error.message;
      this.metadata.set(pluginName, meta);
      throw error;
    }
  }

  async unload(pluginName) {
    const plugin = this.instances.get(pluginName);
    if (plugin) {
      if (typeof plugin.stop === 'function') {
        await plugin.stop();
      }
      
      this.core.components.delete(pluginName);
      this.instances.delete(pluginName);
      
      const meta = this.metadata.get(pluginName) || {};
      meta.unloadedAt = Date.now();
      meta.status = 'unloaded';
      this.metadata.set(pluginName, meta);
      
      this.core.emit('plugin:unloaded', { name: pluginName });
    }
  }

  async reload(pluginName) {
    await this.unload(pluginName);
    return await this.load(pluginName);
  }

  getStatus(pluginName = null) {
    if (pluginName) {
      return {
        name: pluginName,
        loaded: this.instances.has(pluginName),
        metadata: this.metadata.get(pluginName) || null
      };
    }
    
    return Array.from(this.plugins.keys()).map(name => ({
      name,
      loaded: this.instances.has(name),
      metadata: this.metadata.get(name) || null
    }));
  }

  list() {
    return Array.from(this.plugins.keys());
  }

  async hotReloadAll() {
    const results = {};
    
    for (const [name, plugin] of this.instances) {
      try {
        await this.reload(name);
        results[name] = { status: 'success' };
      } catch (error) {
        results[name] = { status: 'error', error: error.message };
      }
    }
    
    return results;
  }
}

export default Plugins;
```

### Self-Management Component (Dogfooding)

- [ ] **Create Self component that uses internal facilities**

```javascript
// core/Self.js
import Component from './Component.js';

class Self extends Component {
    constructor(core) {
        super('self', core);
    }

    setupHandlers() {
        this.core.messages.handle('self:stats', () => this._getStats());
        this.core.messages.handle('self:rules:add', (rule) => this.core.addRule(rule));
    }

    async initialize() {
        if (this.initialized) return;

        this._setupSelfManagementRules();
        this.setupHandlers();
        this.initialized = true;
    }

    _setupSelfManagementRules() {
        // Rule to auto-increase cycle speed when system is underutilized
        this.core.addRule({
            id: 'adaptive-performance',
            type: 'performance',
            conditions: [
                (context) => context.type === 'cycle:stats' &&
                    context.data.averageCycleDuration < 10
            ],
            action: (context, core) => {
                const currentInterval = core.config.getNumber('CYCLE_INTERVAL_MS', 100);
                if (currentInterval > 50) {
                    core.config.set('CYCLE_INTERVAL_MS', Math.max(20, currentInterval * 0.9));
                    core.emit('system:performance:adjusted', {
                        change: 'speed-up',
                        newInterval: core.config.get('CYCLE_INTERVAL_MS')
                    });
                }
            }
        });

        // Rule to increase memory maintenance when memory pressure is high
        this.core.addRule({
            id: 'memory-pressure',
            type: 'memory',
            conditions: [
                (context) => context.type === 'memory:stats' &&
                    context.data.utilization > 0.8
            ],
            action: (context, core) => {
                core.emit('memory:maintenance:needed', {urgency: 'high'});
            }
        });

        // Rule to trigger reasoning when new high-priority tasks arrive
        this.core.addRule({
            id: 'priority-task',
            type: 'task',
            conditions: [
                (context) => context.type === 'task:added' &&
                    context.data.priority > 0.9
            ],
            action: (context, core) => {
                core.emit('reasoning:trigger', {source: 'priority-task', task: context.data});
            }
        });
    }

    _getStats() {
        return {
            rules: this.core.rules.getStats(),
            memory: this.core.memory?._getStats?.() || 'not available',  // CORRECTED: Use direct property access instead of get()
            cycle: this.core.cycle?._getStats?.() || 'not available'     // CORRECTED: Use direct property access instead of get()
        };
    }
}

export default Self;
```

### Factory with Dogfooding

- [ ] **Create factory that uses system facilities**

```javascript
// core/createCore.js
import createCoreInstance from './Core.js';  // CORRECTED: Import the function that returns proxied core
import Memory from './Memory.js';
import Reasoning from './Reasoning.js';
import Cycle from './Cycle.js';
import Self from './Self.js';
import Plugins from './Plugins.js';

export function createCore(configData = {}) {
  const core = createCoreInstance(configData);  // CORRECTED: Use the function that returns proxied core
  
  // Add default middleware that uses the core's own facilities
  core.messages?.use(async (type, data, next) => {
    const ruleResults = core.evaluateRules({ type, data });
    
    for (const result of ruleResults) {
      if (result.action && result.target) {
        core.emit(result.target, result.payload);
      }
    }
    
    const result = await next(data);
    
    if (core.config.getBoolean('DEBUG_LOGGING', false)) {
      core.emit('system:debug', { type, data, timestamp: Date.now() });
    }
    
    return result;
  });
  
  // Register all components
  core
    .register('memory', new Memory(core))
    .register('reasoning', new Reasoning(core))
    .register('cycle', new Cycle(core))
    .register('self', new Self(core))
    .register('plugins', new Plugins(core));
  
  return core;
}
```

### System Class with Self-Optimization

- [ ] **Enhanced System class with self-optimization**

```javascript
// core/System.js
import {createCore} from './createCore.js';

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
        if (this.lifecycle.initialized) return;
        await this.core.initialize();
        this.lifecycle.initialized = true;
    }

    async start() {
        if (!this.lifecycle.initialized) await this.initialize();

        const selfComponent = this.core.self;  // CORRECTED: Use direct property access instead of get()
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
        const plugins = this.core.plugins;  // CORRECTED: Use direct property access instead of get()
        if (plugins) {
            plugins.register(pluginName, pluginFactory);
        }
        return this;
    }

    async loadPlugin(pluginName) {
        const plugins = this.core.plugins;  // CORRECTED: Use direct property access instead of get()
        if (plugins) {
            return await plugins.load(pluginName);
        }
    }

    async unloadPlugin(pluginName) {
        const plugins = this.core.plugins;  // CORRECTED: Use direct property access instead of get()
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
                memory: this.core.memory?._getStats?.() || null,      // CORRECTED: Use direct property access instead of get()
                reasoning: this.core.reasoning?.getStats?.() || null, // CORRECTED: Use direct property access instead of get()
                cycle: this.core.cycle?._getStats?.() || null,       // CORRECTED: Use direct property access instead of get()
                self: this.core.self?._getStats?.() || null,         // CORRECTED: Use direct property access instead of get()
                rules: this.core.rules.getStats()
            }
        };
    }
}
```

### API Interface

- [ ] **Create main export interface**

```javascript
// core/index.js
import { System } from './System.js';
import { createCore } from './createCore.js';
import Core from './Core.js';
import Component from './Component.js';
import Config from './Config.js';

export { System, createCore, Core, Component, Config };
export default System;
```

### Integration and Compatibility Features

- [ ] **Ensure compatibility with existing SystemEvents and SystemCommands**

```javascript
// core/compat/Events.js
export const SystemEvents = Object.freeze({
  // --- System Lifecycle ---
  SYSTEM_RESET: 'system:reset',
  SYSTEM_START: 'system:start',
  SYSTEM_STOP: 'system:stop',

  // --- Task Processing ---
  TASKS_ADD: 'tasks:add',
  TASK_ADD: 'task:add',
  TASK_REMOVE: 'task:remove',
  TASK_UPDATE: 'task:update',

  // --- Term Management ---
  TERM_ADD: 'term:add',
  TERM_REMOVE: 'term:remove',
  TERM_UPDATE: 'term:update',

  // --- Memory ---
  MEMORY_ADD: 'memory:add',
  MEMORY_REMOVE: 'memory:remove',
  MEMORY_UPDATE: 'memory:update',

  // --- Cognitive Cycle ---
  CYCLE_START: 'cycle:start',
  CYCLE_STEP: 'cycle:step',
  CYCLE_COMPLETE: 'cycle:complete',
  
  // --- Metrics ---
  METRICS_UPDATE: 'metrics:update',
});

// core/compat/Commands.js
export const SystemCommands = Object.freeze({
  // --- System ---
  SYSTEM_ADD_TASKS: 'system:addTasks',
  SYSTEM_RESET: 'system:reset',
  SYSTEM_START_CYCLING: 'system:startCycling',
  SYSTEM_STOP_CYCLING: 'system:stopCycling',
  SYSTEM_GET_STATS: 'system:getStats',
  SYSTEM_GET_METRICS: 'system:getMetrics',

  // --- Reasoning (compatible with existing) ---
  REASONER_PROCESS_TASK: 'reasoner:processTask', // Keep existing name for compatibility

  // --- Memory (compatible with existing) ---
  MEMORY_GET_TASK: 'memory:getTask',
  MEMORY_GET_TERM: 'memory:getTerm',
  MEMORY_GET_ALL_TASKS: 'memory:getAllTasks',
  MEMORY_GET_ALL_TERMS: 'memory:getAllTerms',
  MEMORY_GET_HIGHEST_PRIORITY_TASKS: 'memory:getHighestPriorityTasks',
  MEMORY_GET_STATS: 'memory:getStats',

  // --- Action ---
  EXECUTE_ACTION: 'action:execute',
});
```

### Implementation Guidelines

- [ ] **Configuration and Environment Setup**
    - Create default configuration profiles for different environments (development, production, testing)
    - Implement configuration validation and error handling
    - Provide configuration schema for type safety

- [ ] **Performance Monitoring and Metrics**
    - Implement performance counters and metrics collection
    - Add memory usage tracking and garbage collection hints
    - Create performance benchmarking utilities
    - Set up monitoring dashboards and alerting

- [ ] **Error Handling and Logging**
    - Implement comprehensive error handling with context preservation
    - Add structured logging with levels (debug, info, warn, error)
    - Create error recovery mechanisms and fallback strategies
    - Implement circuit breakers for external dependencies

- [ ] **Security Considerations**
    - Validate all inputs and sanitize data
    - Implement authentication and authorization for sensitive operations
    - Add rate limiting and DoS protection
    - Secure communication channels and data storage

- [ ] **Testing Strategy**
    - Unit tests for individual components and functions
    - Integration tests for component interactions
    - Performance tests for rule evaluation and winnowing
    - End-to-end tests for complete system workflows
    - Chaos engineering tests for resilience

- [ ] **Deployment and Operations**
    - Containerization support (Docker, Kubernetes)
    - Configuration management for different environments
    - Health check endpoints and liveness probes
    - Backup and recovery procedures

### Testing and Validation

- [ ] **Create unit tests for optimized rule system**
- [ ] **Create performance tests for winnowing vs exhaustive**
- [ ] **Create unit tests for metaprogramming features**
- [ ] **Create integration tests for self-management**
- [ ] **Create performance benchmarks**
- [ ] **Create documentation**

## Benefits of This Simplified Ultimate Design

- [x] **Simplified Architecture**: Single Core class instead of complex multi-layered systems
- [x] **Simpler Identifiers**: CycleSubsystem → Cycle, PluginManager → Plugins, MessageSystem → Messages,
  ReasoningEngine → Reasoning
- [x] **Achieve More with Less**: Unified communication system handles both events and commands
- [x] **Metaprogramming**: Reduces codebase size and increases elegance
- [x] **Optimized Rule Evaluation**: Winnowing instead of exhaustive evaluation for better performance
- [x] **Self-Optimizing**: System uses its own facilities ("dogfooding") for self-management
- [x] **Component-Based**: All functionality as Components with standardized interfaces
- [x] **Clean Message Flow**: Unified Messages system with clear separation and middleware support
- [x] **Functional Patterns**: Reasoning strategies as pure functions with priority-based execution
- [x] **Explicit Dependencies**: Clear component registration and interaction
- [x] **Extensible**: Plugins component with hot reloading capabilities
- [x] **Testable**: Small, focused components that are easy to unit test
- [x] **Maintainable**: Clear separation of concerns with single responsibility
- [x] **Robust**: Built-in error handling, caching, and lifecycle management
- [x] **Adaptive**: Self-tuning performance based on system load
- [x] **Production-ready**: Logging, statistics, and monitoring capabilities
- [x] **Integrated**: Compatible with existing SystemEvents and SystemCommands

## Implementation Checklist

- [ ] Core with metaprogramming and rule system
- [ ] Simplified Config system with caching
- [ ] Optimized Rules system with winnowing
- [ ] Unified Messages system with middleware
- [ ] Component base class with standardized interfaces
- [ ] Memory component with caching and querying
- [ ] Reasoning component with winnowing strategies
- [ ] Cycle component with adaptive timing
- [ ] Plugins component with hot reloading
- [ ] Self component using internal facilities
- [ ] Factory with system facilities ("dogfooding")
- [ ] Enhanced System class with self-optimization
- [ ] Compatibility system for existing events/commands
- [ ] Complete API and export interface
- [ ] Performance monitoring and metrics
- [ ] Error handling and logging framework
- [ ] Security considerations implemented
- [ ] Comprehensive testing suite
- [ ] Deployment and operations setup