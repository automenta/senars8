# SeNARS API Reference 📚

Core interfaces and usage patterns.

---

## System API

### Creating a System

```javascript
import { createSystem } from 'senars';

const system = await createSystem(config, components);
```

### System Methods

| Method | Description |
|--------|-------------|
| `initialize(constitutionTasks)` | Initialize with core principles |
| `addTasks(tasks)` | Add new cognitive tasks |
| `runCycle()` | Execute one reasoning cycle |
| `start(maxCycles)` | Start continuous operation |
| `stop()` | Stop system execution |
| `reset()` | Clear all memory and state |

---

## Core Classes

### Term 🔤

Immutable concept representation.

```javascript
import { Term } from 'senars';

const term = new Term('cat');
const complexTerm = new Term('(cat --> animal)');
```

**Properties:**
- `key` - Unique identifier
- `embedding` - Semantic vector
- `complexity` - Structural complexity
- `type` - Term type (atomic, inheritance, etc.)

### Task 🎯

Stateful cognitive unit.

```javascript
import { Task } from 'senars';

const task = new Task(
  '(cat --> animal)', 
  '.', 
  { frequency: 1.0, confidence: 0.9 }
);
```

**Properties:**
- `id` - Unique identifier
- `termKey` - Associated Term
- `punctuation` - `.` `!` `?`
- `state` - Truth values, priority, timestamps

### Memory 💾

Knowledge hypergraph storage.

```javascript
// System manages Memory automatically
// Access via system.memory or system.introspection
```

**Methods:**
- `addTerm(term)` - Add new Term
- `getTerm(key)` - Retrieve Term
- `addTasks(tasks)` - Add new Tasks
- `getTask(id)` - Retrieve Task
- `queryTasks(filters)` - Search Tasks

---

## Introspection API 🔍

Observability tools.

```javascript
// Access via system.introspection
const status = system.introspection.getStatus();
const tasks = system.introspection.queryTasks({ punctuation: '.' });
```

**Key Methods:**
- `getStatus()` - System status
- `getConfig()` - Current configuration
- `queryTasks(filters)` - Filtered Task search
- `getMemoryStatistics()` - Memory metrics
- `getAvailableRules()` - Inference rules
- `getPlan()` - Current plan
- `getContradictions()` - Detected conflicts

---

## Configuration ⚙️

Hierarchical configuration system.

```javascript
const config = {
  LM: {
    LLM_PROVIDER: 'xenova',
    TEXT_GENERATION_MODEL: 'Xenova/distilgpt2'
  },
  memory: {
    FORGETTING_STRATEGY_NAME: 'TimeBased'
  },
  planner: {
    strategy: 'HTN'
  }
};

const system = await createSystem(config);
```

**Key Sections:**
- `LM` - Language model settings
- `memory` - Memory management
- `planner` - Planning strategy
- `reasoner` - Reasoning approach
- `temporal` - Temporal reasoning