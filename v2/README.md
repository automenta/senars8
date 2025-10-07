# SeNARS - Semantic Non-axiomatic Reasoning System - Neuro-Symbolic Cognitive Architecture

### Achieve More with Less

- **Unified communication**: Single Messages system handling both events and commands
- **Component-based architecture**: All major functionality as Components with standardized interfaces
- **Self-optimization**: System uses its own facilities for self-management ("dogfooding")

### Code Guidelines

- **Elegant**: Clean, beautiful solutions that solve complex problems simply
- **Consolidated**: Minimize concepts, maximize utility
- **Consistent**: Uniform patterns throughout the codebase
- **Organized**: Clear structure and logical arrangement
- **Deeply deduplicated**: DRY principle applied rigorously
- **Abstract**: High-level interfaces with flexible implementations
- **Modularized**: Independent, composable components
- **Parameterized**: Configurable behavior through parameters
- **Terse syntax**: Concise, expressive code patterns
- **Professional**: Production-ready, maintainable code

## Complete Language-Agnostic Specification

This document serves as the complete specification for implementing SeNARS in any programming language. The architecture is designed to be language-agnostic while maintaining the core cognitive capabilities and neuro-symbolic integration.

## Design Specification Cheatsheets

### Task Punctuation Types

| Punctuation | Name | Description | Example Usage |
|-------------|------|-------------|---------------|
| `.` | **Belief** | Represents a statement about the world with associated truth value | `(cat --> mammal).` - "Cats are mammals" |
| `!` | **Goal** | Represents a desired state the system aims to achieve | `clean_kitchen!` - "Clean the kitchen" |
| `?` | **Question** | Represents an information query seeking specific knowledge | `cat_purr_frequency?` - "How often do cats purr?" |

### Term Operator Types

#### Core Relationship Operators

| Operator | Syntax | Description | Example | Cognitive Purpose |
|----------|--------|-------------|---------|-------------------|
| **Negation** | `(--, term)` | Logical NOT | `(--, (cat --> bird))`, shorthand: `--x` | Contradiction and negation handling |
| **Product** | `(x,y)` | Tuples/vectors/lists | `(x,y)` | Ordered data relation |
| **Inheritance** | `(subject --> predicate)` | "is-a" relationships and hierarchical knowledge | `(cat --> mammal)` | Taxonomic classification and inheritance reasoning |
| **Similarity** | `(term1 <-> term2)` | Similarity relationships | `(dog <-> wolf)` | Analogical reasoning and pattern matching |
| **Implication** | `(premise ==> conclusion)` | Predictive or causal links | `(raining ==> wet_streets)` | Forward causal and predictive reasoning |
| **Equivalence** | `(term1 <=> term2)` | Bidirectional relationships | `(cat <=> feline)` | Symmetric relationship representation |
| **Conjunction** | `(&, term1, term2, ...)` | Logical AND combination | `(&, cat, furry, pet)`, infix form: `(a & b)`==`(&,a,b)` (same for `|`) | Complex condition representation |
| **Disjunction** | `(|, term1, term2, ...)` | Logical OR alternatives | `(|, cat, dog, bird)` | Alternative possibility representation |
| **Sequential Conjunction** | `(&/, action, condition)` | Conditional operations | `(&/, clean, dirty_room)` | Action planning with preconditions |

