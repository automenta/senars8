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
    const { focusSet = [], options = {} } = payload || {};
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
      
      const result = await this._processTask({ task, beliefs });
      if (result) {
        allDerivedTasks.push(result);
        if (allDerivedTasks.length >= maxDerivedTasks) break;
      }
    }
    
    return allDerivedTasks.slice(0, maxDerivedTasks);
  }

  async _processTask({ task, beliefs = [] }) {
    // Winnow: quickly filter strategies that can handle this task-belief combination
    const viableStrategies = this._winnowStrategies(task, beliefs);
    
    // Sort by priority
    viableStrategies.sort((a, b) => b.priority - a.priority);
    
    for (const strategy of viableStrategies) {
      for (const belief of beliefs) {
        const result = await strategy.execute(task, belief, {
          memory: this.core.memory
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
        memory: this.core.memory
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
    return Promise.resolve({ derived: null, success: false });
  }

  _abductiveReason(task, belief, context) {
    return Promise.resolve({ derived: null, success: false });
  }

  _inductiveReason(task, belief, context) {
    return Promise.resolve({ derived: null, success: false });
  }
}

export default Reasoning;