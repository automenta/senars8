# NEXT2.md: Ultimate Combined Core/Agent Design (Optimized)

## Overview
This document outlines a development plan to create a new, clean implementation of a unified Core/Agent system that incorporates all the refactoring patterns identified. This "ultimate" design eliminates the current messy codebase and provides a foundation for attaching subsystems in a modular way, with optimized rule evaluation and metaprogramming.

## Vision
A minimal, elegant Core/Agent that:
- Follows all identified refactoring patterns
- Provides a clean foundation for subsystem attachment
- Eliminates current architectural complexity
- Embodies the project's coding guidelines (Elegant, Consolidated, Consistent, Organized, DRY, Abstract, Modularized, Parameterized, Terse, Professional)
- Uses optimized rule evaluation (winnowing instead of exhaustive)
- Leverages metaprogramming for elegance
- Uses system's own facilities ("dogfooding")

## Development Plan

### Foundation Layer with Metaprogramming

- [ ] **Create CoreAgent with metaprogramming and rule system**
```javascript
// core-agent/CoreAgent.js
import SimpleConfig from './config/SimpleConfig.js';
import { RuleEngine } from './rules/RuleEngine.js';

class CoreAgent {
  constructor(configData = {}) {
    this.config = new SimpleConfig(configData);
    this.components = new Map();
    this.messageBus = null;
    this.lifecycle = { initialized: false, running: false };
    this.ruleEngine = new RuleEngine(this);
  }

  // Metaprogramming for component registration
  get [Symbol.toStringTag]() { return 'CoreAgent'; }
  
  // Proxy for dynamic component access
  static createProxy(agent) {
    return new Proxy(agent, {
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
    
    this.messageBus = this._createMessageBus();
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

  // Metaprogrammed registration with auto-initialization
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
    return this.messageBus?.on(event, handler);
  }

  emit(event, data) {
    return this.messageBus?.emit(event, data);
  }

  request(command, data) {
    return this.messageBus?.request(command, data);
  }

  // Rule system interface (dogfooding)
  addRule(rule) {
    return this.ruleEngine.addRule(rule);
  }

  evaluateRules(context) {
    return this.ruleEngine.evaluate(context);
  }

  _createMessageBus() {
    return new MessageSystem();
  }
}

export default CoreAgent;
```

- [ ] **Create optimized configuration system**
```javascript
// core-agent/config/SimpleConfig.js
class SimpleConfig {
  constructor(data = {}, schema = {}) {
    this._data = data;
    this._schema = schema;
    this._cache = new Map(); // Cache for repeated access
  }

  // Optimized access with caching
  get(path, defaultValue) {
    const cacheKey = `${path}:${JSON.stringify(defaultValue)}`;
    if (this._cache.has(cacheKey)) {
      return this._cache.get(cacheKey);
    }

    const result = this._getNested(this._data, path, defaultValue);
    this._cache.set(cacheKey, result);
    return result;
  }

  // Cache invalidation when data changes
  set(path, value) {
    this._setNested(this._data, path, value);
    this._cache.clear(); // Invalidate cache
  }

  update(newData) {
    this._deepMerge(this._data, newData);
    this._cache.clear(); // Invalidate cache
  }

  // Type-specific methods with validation
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

export default SimpleConfig;
```

### Enhanced Rule Engine with Winnowing

- [ ] **Create optimized rule engine with winnowing**
```javascript
// core-agent/rules/RuleEngine.js
class RuleEngine {
  constructor(coreAgent) {
    this.coreAgent = coreAgent;
    this.rules = [];
    this.index = new Map(); // Index rules by type for fast lookup
  }

  // Add rule with indexing
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

  // Winnow rules based on conditions (fast filtering)
  _winnowRules(rules, context) {
    return rules.filter(rule => this._matchesConditions(rule, context));
  }

  _matchesConditions(rule, context) {
    if (!rule.conditions) return true;
    
    // If all conditions match, return true (AND logic)
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
        return rule.action(context, this.coreAgent);
      } catch (e) {
        console.error(`Rule execution failed:`, e);
        return null;
      }
    }
    return null;
  }

  _getRelevantTypes(context) {
    // Based on context, determine which rule types are relevant
    const types = new Set(['general']);
    
    if (context.type) types.add(context.type);
    if (context.punctuation) types.add(context.punctuation);
    if (context.task) types.add('task');
    if (context.belief) types.add('belief');
    
    return Array.from(types);
  }

  // Remove rule
  removeRule(id) {
    this.rules = this.rules.filter(rule => rule.id !== id);
    
    // Update index
    for (const [type, rules] of this.index) {
      this.index.set(type, rules.filter(rule => rule.id !== id));
    }
  }

  // Get statistics
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
```

