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