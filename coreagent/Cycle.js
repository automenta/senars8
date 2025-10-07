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
    
    const memoryLoad = this.core.memory?._getLoad?.() || 0;
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