### Enhanced Unified Messaging with "Dogfooding"

- [ ] **Create message system that uses its own rules**
```javascript
// core-agent/MessageSystem.js
class MessageSystem {
  constructor() {
    this.listeners = new Map();
    this.handlers = new Map();
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

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  async emit(event, data) {
    // Add to internal queue for potential processing
    this.eventQueue.push({ event, data, timestamp: Date.now() });
    
    // Keep queue size reasonable
    if (this.eventQueue.length > 1000) {
      this.eventQueue = this.eventQueue.slice(-500); // Keep last 500
    }
    
    const listeners = this.listeners.get(event);
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

  handle(command, handler) {
    this.handlers.set(command, handler);
  }

  async request(command, data) {
    const handler = this.handlers.get(command);
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
    const listeners = this.listeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index !== -1) listeners.splice(index, 1);
      if (listeners.length === 0) this.listeners.delete(event);
    }
  }

  clear() {
    this.listeners.clear();
    this.handlers.clear();
    this.middleware = [];
    this.eventQueue = [];
  }
}
```

### Winnowing-Based Reasoning System

- [ ] **Create optimized reasoning with winnowing strategies**
```javascript
// core-agent/reasoning/ReasoningEngine.js
class ReasoningEngine {
  constructor(coreAgent) {
    this.coreAgent = coreAgent;
    this.strategies = new Map();
    this.strategyIndex = new Map(); // Index strategies by what they can handle
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
    
    // Index by capability for fast lookup
    if (!this.strategyIndex.has(strategy.name)) {
      this.strategyIndex.set(strategy.name, strategy);
    }
  }

  // Winnow strategies first, then execute
  async process(task, beliefs = []) {
    // Winnow: quickly filter strategies that can handle this task-belief combination
    const viableStrategies = this._winnowStrategies(task, beliefs);
    
    // Sort by priority
    viableStrategies.sort((a, b) => b.priority - a.priority);
    
    for (const strategy of viableStrategies) {
      // Try each belief with the strategy
      for (const belief of beliefs) {
        const result = await strategy.execute(task, belief, {
          memory: this.coreAgent.get('memory')
        });
        
        if (result && result.success && result.derived) {
          return result.derived;
        }
      }
    }
    
    return null;
  }

  // Winnow strategies based on capabilities
  _winnowStrategies(task, beliefs) {
    const results = [];
    
    for (const [name, strategy] of this.strategies) {
      // Check if any belief matches the strategy's capability
      for (const belief of beliefs) {
        if (strategy.canHandle(task, belief)) {
          results.push(strategy);
          break; // Found a matching belief, add strategy
        }
      }
      
      // Also check self-application
      if (strategy.canHandle(task, task)) {
        results.push(strategy);
      }
    }
    
    return results;
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
    return Promise.resolve({ derived: null, success: false });
  }

  _abductiveReason(task, belief, context) {
    // Abductive reasoning implementation
    return Promise.resolve({ derived: null, success: false });
  }

  _inductiveReason(task, belief, context) {
    // Inductive reasoning implementation
    return Promise.resolve({ derived: null, success: false });
  }
}
```