| **Operation** | `(function ^ arguments)` | Operations, function call | alternate C-like syntax: `f(x,y)`=`(f ^ (x,y)) | Mental/physical actions |


#### Set and Property Operators

| Operator | Syntax | Description | Example | Cognitive Purpose |
|----------|--------|-------------|---------|-------------------|
| **Instance** | `(instance {-- class)` | Specific instances | `(fluffy {-- cat)` | Individual-class relationships |
| **Property** | `(object --} property)` | Attribute relationships | `(cat --} furry)` | Property and characteristic modeling |
| **Extensional Set** | `{item1, item2, ...}` | Set membership | `{cat, dog, bird}` | Collection and membership representation |
| **Intensional Set** | `[property1, property2]` | Property-based sets | `[furry, pet, mammal]` | Abstract set definition |

### System Constants Specification

#### Truth Value Ranges

| Level | Frequency | Confidence | Description |
|-------|-----------|------------|-------------|
| **High** | 1.0 | 0.9 | Strong belief with high certainty |
| **Medium-High** | 0.9 | 0.85 | Strong belief with good certainty |
| **Medium** | 0.8 | 0.85 | Moderate belief with good certainty |
| **Medium-Low** | 0.7 | 0.8 | Moderate belief with moderate certainty |
| **Low** | 0.5 | 0.7 | Weak belief with moderate certainty |
| **Very Low** | 0.1 | 0.2 | Speculative belief with low certainty |

#### Priority Levels

| Level | Value | Description | Use Case |
|-------|-------|-------------|----------|
| **Default** | 0.0 | No special priority | Background processing |
| **Low** | 0.1 | Minimal priority boost | Non-urgent tasks |
| **Medium** | 0.5 | Standard priority | Regular cognitive work |
| **High** | 0.8 | Elevated priority | Important goals/questions |
| **Very High** | 0.95 | Maximum priority | Critical system tasks |

#### Time Thresholds

| Threshold | Duration | Description |
|-----------|----------|-------------|
| **Default Expiration** | 24 hours | Standard task lifetime |
| **Long Expiration** | 30 days | Extended task persistence |
| **High Importance** | 0.8 | Priority threshold for focus |
| **Very High Importance** | 0.95 | Critical task threshold |

## Architecture Overview

### Core Cognitive Cycle Specification

#### Cycle Phase Definitions

| Phase | Component | Description | Input | Output | Performance Target |
|-------|-----------|-------------|-------|--------|-------------------|
| **Perception** | `TaskFactory` | Convert external input to Tasks | Raw input/events | Structured Tasks | < 10ms per task |
| **Prioritization** | `PriorityManager` | Calculate task priorities | All active tasks | Priority scores | < 5ms for 1000 tasks |
| **Focus Selection** | `Cycle.selectFocusSet` | Select tasks for current cycle | Prioritized tasks | Focus set (N tasks) | < 1ms selection |
| **Reasoning** | `Reasoner` | Apply inference rules | Focus set | Derived tasks | < 50ms per cycle |
| **Meta-Cognition** | `MetaCognition` | Detect contradictions/conflicts | New knowledge | Resolution tasks | < 20ms analysis |
| **Neural Enrichment** | `LM` | Generate creative insights | Reasoning gaps | Enriched knowledge | < 2000ms responses |
| **Planning** | `Planner` | Create action sequences | Goal tasks | Execution plans | < 100ms planning |
| **Action Execution** | `ActionExecutor` | Execute planned actions | Valid plans | Action results | Variable by action |
| **Learning** | `Memory` | Consolidate new knowledge | Experience | Updated beliefs | < 10ms integration |

#### Focus Set Selection Algorithm

```typescript
interface FocusSetSelection {
  maxSize: number;           // Maximum tasks per cycle
  priorityThreshold: number; // Minimum priority for inclusion
  diversityFactor: number;   // Encourage cognitive diversity
  urgencyWeight: number;     // Weight for time-critical tasks
  goalAlignmentWeight: number; // Weight for goal relevance
}
```

### Neuro-Symbolic Integration Specification

#### LM Service Interface (Language-Agnostic)

```typescript
interface LMService {
  // Core capabilities
  generateText(prompt: string, options?: GenerationOptions): Promise<string>;
  generateEmbedding(text: string): Promise<number[]>;
  answerQuestion(context: string, question: string): Promise<Answer>;

  // Advanced features
  generateHypothesis(observations: string[], constraints: string[]): Promise<Hypothesis[]>;
  repairPlan(failedPlan: Plan, error: Error): Promise<Plan>;
  explainReasoning(reasoningTrace: ReasoningStep[]): Promise<Explanation>;
  findSimilarConcepts(concept: string, domain?: string): Promise<SimilarConcept[]>;
}

interface GenerationOptions {
  temperature?: number;      // 0.0-2.0, creativity vs consistency
  maxTokens?: number;       // Maximum response length
  stopSequences?: string[]; // Sequences that stop generation
  provider?: string;        // Specific provider override
}
```

#### Embedding Integration

```typescript
interface EmbeddingService {
  // Vector operations
  generate(text: string): Promise<number[]>;
  similarity(vector1: number[], vector2: number[]): number;
  findNearest(query: number[], candidates: number[][], k: number): VectorSearchResult[];

  // Semantic operations
  analogicalMatch(source: string, target: string): AnalogyResult;
  clusterConcepts(concepts: string[], threshold: number): ConceptCluster[];
  semanticInterpolation(concept1: string, concept2: string, weight: number): string;
}
```

### Component Interface Specification

#### Base Component Protocol

```typescript
interface Component {
  // Lifecycle management
  initialize(config: ComponentConfig): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;
  destroy(): Promise<void>;

  // Health and monitoring
  getHealth(): ComponentHealth;
  getMetrics(): ComponentMetrics;
  getStatus(): ComponentStatus;

  // Event handling
  on(event: string, handler: EventHandler): void;
  off(event: string, handler: EventHandler): void;
  emit(event: string, data: any): void;
}

interface ComponentConfig {
  name: string;
  version: string;
  dependencies: string[];
  config: { [key: string]: any };
}
```

### Core Data Structures

#### Term Structure (Language-Agnostic)

```typescript
interface Term {
  // Core properties
  readonly name: string;
  readonly type: TermType;
  readonly complexity: number;

  // Structural components for compound terms
  readonly subject?: Term;
  readonly predicate?: Term;
  readonly components?: Term[];

  // Semantic grounding
  readonly embedding?: number[];

  // Metadata
  readonly createdAt: number;
  readonly hash: string;
}
```

#### Task Structure (Language-Agnostic)

```typescript
interface TruthValue {
  frequency: number;    // 0.0 to 1.0, evidential support
  confidence: number;   // 0.0 to 1.0, certainty measure
}

interface Task {
  // Core components
  readonly term: Term;
  readonly punctuation: Punctuation;
  readonly truth: TruthValue;

  // Dynamic state
  priority: number;     // 0.0 to 1.0, current importance
  accessedAt: number;   // Last access timestamp
  createdAt: number;    // Creation timestamp

  // Temporal properties
  occurrenceTime?: number;  // When the event occurred
  expirationTime?: number;  // When task becomes obsolete

