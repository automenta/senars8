# CoreAgent Examples

Here are practical examples of how to use the CoreAgent system.

## Basic Usage

```javascript
import { System } from './coreagent/System.js';
import { createTask, createBelief, createGoal } from './coreagent/utils.js';

// Create and initialize a new system
const system = new System({
  FOCUS_SET_SIZE: 20,
  ACTIONABLE_GOAL_PRIORITY_THRESHOLD: 0.1
});

await system.initialize();
await system.start();

// Add a belief to memory
const belief = createBelief('The sky is blue', 0.8);
await system.core.memory._addTask(belief);

// Create and add a goal
const goal = createGoal('Find out why the sky is blue', 0.9);
await system.core.memory._addTask(goal);

// Process tasks through reasoning
const focusSet = system.core.memory._getFocusSet();
const result = await system.request('reasoner:processTask', { focusSet });

console.log('Reasoning result:', result);
```

## Event Handling

```javascript
// Listen for new tasks being added
system.on('task:add', (task) => {
  console.log('New task added:', task);
});

// Listen for system cycles
system.on('cycle:start', (cycleInfo) => {
  console.log('Cycle started:', cycleInfo.cycle);
});
```

## Custom Strategies

```javascript
// Add a custom reasoning strategy
const customStrategy = {
  name: 'custom-reasoning',
  priority: 0.9,
  canHandle: (task, belief) => task.content.includes('custom'),
  execute: (task, belief) => ({
    success: true,
    derived: createBelief(`Derived from ${task.content}`)
  })
};

system.core.reasoning.addStrategy(customStrategy);
```

## Plugin System

```javascript
// Register a custom plugin
system.use('customPlugin', async (core) => {
  return {
    name: 'CustomPlugin',
    async initialize() {
      console.log('Plugin initialized');
      // Set up event listeners
      core.on('task:add', (task) => {
        console.log('Plugin observed new task:', task);
      });
    },
    async start() {
      console.log('Plugin started');
    },
    async stop() {
      console.log('Plugin stopped');
    }
  };
});

// Load the plugin
await system.loadPlugin('customPlugin');
```

## Rule-Based Behavior

```javascript
// Add a custom rule for self-optimization
system.core.addRule({
  type: 'performance',
  conditions: [
    (context) => context.type === 'cycle:stats' && context.data.averageCycleDuration < 10
  ],
  action: (context, core) => {
    console.log('System is underutilized, could increase activity');
    core.emit('system:optimize', { suggestion: 'increase_activity' });
  }
});
```

## Querying Memory

```javascript
// Query memory for specific task types
const beliefs = await system.request('memory:query', { type: 'belief' });
console.log('Beliefs in memory:', beliefs);

// Get high-priority tasks
const highPriorityTasks = await system.request('memory:query', { 
  priorityThreshold: 0.8 
});
console.log('High priority tasks:', highPriorityTasks);

// Get focus set
const focusSet = system.core.memory._getFocusSet();
console.log('Current focus set:', focusSet);
```

## System Monitoring

```javascript
// Get system status
const status = system.getStatus();
console.log('System status:', status);

// Get memory stats
const memoryStats = await system.request('memory:getStats');
console.log('Memory stats:', memoryStats);

// Get reasoning stats
const reasoningStats = system.core.reasoning.getStats();
console.log('Reasoning stats:', reasoningStats);
```