- [ ] **Update Reasoner Subsystem to use winnowing engine**
```javascript
// core-agent/subsystems/ReasonerSubsystem.js
import Subsystem from '../Subsystem.js';
import { ReasoningEngine } from '../reasoning/ReasoningEngine.js';

class ReasonerSubsystem extends Subsystem {
  constructor(coreAgent) {
    super('reasoner', coreAgent);
    this.reasoningEngine = new ReasoningEngine(coreAgent);
  }

  setupMessageHandlers() {
    this.coreAgent.handle('reasoner:process', (data) => this._processTask(data));
  }

  async _processTask({ task, beliefs = [] }) {
    // Use the winnowing reasoning engine
    const result = await this.reasoningEngine.process(task, beliefs);
    
    if (result) {
      this.coreAgent.emit('task:derived', result);
      return result;
    }
    
    return null;
  }
}
```

### Metaprogrammed Subsystem Base Class

- [ ] **Create metaprogrammed subsystem base**
```javascript
// core-agent/Subsystem.js
class Subsystem {
  constructor(name, coreAgent) {
    this.name = name;
    this.coreAgent = coreAgent;
    this.lifecycle = { initialized: false, started: false };
    
    // Metaprogramming: create helper methods from message patterns
    this._createMessageHelpers();
  }

  _createMessageHelpers() {
    // Automatically create helper methods for common message patterns
    this.getMessage = (type, defaultValue = null) => 
      this.coreAgent.request(`${this.name}:get:${type}`, { type });
      
    this.sendMessage = (type, data) => 
      this.coreAgent.emit(`${this.name}:${type}`, data);
      
    this.requestMessage = (type, data) => 
      this.coreAgent.request(`${this.name}:${type}`, data);
  }

  // Metaprogrammed lifecycle
  async initialize() {
    if (this.lifecycle.initialized) return;
    await this.preInitialize();
    await this.doInitialize();
    await this.postInitialize();
    this.lifecycle.initialized = true;
  }

  async start() {
    if (this.lifecycle.started) return;
    await this.preStart();
    await this.doStart();
    await this.postStart();
    this.lifecycle.started = true;
  }

  async stop() {
    if (!this.lifecycle.started) return;
    await this.preStop();
    await this.doStop();
    await this.postStop();
    this.lifecycle.started = false;
  }

  // Overrideable hooks
  async preInitialize() {}
  async doInitialize() { this.setupMessageHandlers(); this.setupEventListeners(); }
  async postInitialize() {}
  
  async preStart() {}
  async doStart() {}
  async postStart() {}
  
  async preStop() {}
  async doStop() {}
  async postStop() {}

  setupMessageHandlers() {}
  setupEventListeners() {}
  
  process() {}
  
  // Helper methods using core agent
  emit(event, data) {
    return this.coreAgent.emit(event, data);
  }

  request(command, data) {
    return this.coreAgent.request(command, data);
  }
}
```

### "Dogfooding" System - Using Internal Rules

- [ ] **Create system that uses its own rule system**
```javascript
// core-agent/subsystems/SelfManagementSubsystem.js
import Subsystem from '../Subsystem.js';

class SelfManagementSubsystem extends Subsystem {
  constructor(coreAgent) {
    super('self', coreAgent);
  }

  async doInitialize() {
    // Use the system's own rule engine to manage itself!
    this._setupSelfManagementRules();
    this.setupMessageHandlers();
  }

  _setupSelfManagementRules() {
    // Rule to auto-increase cycle speed when system is underutilized
    this.coreAgent.addRule({
      id: 'adaptive-performance',
      type: 'performance',
      conditions: [
        (context) => context.type === 'cycle:stats' && 
                    context.data.averageCycleDuration < 10 // Fast cycles
      ],
      action: (context, agent) => {
        const currentInterval = agent.config.getNumber('CYCLE_INTERVAL_MS', 100);
        if (currentInterval > 50) {
          agent.config.set('CYCLE_INTERVAL_MS', Math.max(20, currentInterval * 0.9));
          agent.emit('system:performance:adjusted', { 
            change: 'speed-up', 
            newInterval: agent.config.get('CYCLE_INTERVAL_MS') 
          });
        }
      }
    });

    // Rule to increase memory maintenance when memory pressure is high
    this.coreAgent.addRule({
      id: 'memory-pressure',
      type: 'memory',
      conditions: [
        (context) => context.type === 'memory:stats' && 
                    context.data.utilization > 0.8
      ],
      action: (context, agent) => {
        agent.emit('memory:maintenance:needed', { urgency: 'high' });
      }
    });

    // Rule to trigger reasoning when new high-priority tasks arrive
    this.coreAgent.addRule({
      id: 'priority-task',
      type: 'task',
      conditions: [
        (context) => context.type === 'task:added' && 
                    context.data.priority > 0.9
      ],
      action: (context, agent) => {
        agent.emit('reasoner:trigger', { source: 'priority-task', task: context.data });
      }
    });
  }

  setupMessageHandlers() {
    this.coreAgent.handle('self:stats', () => this._getStats());
    this.coreAgent.handle('self:rules:add', (rule) => this.coreAgent.addRule(rule));
  }

  _getStats() {
    return {
      rules: this.coreAgent.ruleEngine.getStats(),
      memory: this.coreAgent.get('memory')?._getStats?.() || 'not available',
      cycle: this.coreAgent.get('cycle')?._getStats?.() || 'not available'
    };
  }
}
```