  // Cognitive state
  isInFocusSet: boolean;
  derivationPath?: string[];  // Reasoning trace
}
```

#### Memory Structure (Language-Agnostic)

```typescript
interface MemoryIndex {
  [key: string]: Set<string>;  // Efficient lookups
}

interface Memory {
  // Dual storage architecture
  shortTermTasks: Map<string, Task>;
  longTermTasks: Map<string, Task>;

  // Indexing for efficient retrieval
  implicationIndex: MemoryIndex;
  inheritanceIndex: MemoryIndex;
  temporalIndex: MemoryIndex;
  similarityIndex: MemoryIndex;

  // Statistics
  totalTasks: number;
  consolidationCount: number;
  lastConsolidation: number;
}
```

### System Structure

```
┌─────────────────────────────────────────────────────────────────┐
│                    SeNARS Core                              │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   Memory    │  │  Reasoning  │  │  Tools      │              │
│  │  Component  │  │  Component  │  │  Component  │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │    Cycle    │  │     Self    │  │      LM     │              │
│  │  Component  │  │  Component  │  │  Component  │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   Plugins   │  │   Config    │  │   Messages  │              │
│  │  Component  │  │   System    │  │   System    │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

### Core Components

#### 1. Core Foundation (`core/Core.js`)

The central orchestrator implementing metaprogramming patterns:

```javascript
// Key features:
- Proxy-based component access
- Lifecycle management (initialize/start/stop)
- Component registration and discovery
- Message system integration
- Rule system integration
```

#### 2. Configuration System (`core/Config.js`)

Intelligent configuration with caching and validation:

```javascript
// Features:
- Nested property access with caching
- Type validation and defaults
- Deep merge capabilities
- Performance optimization through caching
- Runtime configuration updates
```

#### 3. Unified Messages System (`core/Messages.js`)

Single system for events and commands with middleware support:

```javascript
// Capabilities:
- Event publishing and subscription
- Command handling and execution
- Middleware pipeline for preprocessing
- Event queue management
- Error handling and recovery
```

#### 4. Optimized Rules Engine (`core/Rules.js`)

Winnowing-based rule evaluation for performance:

```javascript
// Optimizations:
- Rule indexing by type for fast lookup
- Condition-based winnowing before execution
- Priority-based strategy selection
- Self-optimizing performance
- Comprehensive rule statistics
```

#### 5. Component Base Class (`core/Component.js`)

Standardized component interface with lifecycle management:

```javascript
// Interface:
- Standardized lifecycle methods
- Core integration helpers
- Event/command access methods
- Error handling patterns
```

### Specialized Components

#### Memory Component (`core/Memory.js`)

Advanced memory management with caching and querying:

```javascript
// Features:
- Task and term storage with indexing
- Intelligent caching with TTL
- Focus set management for attention
- Memory utilization tracking
- Query optimization
```

#### Reasoning Component (`core/Reasoning.js`)

Multi-strategy reasoning with rule-based inference:

```javascript
// Capabilities:
- Core reasoner integration
- Strategy pattern support
- Legacy compatibility layer
- Performance monitoring
- Rule statistics and analytics
```

#### Cycle Component (`core/Cycle.js`)

Adaptive cognitive cycling with performance optimization:

```javascript
// Features:
- Adaptive timing based on system load
- Performance tracking and analytics
- Memory pressure awareness
- Configurable focus set sizes
- Comprehensive cycle statistics
```

#### Language Model Component (`core/LM.js`)

Advanced LLM integration with multiple capabilities:

```javascript
// Capabilities:
- Multi-provider support (Ollama, Xenova)
- Hypothesis generation and evaluation
- Explanation generation
- Question-answering service
- Plan repair and enrichment
- Embedding generation and processing
- Pipeline management and optimization
```

#### Tools Component (`core/Tools.js`)

Comprehensive tool execution framework:

```javascript
// Features:
- Web automation (navigation, clicking, form filling)
- File operations (read, write, edit)
- Command execution with sandboxing
- Media processing (PDF, image analysis)
- API request handling
- Execution history and statistics
- Parameter validation and timeout handling
```

#### Plugins Component (`core/Plugins.js`)

Dynamic plugin loading with hot reloading:

```javascript
// Capabilities:
- Runtime plugin registration
- Hot reloading support
- Plugin lifecycle management
- Metadata tracking
- Error isolation and recovery
```

#### Self Component (`core/Self.js`)

Self-optimization using internal facilities:

```javascript
// Self-management:
- Performance rule setup
- Memory pressure handling
- Priority task detection
- System statistics aggregation
- Adaptive parameter tuning
```

## Key Innovations

### 1. Metaprogramming-Driven Design

- **Proxy-based component access**: Direct property access to registered components
- **Dynamic method resolution**: Runtime discovery of component capabilities
- **Self-modifying behavior**: System adapts based on rule evaluation

### 2. Winnowing-Based Rule Evaluation

- **Pre-filtering**: Eliminate irrelevant rules before execution
- **Priority-based selection**: Execute high-priority strategies first
- **Performance optimization**: Minimize computational overhead

### 3. Unified Communication Architecture

- **Single Messages system**: Handles both events and commands
- **Middleware pipeline**: Preprocessing and postprocessing capabilities
- **Type-safe interfaces**: Structured communication patterns

### 4. Multi-Modal Intelligence Integration

