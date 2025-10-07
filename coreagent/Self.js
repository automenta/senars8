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
        core.emit('memory:maintenance:needed', { urgency: 'high' });
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
        core.emit('reasoning:trigger', { source: 'priority-task', task: context.data });
      }
    });
  }

  _getStats() {
    return {
      rules: this.core.rules.getStats(),
      memory: this.core.memory?._getStats?.() || 'not available',
      cycle: this.core.cycle?._getStats?.() || 'not available'
    };
  }
}

export default Self;