### Enhanced Factory with "Dogfooding"

- [ ] **Create factory that uses its own message system**
```javascript
// core-agent/createCoreAgent.js
import CoreAgent from './CoreAgent.js';
import MemorySubsystem from './subsystems/MemorySubsystem.js';
import ReasonerSubsystem from './subsystems/ReasonerSubsystem.js';
import CycleSubsystem from './subsystems/CycleSubsystem.js';
import SelfManagementSubsystem from './subsystems/SelfManagementSubsystem.js';

export function createCoreAgent(configData = {}) {
  const agent = new CoreAgent(configData);
  
  // Add default middleware that uses the agent's own facilities
  agent.messageBus?.use(async (type, data, next) => {
    // Use the system's own rule engine to process this message
    const ruleResults = agent.evaluateRules({ type, data });
    
    // Process any rule results
    for (const result of ruleResults) {
      if (result.action && result.target) {
        agent.emit(result.target, result.payload);
      }
    }
    
    const result = await next(data);
    
    // Log using system's own facilities if enabled
    if (agent.config.getBoolean('DEBUG_LOGGING', false)) {
      agent.emit('system:debug', { type, data, timestamp: Date.now() });
    }
    
    return result;
  });
  
  // Register all subsystems
  agent
    .register('memory', new MemorySubsystem(agent))
    .register('reasoner', new ReasonerSubsystem(agent))
    .register('cycle', new CycleSubsystem(agent))
    .register('self', new SelfManagementSubsystem(agent)); // Self-management first!
  
  return agent;
}
```

### System with Self-Optimization