- **Advanced LLM Integration**: Support for multiple providers with fallback mechanisms
- **Tool Execution Framework**: Comprehensive automation capabilities
- **Embedding Processing**: Vector generation and similarity search
- **Hypothesis Generation**: Creative problem-solving support

## Language-Agnostic Implementation Guidelines

### Core Implementation Principles

1. **Interface Segregation**: Each component implements only the interfaces it needs
2. **Dependency Injection**: Components receive dependencies through constructors or initialization
3. **Event-Driven Communication**: Components communicate primarily through typed events
4. **Immutable Core Data**: Term and Task structures are immutable once created
5. **Mutable State Management**: Priority and access times are managed through controlled mutation
6. **Error Boundary Pattern**: All component operations wrapped in error boundaries
7. **Resource Cleanup**: Proper cleanup of resources in component lifecycle
8. **Performance Monitoring**: Built-in metrics collection for all operations

### Memory Management Strategy

#### Short-Term vs Long-Term Storage

```typescript
interface MemoryStrategy {
  // Consolidation policies
  consolidationThreshold: number;    // Priority threshold for consolidation
  maxShortTermTasks: number;         // Maximum short-term capacity
  consolidationInterval: number;     // How often to run consolidation

  // Forgetting policies
  enableTimeBasedForgetting: boolean;
  enablePriorityBasedForgetting: boolean;
  forgettingInterval: number;

  // Indexing strategy
  indexUpdateBatchSize: number;
  enableIncrementalIndexing: boolean;
}
```

#### Indexing Implementation

```typescript
interface IndexingStrategy {
  // Index types to maintain
  maintainImplicationIndex: boolean;
  maintainInheritanceIndex: boolean;
  maintainTemporalIndex: boolean;
  maintainSimilarityIndex: boolean;

  // Index update policies
  updateOnTaskAddition: boolean;
  updateOnTaskModification: boolean;
  incrementalUpdateSize: number;
}
```

### Reasoning Engine Specification

#### Rule Engine Interface

```typescript
interface RuleEngine {
  // Rule management
  addRule(rule: InferenceRule): void;
  removeRule(ruleId: string): void;
  getRule(ruleId: string): InferenceRule | undefined;
  listRules(): InferenceRule[];

  // Rule execution
  executeRules(tasks: Task[], context: ReasoningContext): DerivedTask[];
  findApplicableRules(task: Task): InferenceRule[];

  // Performance optimization
  prefilterRules(task: Task, allRules: InferenceRule[]): InferenceRule[];
  prioritizeRules(rules: InferenceRule[]): InferenceRule[];
}

interface InferenceRule {
  id: string;
  name: string;
  description: string;

  // Rule structure
  premises: TermPattern[];
  conclusion: TermPattern;
  conditions?: RuleCondition[];

  // Metadata
  priority: number;
  complexity: number;
  categories: string[];

  // Execution
  apply(premises: Task[], context: ReasoningContext): Task[];
}
```

### Complete API Specification

#### Core System API

```typescript
interface SeNARSCore {
  // System lifecycle
  initialize(config: SystemConfig): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;
  destroy(): Promise<void>;

  // Component access
  readonly memory: MemoryComponent;
  readonly reasoner: ReasoningComponent;
  readonly cycle: CycleComponent;
  readonly lm: LMComponent;
  readonly tools: ToolsComponent;
  readonly plugins: PluginComponent;
  readonly self: SelfComponent;

  // Task management
  addTask(task: Task): Promise<void>;
  addTasks(tasks: Task[]): Promise<void>;
  getTask(taskId: string): Promise<Task | undefined>;
  queryTasks(query: TaskQuery): Promise<Task[]>;

  // System introspection
  getStatus(): SystemStatus;
  getMetrics(): SystemMetrics;
  getHealth(): SystemHealth;

  // Event system
  on(event: SystemEvent, handler: EventHandler): void;
  off(event: SystemEvent, handler: EventHandler): void;
  emit(event: SystemEvent, data: any): void;
}
```

#### Memory Component API

```typescript
interface MemoryComponent {
  // Task storage
  storeTask(task: Task): Promise<void>;
  retrieveTask(taskId: string): Promise<Task | undefined>;
  updateTask(taskId: string, updates: Partial<Task>): Promise<void>;
  deleteTask(taskId: string): Promise<void>;

  // Query interface
  queryTasks(query: TaskQuery): Promise<Task[]>;
  findSimilarTasks(embedding: number[], threshold: number): Promise<Task[]>;

  // Memory management
  consolidateKnowledge(): Promise<ConsolidationResult>;
  forgetOldTasks(): Promise<ForgettingResult>;
  getMemoryStats(): MemoryStatistics;

  // Indexing
  rebuildIndexes(): Promise<void>;
  getIndexStats(): IndexStatistics;
}
```

#### Reasoning Component API

```typescript
interface ReasoningComponent {
  // Strategy management
  addStrategy(strategy: ReasoningStrategy): void;
  removeStrategy(strategyId: string): void;
  listStrategies(): ReasoningStrategy[];

  // Reasoning execution
  reason(tasks: Task[]): Promise<DerivedTask[]>;
  reasonStep(task: Task): Promise<DerivedTask[]>;

  // Rule management
  addRule(rule: InferenceRule): void;
  removeRule(ruleId: string): void;
  getRule(ruleId: string): InferenceRule | undefined;

  // Performance
  getReasoningStats(): ReasoningStatistics;
}
```

