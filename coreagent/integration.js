import { createIntegratedSystem } from './compatibility.js';

export class CoreAdapter {
  constructor(oldCore) {
    this.oldCore = oldCore;
    this.newCore = null;
  }

  async connectToNewSystem(config = {}) {
    this.newCore = await createIntegratedSystem(config, { 
      integrateWithExisting: true, 
      existingCore: this.oldCore 
    });
    return this.newCore;
  }

  convertOldTask(oldTask) {
    return {
      id: oldTask.id || `migrated_${Date.now()}`,
      content: oldTask.term?.key || oldTask.content || oldTask.toString(),
      type: this._inferType(oldTask),
      priority: oldTask.priority || 0.5,
      truthValue: oldTask.truthValue || { frequency: 0.5, confidence: 0.9 },
      timestamp: Date.now(),
      createdAt: new Date().toISOString()
    };
  }

  _inferType(oldTask) {
    return oldTask.punctuation === '!' ? 'goal' : 
           oldTask.punctuation === '?' ? 'question' : 'belief';
  }

  async syncMemory() {
    if (!this.oldCore?.memory || !this.newCore?.core?.memory) return;
    const oldTasks = this.oldCore.memory.getAllTasks?.() || [];
    for (const oldTask of oldTasks) {
      const newTask = this.convertOldTask(oldTask);
      await this.newCore.core.memory._addTask(newTask);
    }
  }
}

export const migrateConfig = oldConfig => ({
  ...(oldConfig.FOCUS_SET_SIZE && {FOCUS_SET_SIZE: oldConfig.FOCUS_SET_SIZE}),
  ...(oldConfig.ACTIONABLE_GOAL_PRIORITY_THRESHOLD && {ACTIONABLE_GOAL_PRIORITY_THRESHOLD: oldConfig.ACTIONABLE_GOAL_PRIORITY_THRESHOLD}),
  ...(oldConfig.CYCLE_INTERVAL_MS && {CYCLE_INTERVAL_MS: oldConfig.CYCLE_INTERVAL_MS}),
  ...(oldConfig.MEMORY_CAPACITY && {MEMORY_CAPACITY: oldConfig.MEMORY_CAPACITY})
});

export class AgentWrapper {
  constructor(oldAgent) {
    this.oldAgent = oldAgent;
    this.newSystem = null;
  }

  async initializeNewSystem(config = {}) {
    const {System} = await import('./System.js');
    this.newSystem = new System(config);
    await this.newSystem.initialize();
    return this.newSystem;
  }

  async executeAction(action) {
    return this.newSystem 
      ? await this.newSystem.request('action:execute', action)
      : await this.oldAgent.executeAction?.(action);
  }

  getCombinedState() {
    const oldState = this.oldAgent.getAgentState?.() || {};
    const newState = this.newSystem ? this.newSystem.getStatus() : {};
    
    return {
      old: oldState,
      new: newState,
      combined: {
        tasks: [...(oldState.tasks || []), ...(newState.stats?.memory?.tasks || [])],
        beliefs: [...(oldState.beliefs || []), ...(newState.stats?.memory?.tasks?.filter(t => t.type === 'belief') || [])],
        goals: [...(oldState.goals || [])],
        questions: [...(oldState.questions || [])]
      }
    };
  }
}

export class MigrationHelper {
  constructor(oldSystem, newSystem) {
    this.oldSystem = oldSystem;
    this.newSystem = newSystem;
  }

  async migrateComponent(componentName) {
    switch(componentName) {
      case 'memory': return await this._migrateMemory();
      case 'reasoning': return await this._migrateReasoning();
      case 'cycle': return await this._migrateCycle();
      default: throw new Error(`Unknown component: ${componentName}`);
    }
  }

  async _migrateMemory() {
    const oldMemory = this.oldSystem.memory;
    const newMemory = this.newSystem.core.memory;
    if (!oldMemory || !newMemory) return false;
    
    const tasks = oldMemory.getAllTasks?.() || oldMemory.tasks || [];
    for (const task of tasks) {
      const newTask = {
        id: task.id || `migrated_${Date.now()}`,
        content: task.content || task.term?.key || task.toString(),
        type: this._inferTaskType(task),
        priority: task.priority || 0.5,
        truthValue: task.truthValue || { frequency: 0.5, confidence: 0.9 }
      };
      await newMemory._addTask(newTask);
    }
    return true;
  }

  async _migrateReasoning() {
    if (this.oldSystem.eventBus && this.newSystem.core.reasoning) {
      this.oldSystem.eventBus.on('reasoning:required', async (data) => 
        await this.newSystem.request('reasoner:processTask', data)
      );
    }
    return true;
  }

  async _migrateCycle() {
    if (this.oldSystem.cycle && this.newSystem.core.cycle) {
      this.newSystem.on('cycle:start', (data) => 
        this.oldSystem.eventBus?.emit?.('cycle:start', data)
      );
    }
    return true;
  }

  _inferTaskType(task) {
    return task.punctuation === '!' ? 'goal' : 
           task.punctuation === '?' ? 'question' : 'belief';
  }
}

export class UnifiedEventBus {
  constructor(oldEventBus = null, newSystem = null) {
    this.oldEventBus = oldEventBus;
    this.newSystem = newSystem;
  }

  on(event, handler) {
    this.oldEventBus?.on?.(event, handler);
    this.newSystem?.on?.(event, handler);
  }

  emit(event, data) {
    this.oldEventBus?.emit?.(event, data);
    this.newSystem?.emit?.(event, data);
  }

  off(event, handler) {
    this.oldEventBus?.off?.(event, handler);
  }
}