- [ ] **Enhanced System class with self-optimization**
```javascript
// core-agent/System.js
import { createCoreAgent } from './createCoreAgent.js';
import PluginManager from './PluginManager.js';

export class System {
  constructor(config = {}) {
    this.coreAgent = createCoreAgent(config);
    this.pluginManager = new PluginManager(this.coreAgent);
    this.lifecycle = { initialized: false, started: false };
    
    // Set up self-monitoring
    this._setupSelfMonitoring();
  }

  _setupSelfMonitoring() {
    // Listen to system events and feed them back into the rule engine
    this.coreAgent.on('cycle:stats', (data) => {
      this.coreAgent.evaluateRules({ type: 'cycle:stats', data });
    });
    
    this.coreAgent.on('memory:stats', (data) => {
      this.coreAgent.evaluateRules({ type: 'memory:stats', data });
    });
    
    this.coreAgent.on('task:added', (data) => {
      this.coreAgent.evaluateRules({ type: 'task:added', data });
    });
  }

  async initialize() {
    if (this.lifecycle.initialized) return;
    await this.coreAgent.initialize();
    this.lifecycle.initialized = true;
  }

  async start() {
    if (!this.lifecycle.initialized) await this.initialize();
    
    // Start self-optimization first
    const selfComponent = this.coreAgent.get('self');
    if (selfComponent && typeof selfComponent.start === 'function') {
      await selfComponent.start();
    }
    
    await this.coreAgent.start();
    this.lifecycle.started = true;
  }

  async stop() {
    await this.coreAgent.stop();
    this.lifecycle.started = false;
  }

  use(pluginName, pluginFactory) {
    this.pluginManager.register(pluginName, pluginFactory);
    return this;
  }

  async loadPlugin(pluginName) {
    return await this.pluginManager.load(pluginName);
  }

  async unloadPlugin(pluginName) {
    return await this.pluginManager.unload(pluginName);
  }

  register(name, component) {
    return this.coreAgent.register(name, component);
  }

  get(name) {
    return this.coreAgent.get(name);
  }

  on(event, handler) {
    return this.coreAgent.on(event, handler);
  }

  emit(event, data) {
    return this.coreAgent.emit(event, data);
  }

  request(command, data) {
    return this.coreAgent.request(command, data);
  }

  getStatus() {
    return {
      initialized: this.lifecycle.initialized,
      started: this.lifecycle.started,
      subsystems: Array.from(this.coreAgent.components.keys()),
      stats: {
        memory: this.coreAgent.get('memory')?._getStats?.() || null,
        cycle: this.coreAgent.get('cycle')?._getStats?.() || null,
        self: this.coreAgent.get('self')?._getStats?.() || null,
        rules: this.coreAgent.ruleEngine.getStats()
      }
    };
  }
}
```

### Missing Subsystem Implementations

- [ ] **Create Cycle Subsystem with adaptive timing**
```javascript
// core-agent/subsystems/CycleSubsystem.js
import Subsystem from '../Subsystem.js';

class CycleSubsystem extends Subsystem {
  constructor(coreAgent) {
    super('cycle', coreAgent);
    this.cycleCount = 0;
    this.running = false;
    this.cycleTimings = [];
    this.baseInterval = 100;
    this.adaptiveInterval = this.baseInterval;
    
    // Performance tracking
    this.focusSetSize = this.coreAgent.config.getNumber('FOCUS_SET_SIZE', 20);
    this.priorityThreshold = this.coreAgent.config.getNumber('ACTIONABLE_GOAL_PRIORITY_THRESHOLD', 0.1);
  }

  setupMessageHandlers() {
    this.coreAgent.handle('cycle:start', () => this.start());
    this.coreAgent.handle('cycle:stop', () => this.stop());
    this.coreAgent.handle('cycle:get-stats', () => this._getStats());
  }

  async doStart() {
    this.running = true;
    while (this.running) {
      const startTime = Date.now();
      await this._executeCycle();
      const cycleDuration = Date.now() - startTime;
      
      // Track performance
      this._trackCyclePerformance(cycleDuration);
      
      // Adaptive timing
      const nextInterval = this._calculateNextInterval();
      await this._wait(Math.max(0, nextInterval - cycleDuration));
    }
  }

  async _executeCycle() {
    this.coreAgent.emit('cycle:start', { 
      cycle: ++this.cycleCount,
      timestamp: Date.now()
    });

    try {
      // Get focus set from memory
      const focusSet = await this.coreAgent.request('memory:get-focus-set', { 
        size: this.focusSetSize 
      });
      
      if (focusSet?.length > 0) {
        // Get beliefs to combine with focus set for reasoning
        const beliefs = await this.coreAgent.request('memory:query', { 
          type: 'belief',
          limit: 50 // Limit for performance
        });
        
        // Process each task in focus set with reasoner
        for (const task of focusSet) {
          const result = await this.coreAgent.request('reasoner:process', { 
            task, 
            beliefs 
          });
          
          if (result) {
            // Add derived task to memory
            await this.coreAgent.request('memory:add-task', result);
          }
        }
        
        // Look for actionable goals (high priority tasks)
        const actionableGoals = focusSet.filter(task => 
          task.punctuation === '!' && task.priority >= this.priorityThreshold
        );
        
        // Execute actionable goals if any
        if (actionableGoals.length > 0) {
          for (const goal of actionableGoals) {
            await this.coreAgent.request('action:execute', goal);
          }
        }
      }
    } catch (error) {
      console.error('Error in cycle execution:', error);
      // Continue execution despite errors
    }

    this.coreAgent.emit('cycle:complete', { 
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

    // Keep only last 20 cycles for performance tracking
    if (this.cycleTimings.length > 20) {
      this.cycleTimings.shift();
    }
  }

  _calculateNextInterval() {
    if (this.cycleTimings.length < 3) {
      return this.baseInterval;
    }

    // Calculate average cycle duration
    const recentCycles = this.cycleTimings.slice(-5);
    const avgDuration = recentCycles.reduce((sum, cycle) => sum + cycle.duration, 0) / recentCycles.length;

    // Adaptive logic based on performance
    let newInterval = this.baseInterval;
    
    if (avgDuration > 200) { // If cycles are taking too long
      newInterval = Math.min(this.baseInterval * 2, this.baseInterval * 3); // Slow down
    } else if (avgDuration < 50) { // If cycles are very fast
      newInterval = Math.max(this.baseInterval * 0.5, this.baseInterval * 0.7); // Can speed up slightly
    }
    
    // Apply system-wide load considerations
    const memoryLoad = this.coreAgent.get('memory')?._getLoad?.() || 0;
    if (memoryLoad > 0.8) {
      newInterval *= 1.2; // Slow down under high memory load
    } else if (memoryLoad < 0.2) {
      newInterval *= 0.9; // Speed up under low load
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
      performanceHistory: this.cycleTimings.slice(-10) // Last 10 cycles
    };
  }

  async doStop() {
    this.running = false;
  }

  _wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

- [ ] **Create Plugin Manager with hot reloading**
```javascript
// core-agent/PluginManager.js
class PluginManager {
  constructor(coreAgent) {
    this.coreAgent = coreAgent;
    this.plugins = new Map();
    this.pluginInstances = new Map();
    this.pluginMetadata = new Map();
  }