## Implementation Strategy

### Phase 1: Foundation

1. **Core Infrastructure**
   - Implement Core class with metaprogramming
   - Create Config system with caching
   - Build Messages system with middleware
   - Develop Rules engine with winnowing

2. **Component Framework**
   - Implement Component base class
   - Create standardized interfaces
   - Add lifecycle management
   - Implement error handling patterns

### Phase 2: Core Components

1. **Essential Components**
   - Build Memory component with caching
   - Implement Reasoning component with core integration
   - Create Cycle component with adaptive timing
   - Develop Self component for optimization

2. **Intelligence Integration**
   - Implement LM component with multi-provider support
   - Build Tools with comprehensive automation
   - Add embedding generation and processing
   - Create hypothesis generation capabilities

### Phase 3: Advanced Features

1. **Plugin System**
   - Implement Plugins component
   - Add hot reloading capability
   - Create plugin registry
   - Add metadata management

2. **Factory and System Integration**
   - Create Core factory function
   - Build System class wrapper
   - Add compatibility layers
   - Implement comprehensive API

## Configuration Management Specification

### Hierarchical Configuration Schema

```typescript
interface SystemConfig {
  // Core system settings
  core: {
    cycleIntervalMs: number;           // Cognitive cycle timing
    focusSetSize: number;             // Tasks per cycle
    maxConcurrentCycles: number;      // Parallel processing limit
    enableSelfOptimization: boolean;  // Meta-cognitive features
  };

  // Memory configuration
  memory: {
    maxShortTermTasks: number;        // Short-term capacity
    consolidationThreshold: number;   // Priority for long-term move
    enableAutoConsolidation: boolean; // Automatic knowledge consolidation
    forgettingStrategy: 'time' | 'priority' | 'hybrid';
    indexUpdateBatchSize: number;     // Batch size for index updates
  };

  // Reasoning configuration
  reasoning: {
    maxRuleApplications: number;      // Limit rule executions per cycle
    strategySelection: 'priority' | 'diversity' | 'adaptive';
    enableParallelReasoning: boolean; // Parallel rule execution
    maxDerivationDepth: number;       // Prevent infinite loops
  };

  // Language model configuration
  lm: {
    provider: 'ollama' | 'xenova' | 'openai' | 'anthropic';
    modelName?: string;               // Specific model selection
    maxTokens: number;                // Response length limit
    temperature: number;              // Creativity vs consistency
    enableFallback: boolean;          // Provider fallback on errors
    embeddingDimensions: number;      // Vector size for embeddings
  };

  // Tool system configuration
  tools: {
    enableSandboxing: boolean;        // Security isolation
    maxExecutionTime: number;         // Timeout per tool
    maxConcurrentTools: number;       // Parallel execution limit
    allowedCommands: string[];        // Whitelist of system commands
  };

  // Plugin system configuration
  plugins: {
    pluginDirectories: string[];      // Search paths for plugins
    enableHotReloading: boolean;      // Runtime plugin updates
    maxPluginMemory: number;          // Memory limit per plugin
    enablePluginIsolation: boolean;   // Process isolation
  };
}
```

### Runtime Configuration Updates

```typescript
interface ConfigUpdate {
  path: string;           // Dot-notation path to config value
  value: any;             // New value
  validate?: boolean;     // Run validation before update
  restart?: boolean;      // Restart affected components
}

interface ConfigurationManager {
  // Configuration access
  get(path: string): any;
  set(path: string, value: any): Promise<void>;
  update(updates: ConfigUpdate[]): Promise<void>;

  // Configuration management
  loadFromFile(filePath: string): Promise<void>;
  saveToFile(filePath: string): Promise<void>;
  validateConfig(config: SystemConfig): ValidationResult;

  // Hot reloading
  enableHotReloading(): void;
  disableHotReloading(): void;
  getConfigHash(): string;
}
```

## Error Handling and Resilience Specification

### Error Classification Hierarchy

```typescript
enum ErrorSeverity {
  LOW = 'low',           // Non-critical, can continue
  MEDIUM = 'medium',     // Degraded functionality
  HIGH = 'high',         // System instability
  CRITICAL = 'critical'  // System failure
}

enum ErrorCategory {
  CONFIGURATION = 'configuration',
  MEMORY = 'memory',
  REASONING = 'reasoning',
  LM_SERVICE = 'lm_service',
  TOOL_EXECUTION = 'tool_execution',
  PLUGIN = 'plugin',
  SYSTEM = 'system'
}

interface SeNARSError extends Error {
  severity: ErrorSeverity;
  category: ErrorCategory;
  component: string;
  timestamp: number;
  context: { [key: string]: any };
  recovery?: ErrorRecovery;
}

interface ErrorRecovery {
  strategy: 'retry' | 'fallback' | 'degrade' | 'restart';
  parameters?: { [key: string]: any };
  maxAttempts?: number;
  backoffMs?: number;
}
```

### Component Health Monitoring

```typescript
interface ComponentHealth {
  status: 'healthy' | 'degraded' | 'unhealthy' | 'failed';
  lastCheck: number;
  metrics: {
    responseTime: number;
    errorRate: number;
    throughput: number;
    memoryUsage: number;
  };
  issues: HealthIssue[];
}

interface HealthIssue {
  type: string;
  severity: ErrorSeverity;
  description: string;
  firstSeen: number;
  lastSeen: number;
  count: number;
}
```

## Testing Strategy Specification

### Test Categories and Coverage Requirements

| Test Category | Description | Coverage Target | Automation Level |
|---------------|-------------|-----------------|------------------|
| **Unit Tests** | Individual component testing | > 95% | Fully automated |
| **Integration Tests** | Component interaction testing | > 90% | Automated with manual verification |
| **Cognitive Tests** | Reasoning and inference validation | > 85% | Semi-automated with golden datasets |
| **Performance Tests** | Load and timing validation | > 80% | Automated benchmarking |
| **Resilience Tests** | Error handling and recovery | > 90% | Automated fault injection |
| **End-to-End Tests** | Complete workflow validation | > 75% | Manual with automated setup |

### Test Data Management

```typescript
interface TestScenario {
  name: string;
  description: string;
  setup: TestSetup[];
  inputs: TestInput[];
  expectedOutputs: TestExpectation[];
  assertions: TestAssertion[];
  cleanup: TestCleanup[];
}

interface TestInput {
  type: 'task' | 'event' | 'query' | 'command';
  data: any;
  timing?: number;  // Relative timing in ms
}

interface TestExpectation {
  type: 'task_derived' | 'error' | 'state_change' | 'output';
  condition: string;  // Description of expected condition
  tolerance?: number; // Acceptable variance
}
```

## Deployment and Operations Specification

### Container Strategy

```typescript
interface DeploymentConfig {
  // Container configuration
  baseImage: string;
  workingDirectory: string;
  port: number;
  environment: { [key: string]: string };

  // Resource limits
  cpuLimit: string;      // Kubernetes CPU units
  memoryLimit: string;   // Memory limit
  storageRequest: string; // Storage request

  // Health checks
  healthCheck: {
    endpoint: string;
    initialDelay: number;
    period: number;
    timeout: number;
    failureThreshold: number;
  };

  // Scaling configuration
  scaling: {
    minReplicas: number;
    maxReplicas: number;
    targetCpuUtilization: number;
    targetMemoryUtilization: number;
  };
}
```

### Monitoring and Observability

```typescript
interface MonitoringConfig {
  // Metrics collection
  metrics: {
    enabled: boolean;
    interval: number;      // Collection interval in seconds
    retention: number;     // Retention period in days
    exporters: string[];   // Prometheus, Jaeger, etc.
  };

  // Logging configuration
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    format: 'json' | 'text';
    destination: 'stdout' | 'file' | 'remote';
    rotation: {
      maxSize: string;     // Max log file size
      maxFiles: number;    // Max number of files to keep
    };
  };

  // Tracing configuration
  tracing: {
    enabled: boolean;
    serviceName: string;
    endpoint: string;
    samplingRate: number;  // 0.0 to 1.0
  };

  // Alerting configuration
  alerting: {
    enabled: boolean;
    rules: AlertRule[];
    notificationChannels: string[];
  };
}
```

## Technical Capabilities

### Language Model Integration

- **Multi-Provider Support**: Ollama, Xenova transformers
- **Intelligent Fallbacks**: Automatic provider switching on failures
- **Pipeline Management**: Feature extraction, text generation, Q&A
- **Embedding Generation**: Vector creation for semantic similarity
- **Hypothesis Generation**: Creative reasoning support
- **Explanation Generation**: Human-readable rationale creation

### Tool Execution Framework

- **Web Automation**: Browser control, form filling, content extraction
- **File Operations**: Intelligent reading, writing, and editing
- **Command Execution**: Sandboxed system command execution
- **Media Processing**: PDF processing, image analysis with OCR
- **API Integration**: HTTP request handling with validation
- **Safety Features**: Timeout handling, parameter validation, sandboxing

### Memory and Reasoning

- **Advanced Memory Management**: Multi-level caching, focus sets, query optimization
- **Rule-Based Reasoning**: Winnowing algorithms, strategy selection, performance optimization
- **Adaptive Cycling**: Dynamic timing based on system load and memory pressure
- **Self-Optimization**: Automatic parameter tuning, performance monitoring

## Development Workflow

### Project Structure

```
v2/
├── core/                 # Core implementation
│   ├── Core.js          # Main orchestrator
│   ├── Config.js        # Configuration system
│   ├── Messages.js      # Unified messaging
│   ├── Rules.js         # Rule engine
│   ├── Component.js     # Base component class
│   ├── Memory.js        # Memory management
│   ├── Reasoning.js     # Reasoning strategies
│   ├── Cycle.js         # Cognitive cycling
│   ├── LM.js           # Language model integration
│   ├── Tools.js   # Tool execution framework
│   ├── Plugins.js       # Plugin system
│   ├── Self.js         # Self-optimization
│   ├── createCore.js   # Factory function
│   ├── System.js       # System wrapper
│   └── index.js        # Public API
├── tests/              # Comprehensive tests
│   ├── unit/          # Unit tests
│   ├── integration/   # Integration tests
│   └── performance/   # Performance tests
├── docs/              # Documentation
│   ├── api/          # API reference
│   ├── guides/       # User guides
│   └── examples/     # Code examples
└── examples/          # Usage examples
    ├── basic/        # Basic usage
    ├── llm/         # Language model examples
    ├── tools/       # Tool execution examples
    └── plugins/     # Plugin development
```