  // Register a plugin with metadata
  register(pluginName, pluginFactory, metadata = {}) {
    this.plugins.set(pluginName, pluginFactory);
    this.pluginMetadata.set(pluginName, {
      ...metadata,
      registeredAt: Date.now()
    });
  }

  // Load and initialize a plugin
  async load(pluginName) {
    const factory = this.plugins.get(pluginName);
    if (!factory) {
      throw new Error(`Plugin ${pluginName} not found`);
    }
    
    try {
      const plugin = await factory(this.coreAgent);
      this.pluginInstances.set(pluginName, plugin);
      this.coreAgent.register(pluginName, plugin);
      
      if (typeof plugin.initialize === 'function') {
        await plugin.initialize();
      }
      
      // Update metadata with loaded status
      const meta = this.pluginMetadata.get(pluginName) || {};
      meta.loadedAt = Date.now();
      meta.status = 'active';
      this.pluginMetadata.set(pluginName, meta);
      
      this.coreAgent.emit('plugin:loaded', { 
        name: pluginName, 
        metadata: meta 
      });
      
      return plugin;
    } catch (error) {
      console.error(`Failed to load plugin ${pluginName}:`, error);
      const meta = this.pluginMetadata.get(pluginName) || {};
      meta.status = 'error';
      meta.error = error.message;
      this.pluginMetadata.set(pluginName, meta);
      throw error;
    }
  }

  // Unload a plugin
  async unload(pluginName) {
    const plugin = this.pluginInstances.get(pluginName);
    if (plugin) {
      // Give plugin chance to clean up
      if (typeof plugin.stop === 'function') {
        await plugin.stop();
      }
      
      // Remove from core agent
      this.coreAgent.components.delete(pluginName);
      this.pluginInstances.delete(pluginName);
      
      const meta = this.pluginMetadata.get(pluginName) || {};
      meta.unloadedAt = Date.now();
      meta.status = 'unloaded';
      this.pluginMetadata.set(pluginName, meta);
      
      this.coreAgent.emit('plugin:unloaded', { name: pluginName });
    }
  }