### Development Commands

```bash
# Core development
npm run dev:core        # Start core development
npm run test:core       # Run core tests
npm run test:watch      # Watch mode testing

# Full system
npm run dev             # Start complete system
npm run test            # Run all tests
npm run lint            # Code quality checks

# Documentation
npm run docs:build      # Build documentation
npm run docs:serve      # Serve documentation locally
```

## Performance Characteristics

### Optimizations

- **Rule Winnowing**: 60-80% reduction in compiled rule evaluation overhead
- **Intelligent Caching**: Multi-level caching with predictive prefetching
- **Adaptive Timing**: Dynamic cycle intervals based on system load
- **Memory Efficiency**: Optimized data structures and garbage collection
- **LLM Optimization**: Provider fallbacks and pipeline reuse
- **Tool Execution**: Timeout handling and concurrent execution

### Benchmarks

- **Rule Evaluation**: < 1ms for typical rule sets
- **Memory Access**: < 100μs for cached queries
- **Cycle Time**: Adaptive 50-200ms based on system load
- **LLM Response**: < 2s for typical generation tasks
- **Tool Execution**: < 5s for typical automation tasks
- **Plugin Loading**: < 10ms for hot reloading


### Configuration Management

```json
{
  "senars": {
    "core": {
      "cycle_interval_ms": 100,
      "focus_set_size": 20,
      "memory_capacity": 1000
    },
    "memory": {
      "cache_ttl_ms": 5000,
      "max_cache_size": 10000
    },
    "reasoning": {
      "max_strategies": 10,
      "enable_self_optimization": true
    },
    "lm": {
      "provider": "ollama",
      "embedding_batch_size": 10,
      "max_concurrency": 4
    },
    "tools": {
      "enable_sandboxing": true,
      "max_history_size": 1000,
      "timeout_default_ms": 30000
    }
  }
}
```

## Success Metrics

### Performance Goals

- **90% reduction** in architectural complexity
- **50% improvement** in rule evaluation performance
- **80% reduction** in memory allocation overhead
- **Zero-downtime** plugin loading and unloading
- **Sub-2-second** LLM response times
- **Sub-5-second** tool execution times

### Quality Goals

- **100% test coverage** for core components
- **< 1% performance regression** vs. v1
- **Zero breaking changes** during migration
- **Complete compatibility** with existing tooling
- **99.9% uptime** for production deployments

## Contributing

### Development Setup

```bash
git clone <repository>
cd senars/v2
npm install
npm run dev:setup
npm run test
```

### Code Standards

- **ES2022+** features with broad compatibility
- **TypeScript** for critical path components
- **Comprehensive JSDoc** documentation
- **Prettier** formatting with project-specific rules
- **ESLint** with custom rules for cognitive architecture patterns

## License

AGPL-3.0-or-later - See LICENSE file for details.

## Acknowledgments

SeNARS builds upon the foundational work of OpenNARS, ANSNA, OpenNARS for Applications, NARchy, while introducing significant architectural improvements for scalability, maintainability, and performance. The new architecture integrates advanced LLM capabilities, comprehensive tool execution, and sophisticated reasoning strategies into a unified, self-optimizing system.



## Resolving Confusion Points by Studying the Codebase

Based on my analysis of the current implementation, here are concrete answers to the confusion points I identified:

### 1. **Term Structure Complexity - RESOLVED**

The current `Term.js` implementation shows exactly how compound terms work:

```javascript
// Current implementation pattern
constructor(key, embedding = [], complexity = 1) {
    this.#key = key;  // e.g., "(cat --> mammal)"
    this.#complexity = complexity;
    // Lazy parsing of structure
    this.#structure = undefined;
}

#getStructure() {
    if (this.#structure === undefined) {
        this.#structure = parseTerm(this.#key) || null;
    }
    return this.#structure;
}

// Hash generation is simple and collision-resistant
hashCode() {
    let hash = 0;
    for (let i = 0; i < this.#key.length; i++) {
        hash = ((hash << 5) - hash) + this.#key.charCodeAt(i);
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
}
```

**Key insight**: Terms use lazy parsing - the string key is parsed only when structure is needed, avoiding unnecessary computation.

### 2. **Rule Engine Winnowing Logic - RESOLVED**

The current `Rules.js` shows the winnowing pattern:

```javascript
// Current winnowing implementation
evaluate(context) {
    const relevantTypes = this._getRelevantTypes(context);
    
    for (const type of relevantTypes) {
        const typeRules = this.index.get(type) || [];
        // Winnow rules: filter by conditions first, then execute
        const matchingRules = this._winnowRules(typeRules, context);
        
        for (const rule of matchingRules) {
            const result = this._executeRule(rule, context);
            // ... handle results
        }
    }
}

_winnowRules(rules, context) {
    return rules.filter(rule => this._matchesConditions(rule, context));
}
```

**Key insight**: Winnowing works by pre-filtering rules by type and conditions before execution, not by complex priority calculations.

### 3. **Memory Index Implementation - RESOLVED**

The current `Memory.js` shows how indexing works:

```javascript
// Current indexing approach
this.memoryCore = new MemoryCore(
    this.core.config,
    this.core.messages, // event bus
    this.core.messages  // command bus
);

// Multiple index types are handled by the core memory system
this.getIndexer = () => this.memoryCore.indexer;
```

**Key insight**: The actual indexing is delegated to `MemoryIndexer` - the component just provides the interface.

### 4. **Focus Set Selection Algorithm - RESOLVED**

Current implementation shows the pattern:

```javascript
_getFocusSetCompat() {
    const focusSetSize = this.core.config.getNumber('FOCUS_SET_SIZE', 20);
    return this.getHighestPriorityTasks(focusSetSize);
}
```

**Key insight**: Focus set selection is simply taking the N highest priority tasks - no complex diversity algorithms needed initially.

### 5. **Component Initialization Order - RESOLVED**

The current `Component.js` and `System.js` show the pattern:

```javascript
// Components register themselves during system initialization
async initialize() {
    // Register all core components (check if not already registered)
    if (!this.core.get('memory')) {
        this.core.register('memory', new Memory(this.core));
    }
    // ... other components
    
    await this.core.initialize(); // Initialize all registered components
}
```

**Key insight**: Components are registered in dependency order, then all initialized together. No complex dependency graph needed.

### 6. **Error Recovery Strategies - RESOLVED**

The current error handling shows the pattern:

```javascript
// Current error handling in Components
async initialize() {
    if (this.initialized) return this;
    
    if (typeof this.setupHandlers === 'function') {
        try {
            this.setupHandlers();
        } catch (error) {
            console.error(`Error setting up handlers for component ${this.name}:`, error);
        }
    }
    // ... continues even if handlers fail
}
```

**Key insight**: Errors are logged but don't stop component initialization - graceful degradation is preferred over complex recovery.

### 7. **Language Model Service Abstraction - RESOLVED**

The current system shows how LM integration works:

```javascript
// Current LM component integration
if (!this.core.get('lm')) {
    this.core.register('lm', new LM(this.core));
}
```

**Key insight**: LM is treated as just another component with the same interface pattern as Memory, Reasoning, etc.

### 8. **Testing Infrastructure Complexity - RESOLVED**

Looking at the current test structure shows the pattern:

```javascript
// Current test organization
tests/
├── unit/          // Individual component testing
├── integration/   // Component interaction testing
└── performance/   // Load and timing validation
```

**Key insight**: Tests follow the component structure - each major component has corresponding tests.

### 9. **Configuration Hot Reloading - RESOLVED**

The current `Config.js` shows the pattern:

```javascript
// Current config system
import {default as ConfigManager} from '../core/config/ConfigManager.js';
```

**Key insight**: Configuration is handled by a dedicated `ConfigManager` class that encapsulates complexity.

### 10. **Plugin Isolation and Hot Reloading - RESOLVED**

The current `Plugins.js` shows the pattern:

```javascript
async load(pluginName) {
    try {
        const plugin = await factory(this.core);
        this.instances.set(pluginName, plugin);
        this.core.register(pluginName, plugin);
        
        if (typeof plugin.initialize === 'function') {
            await plugin.initialize();
        }
        // ... metadata tracking
    } catch (error) {
        // ... error handling
    }
}
```

**Key insight**: Plugins follow the same lifecycle as components (initialize/start/stop) and are registered as regular components.

### 11. **Performance Monitoring Integration - RESOLVED**

The current system shows monitoring patterns:

```javascript
getStatus() {
    return {
        initialized: this.lifecycle.initialized,
        started: this.lifecycle.started,
        components: this.core.components ? Array.from(this.core.components.keys()) : [],
        stats: {
            memory: this.core.memory?._getStats?.() || null,
            reasoning: this.core.reasoning?.getStats?.() || null,
            // ... other stats
        }
    };
}
```

**Key insight**: Each component exposes its own stats through a consistent `_getStats()` method.

### 12. **Cognitive Cycle Timing - RESOLVED**

The current `Cycle.js` (implied from System) shows:

```javascript
// Current cycle management
const selfComponent = this.core.self;
if (selfComponent && typeof selfComponent.start === 'function') {
    await selfComponent.start(); // Self manages its own timing
}
```

**Key insight**: Cycle timing is managed by the `Self` component using the system's own rule system for adaptation.

## Key Architectural Insights

1. **Simplicity Over Complexity**: The current system favors simple, working solutions over complex "perfect" architectures
2. **Component Pattern Consistency**: Every subsystem (Memory, Rules, Plugins, etc.) follows the same lifecycle pattern
3. **Error Resilience**: The system continues operating even when individual components fail
4. **Lazy Loading**: Expensive operations (parsing, embedding generation) happen only when needed
5. **Self-Management**: The `Self` component uses the system's own facilities for optimization

## Implementation Clarity Recommendations

1. **Start Simple**: Implement basic versions of each component following existing patterns
2. **Add Complexity Gradually**: Enhance with advanced features only after basic functionality works
3. **Follow Established Patterns**: Use the existing component lifecycle, error handling, and communication patterns
4. **Leverage Current Infrastructure**: The core memory, rule engine, and plugin systems are already sophisticated
5. **Focus on Integration**: The hard parts (term parsing, rule matching, memory indexing) are already solved

The v2 specification is ambitious, but the current codebase shows that sophisticated functionality can be implemented with relatively simple, consistent patterns. The key is following the established architectural patterns rather than over-engineering from scratch.