  // Reload (unload and reload) a plugin
  async reload(pluginName) {
    await this.unload(pluginName);
    return await this.load(pluginName);
  }

  // Get plugin status information
  getStatus(pluginName = null) {
    if (pluginName) {
      return {
        name: pluginName,
        loaded: this.pluginInstances.has(pluginName),
        metadata: this.pluginMetadata.get(pluginName) || null
      };
    }
    
    return Array.from(this.plugins.keys()).map(name => ({
      name,
      loaded: this.pluginInstances.has(name),
      metadata: this.pluginMetadata.get(name) || null
    }));
  }

  // Get all registered plugins
  listPlugins() {
    return Array.from(this.plugins.keys());
  }

  // Hot reload all plugins (for development)
  async hotReloadAll() {
    const results = {};
    
    for (const [name, plugin] of this.pluginInstances) {
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
```

### API and Interfaces

- [ ] **Create main export interface**
```javascript
// core-agent/index.js
import { System } from './System.js';
import { createCoreAgent } from './createCoreAgent.js';
import CoreAgent from './CoreAgent.js';
import Subsystem from './Subsystem.js';
import SimpleConfig from './config/SimpleConfig.js';

export { System, createCoreAgent, CoreAgent, Subsystem, SimpleConfig };
export default System;
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
  - Integration tests for subsystem interactions
  - Performance tests for rule evaluation and winnowing
  - End-to-end tests for complete system workflows
  - Chaos engineering tests for resilience

- [ ] **Deployment and Operations**
  - Containerization support (Docker, Kubernetes)
  - Configuration management for different environments
  - Health check endpoints and liveness probes
  - Backup and recovery procedures

### Testing and Validation

- [ ] **Create unit tests for optimized rule engine**
- [ ] **Create performance tests for winnowing vs exhaustive**
- [ ] **Create unit tests for metaprogramming features**
- [ ] **Create integration tests for self-management**
- [ ] **Create performance benchmarks**
- [ ] **Create documentation**

## Benefits of This Optimized Ultimate Design

- [x] **Simplified Architecture**: Single Core/Agent class instead of complex multi-layered systems
- [x] **Metaprogramming**: Reduces codebase size and increases elegance
- [x] **Optimized Rule Evaluation**: Winnowing instead of exhaustive evaluation for better performance
- [x] **Self-Optimizing**: System uses its own facilities ("dogfooding") for self-management
- [x] **Modular Subsystems**: Easy to add, remove, or replace subsystems
- [x] **Clean Message Flow**: Unified messaging system with clear event/command separation and middleware support
- [x] **Functional Patterns**: Reasoning strategies as pure functions with priority-based execution
- [x] **Explicit Dependencies**: Clear subsystem registration and interaction
- [x] **Extensible**: Plugin system with hot reloading capabilities
- [x] **Testable**: Small, focused components that are easy to unit test
- [x] **Maintainable**: Clear separation of concerns with single responsibility
- [x] **Robust**: Built-in error handling, caching, and lifecycle management
- [x] **Adaptive**: Self-tuning performance based on system load
- [x] **Production-ready**: Logging, statistics, and monitoring capabilities

## Implementation Checklist

- [ ] CoreAgent with metaprogramming and rule engine
- [ ] Simplified configuration system with caching
- [ ] Optimized rule engine with winnowing
- [ ] Unified message system with middleware
- [ ] Winnowing-based reasoning engine
- [ ] Metaprogrammed subsystem base class  
- [ ] Self-management subsystem using internal rules
- [ ] Factory with system facilities ("dogfooding")
- [ ] Enhanced System class with self-optimization
- [ ] Cycle subsystem with adaptive timing
- [ ] Plugin manager with hot reloading
- [ ] Complete API and export interface
- [ ] Performance monitoring and metrics
- [ ] Error handling and logging framework
- [ ] Security considerations implemented
- [ ] Comprehensive testing suite
- [ ] Deployment and operations setup