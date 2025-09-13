# SeNARS Cognitive System - Design Document

## Overview

SeNARS (Symbolic-Neural Adaptive Reasoning System) is a neuro-symbolic cognitive architecture that combines formal
symbolic reasoning with the semantic power of Large Language Models (LMs). It implements a unified knowledge hypergraph
where immutable concepts (`Term`s) and stateful beliefs/goals/questions (`Task`s) form the foundation of all cognitive
processes.

The system operates in discrete cognitive cycles, each implementing a complete reasoning loop governed by economic
attention principles that prioritize tasks based on relevance, urgency, confidence, and predicted effort. All reasoning
is guided by an immutable `Constitution` of foundational motives, and the architecture features a dual-engine design: a
symbolic `Reasoner` performs rigorous inference, while a neuro-symbolic `LM` module leverages LMs for creativity,
grounding, and natural language fluency.

## Core Design Principles

1. **Modularity and Decoupling**: Components are designed to be independent, communicating through a central `EventBus`
   rather than direct calls, enabling easier maintenance and extension.

2. **Explicit State Management**: All cognitive state is stored within `Task`s in the central `Memory` component,
   creating a single source of truth that's transparent and debuggable.

3. **Strategy over Implementation**: Complex problems like contradiction resolution and planning use the Strategy
   pattern, allowing dynamic selection of algorithms based on context and easy addition of new approaches without
   altering core logic.

4. **Meta-Cognition as a First-Class Citizen**: Self-reflection and self-improvement are core components, not
   afterthoughts, with the `MetaCognition` module ensuring the system is fundamentally designed to analyze and correct
   its own reasoning processes.

5. **Pragmatism under Scarcity**: The system assumes finite computational resources, implementing economic attention
   through the `PriorityManager` and probabilistic `Bag` data structure to ensure resources are allocated to the most
   salient cognitive activities.

## System Architecture

```
SeNARS Cognitive Core
┌────────────────────────────────────────────────────────────┐
│  ┌──────────────┐         ┌──────────────┐               │
│  │   Reasoner   │◄───────►│    Memory    │               │
│  │ Symbolic     │         │ Term         │               │
│  │ Inference &  │         │ Hypergraph & │               │
│  │ Meta-Cognition│        │ Task         │               │
│  │              │         │ Collection   │               │
│  └──────────────┘         └──────────────┘               │
│         ▲                      ▲                         │
│         │                      │                         │
│         ▼                      ▼                         │
│  ┌──────────────┐    Triggers │  Injects                │
│  │      LM      │◄────────────┴───────── Knowledge      │
│  │ LM-Powered   │                                       │
│  │ Engine       │                                       │
│  └──────────────┘                                       │
└────────────────────────────────────────────────────────────┘

Interfaces
┌────────────────────────────────────────────────────────────┐
│  ┌──────────────┐         ┌──────────────┐               │
│  │  Perception  │───────► │              │               │
│  │              │         │              │               │
│  └──────────────┘         │              │               │
│                           │              │               │
│  ┌──────────────┐         │              │               │
│  │ ActionSystem │◄────────┤              │◄──────────────┤
│  │              │         │              │               │
│  └──────────────┘         └──────────────┘               │
└────────────────────────────────────────────────────────────┘

Foundational Layer
┌────────────────────────────────────────────────────────────┐
│  ┌──────────────┐ Provides Salience Gradients             │
│  │ Constitution │────────────────────────────────────────►│
│  │ Immutable    │                                         │
│  │ Drives &     │                                         │
│  │ Constraints  │                                         │
│  └──────────────┘                                         │
└────────────────────────────────────────────────────────────┘

System-Wide
┌────────────────────────────────────────────────────────────┐
│  ┌──────────────┐                                         │
│  │  Event Bus   │                                         │
│  │              │                                         │
│  └──────────────┘                                         │
│         ▲                                                │
│         │ Notifies                                     │
│         ▼                                                │
│  ┌──────────────┐         ┌──────────────┐               │
│  │  Perception  │         │ MetaCognition│               │
│  │  Publishes   │────────►│              │               │
│  └──────────────┘         └──────────────┘               │
└────────────────────────────────────────────────────────────┘
```

## Core Components

### Knowledge Representation

#### Term - The Immutable Vocabulary

`Term` objects represent unique, canonical concepts or relationships in the system:

- **Key**: Formal Narsese-inspired syntax (e.g., `cat`, `(cat --> animal)`)
- **Embedding**: Dense vector representation from LMs for semantic grounding
- **Complexity**: Static measure of structural complexity
- **Intelligence**: Parses its own key upon instantiation, caching Narsese structure for efficient access to components

```javascript
class Term {
    constructor(key, embedding = [], complexity = 1) {
        // ...
    }
    
    // Smart accessors for component terms
    get subject() { /* ... */ }
    get predicate() { /* ... */ }
    get terms() { /* ... */ }
    
    // Semantic operations
    static findSimilarTerms(terms, targetTermKey, maxResults = 10) { /* ... */ }
    static structuralSimilarity(termKey1, termKey2) { /* ... */ }
}
```

#### Task - The Stateful Cognitive Atom

`Task` objects represent specific, evidence-backed cognitive acts concerning a `Term`:

- **ID**: Unique identifier for the cognitive act
- **Term Key**: Foreign key to a `Term`
- **Punctuation**: Belief (`.`), Goal (`!`), or Question (`?`)
- **State**:
    - Priority: Current attentional focus score
    - Truth Value: Evidence-based belief strength (`{ frequency, confidence }`)
    - Stamp: Temporal information (`{ creationTime, occurrenceTime }`)

```javascript
class Task {
    constructor(term, punctuation, truthValue = {}, stamp = {}) {
        // ...
    }
    
    reviseTruthValue(newEvidence, weight = 0.5) { /* ... */ }
    touch() { /* ... */ }
    
    // Type checking helpers
    static isBelief(task) { /* ... */ }
    static isGoal(task) { /* ... */ }
    static isQuestion(task) { /* ... */ }
}
```

### The Constitution

The `Constitution` serves as the immutable motivational and ethical foundation:

```javascript
const DRIVES = [
    new Task(parseTerm('AcquireKnowledge'), '!'),
    new Task(parseTerm('ReduceUncertainty'), '!'),
    new Task(parseTerm('MaintainCoherence'), '!'),
    new Task(parseTerm('MaintainCognitiveIntegrity'), '!'),
];

const CONSTRAINTS = [
    // Example constraint: causing harm is negative
    new Task(parseTerm('((&, self, cause_harm) ==> NEGATIVE_OUTCOME)'), '.'),
];

const CONSTITUTION_TASKS = Object.freeze([
    ...DRIVES,
    ...CONSTRAINTS,
]);
```

The constitution provides:

- **Drives**: High-priority, permanent goals that bootstrap the attention mechanism
- **Constraints**: High-confidence beliefs about negative outcomes that guide ethical behavior

### Memory System

The `Memory` class manages all knowledge in the system:

- **Terms Map**: Key-value store of all known terms
- **Task Storage**: Short-term and long-term task collections
- **Indexing Systems**:
    - Implication Index: For fast retrieval of implications
    - Belief Index: For contextual belief retrieval
    - Cost Index: For computational cost tracking
- **Forgetting Strategies**: Time-based forgetting to manage memory limits

```javascript
class Memory {
    constructor() {
        this.terms = new Map();
        this.shortTermTasks = new Map();
        this.longTermTasks = new Map();
        this.implicationIndex = new Map();
        this.beliefIndex = new Map();
        this.costIndex = new Map();
    }
    
    addTerm(term) { /* ... */ }
    getTerm(key) { /* ... */ }
    addTasks(tasks) { /* ... */ }
    getTask(id) { /* ... */ }
    getHighestPriorityTasks(k = 20) { /* ... */ }
    queryTasks(filters = {}) { /* ... */ }
}
```

### Reasoner

The `Reasoner` performs symbolic inference using a rule-based system:

```javascript
class Reasoner {
    constructor({ strategy = new BagSamplingStrategy(), temporalReasoner = new TemporalReasoner() } = {}) {
        this.strategy = strategy;
        this.rules = rules; // Loaded from ./rules/index.js
        this.temporalReasoner = temporalReasoner;
    }
    
    performInference(focusSet, options = {}) { /* ... */ }
    _performSymbolicInference(focusSet, maxDerivedTasks) { /* ... */ }
    _performTemporalInference(focusSet) { /* ... */ }
}
```

Key inference rules include:

- **Deduction**: Classical logical deduction
- **Induction**: Evidence-based generalization
- **Abduction**: Hypothesis generation
- **Analogy**: Structure-preserving inference
- **Modus Ponens**: Conditional reasoning
- **Conversion/Contraposition**: Logical transformations

### Neuro-Symbolic LM Engine

The `LM` class bridges symbolic reasoning with neural capabilities:

```javascript
class LM {
    constructor() {
        this.pipelineFactory = new PipelineFactory();
        this.hypothesisGenerator = new HypothesisGenerator(this);
        this.explanationGenerator = new ExplanationGenerator(this._generate.bind(this));
        this.qaService = new QAService(this._generate.bind(this), this._getQAPipeline.bind(this));
        this.planRepairer = new PlanRepairer(this._getGenerationPipeline.bind(this), /* ... */);
        this.proactiveEnricher = new ProactiveEnricher(this._getGenerationPipeline.bind(this), /* ... */);
    }
    
    async bootstrapTerm(termKey, options = { sync: false }) { /* ... */ }
    async generateHypotheses(tasks, config = {}) { /* ... */ }
    async evaluateAndRankHypotheses(tasks, hypotheses) { /* ... */ }
    async explain(termKey, config = {}) { /* ... */ }
    async answerQuestion(question, context = null) { /* ... */ }
}
```

Specialized services include:

- **HypothesisGenerator**: Creative abduction and pattern discovery
- **PlanRepairer**: Alternative solutions when plans fail
- **ProactiveEnricher**: Knowledge graph expansion
- **QAService**: Natural language interaction
- **ExplanationGenerator**: Derivation history translation

### LM Integration Implementation Details

The LM module implements a comprehensive neuro-symbolic integration system:

#### Pipeline Factory

The `PipelineFactory` manages transformer model loading and caching:

```javascript
class PipelineFactory {
    constructor() {
        this._pipelines = new Map();
    }
    
    async get(type, model, options = {}) {
        // Implementation that loads and caches transformer pipelines
    }
    
    dispose() {
        // Clean up resources and dispose of pipelines
    }
}
```

Key features:

- **Model Caching**: Caches loaded models to avoid repeated loading
- **Resource Management**: Properly disposes of models to free memory
- **Multiple Model Types**: Supports feature extraction, text generation, and question answering models

#### XenovaLLM Integration

The system uses the XenovaLLM wrapper for transformer model integration:

```javascript
class XenovaLLM {
    constructor(pipeline) {
        this.pipeline = pipeline;
    }
    
    async _call(prompt, options = {}) {
        // Implementation that calls the transformer pipeline
    }
}
```

Key features:

- **Standardized Interface**: Provides a consistent interface for different transformer models
- **Error Handling**: Robust error handling for model inference
- **Performance Optimization**: Efficient batching and resource utilization

### Specialized LM Services

The LM module includes several specialized services for different cognitive functions:

#### Hypothesis Generator

The `HypothesisGenerator` creates new hypotheses based on existing knowledge:

```javascript
class HypothesisGenerator {
    constructor(lm) {
        this.lm = lm;
    }
    
    async generateHypotheses(tasks, config = {}) {
        // Implementation that generates hypotheses using LM
    }
    
    async evaluateAndRankHypotheses(tasks, hypotheses) {
        // Implementation that evaluates and ranks hypotheses
    }
}
```

Key features:

- **Creative Abduction**: Generates creative hypotheses for pattern discovery
- **Evaluation and Ranking**: Evaluates hypotheses for plausibility and relevance
- **Configurable Generation**: Supports different generation strategies through configuration

#### Explanation Generator

The `ExplanationGenerator` translates formal reasoning into natural language explanations:

```javascript
class ExplanationGenerator {
    constructor(generateFn) {
        this.generate = generateFn;
    }
    
    async explain(termKey, config = {}) {
        // Implementation that generates natural language explanations
    }
}
```

Key features:

- **Derivation History Translation**: Converts formal derivation chains into natural language
- **Context-Aware Explanations**: Generates explanations tailored to the context
- **Structured Output**: Produces structured explanations for consistent presentation

#### QA Service

The `QAService` enables natural language interaction with the system:

```javascript
class QAService {
    constructor(generateFn, getQAPipelineFn) {
        this.generate = generateFn;
        this.getQAPipeline = getQAPipelineFn;
    }
    
    async answerQuestion(question, context = null) {
        // Implementation that answers questions using LM
    }
}
```

Key features:

- **Question Answering**: Answers questions based on system knowledge
- **Context Integration**: Uses context to improve answer quality
- **Pipeline Optimization**: Uses specialized QA pipelines for better performance

#### Proactive Enricher

The `ProactiveEnricher` expands the knowledge graph proactively:

```javascript
class ProactiveEnricher {
    constructor(getGenerationPipeline, createStructuredChain, parseStructuredResult) {
        this.getGenerationPipeline = getGenerationPipeline;
        this.createStructuredChain = createStructuredChain;
        this.parseStructuredResult = parseStructuredResult;
    }
    
    async proactiveEnrichment(tasks) {
        // Implementation that generates new knowledge proactively
    }
}
```

Key features:

- **Knowledge Expansion**: Proactively generates new knowledge based on existing tasks
- **Structured Generation**: Produces structured output for integration into the knowledge graph
- **Context-Aware Generation**: Considers context when generating new knowledge

### Cognitive Cycle

The core processing loop implemented in `Cycle.js`:

1. **Perception**: Ingest new information from the world
2. **Prioritization**: Apply economic attention to all tasks
3. **Meta-Cognition**: Detect and analyze reasoning failures
4. **Reasoning**: Perform inference on salient tasks
5. **Enrichment**: Process new terms and execute goals

```javascript
class Cycle {
    async runOnce() {
        const context = {
            currentTime: Date.now(),
            driveEmbeddings: this.driveEmbeddings,
            allTasks: this.memory.getAllTasks(),
            contradictions: [],
            metaTasks: [],
            derivedTasks: [],
            proactiveTasks: [],
            executionResults: []
        };

        // PERCEPTION
        await this._runPerceptionPhase();

        // PRIORITIZATION
        this._runPrioritizationPhase(context);

        // META-COGNITION
        const {contradictions, metaTasks} = await this._runMetaCognitionPhase(context);
        context.contradictions = contradictions;
        context.metaTasks = metaTasks;

        // REASONING
        context.derivedTasks = await this._runReasoningPhase(context);

        // ENRICHMENT
        const {proactiveTasks} = await this._runEnrichmentPhase(context);
        context.proactiveTasks = proactiveTasks;

        // ACTION
        context.executionResults = await this._runActionPhase();

        EventBus.emit('SystemCycleEnded');

        return {
            derivedTasks: context.derivedTasks.length,
            contradictions: context.contradictions.length,
            metaTasks: context.metaTasks.length,
            proactiveTasks: context.proactiveTasks.length,
            executionResults: context.executionResults
        };
    }
}
```

### Meta-Cognition

The `MetaCognition` module handles self-correction:

```javascript
class MetaCognition {
    constructor() {
        this.contradictionAnalyzer = new ContradictionAnalyzer();
        this.resolutionStrategy = new ResolutionStrategy();
    }

    findContradictions(tasks) { /* ... */ }
    resolve({contradiction, strategy}) { /* ... */ }
    generateContradictionReport(contradictions) { /* ... */ }
}
```

Contradiction detection types:

- Direct negation
- Inheritance/implication conflicts
- Transitive conflicts
- Set conflicts
- Temporal conflicts
- Variable conflicts

Resolution strategies:

- Revision: Truth value revision
- Reconciliation: Contextual resolution
- Evidence gathering: Question generation
- Temporal analysis: Time-based resolution
- Causal analysis: Causal relationship examination

### Contradiction Detection Implementation

The `ContradictionAnalyzer` uses a strategy pattern to detect various types of contradictions:

```javascript
class ContradictionAnalyzer {
    constructor() {
        this.strategies = detectionStrategies;
    }

    analyze(task1, task2, parsed1, parsed2) {
        for (const strategy of this.strategies) {
            const result = strategy(task1, task2, parsed1, parsed2);
            if (result) {
                return result;
            }
        }
        return null;
    }

    calculateSeverity(contradictionType, task1, task2) {
        // Implementation based on contradiction type and task confidence
    }
}
```

Detection strategies include:

- **Direct Negation**: Direct contradiction between a statement and its negation
- **Inheritance Conflict**: Conflicting inheritance relationships
- **Implication Conflict**: Conflicting implication statements
- **Equivalence Conflict**: Conflicting equivalence statements
- **Set Conflict**: Contradictions in set membership
- **Intensional Set Conflict**: Contradictions in intensional sets
- **Conjunction Conflict**: Contradictions in conjunctive statements
- **Disjunction Conflict**: Contradictions in disjunctive statements
- **Frequency Conflict**: Contradictions in belief frequencies
- **Goal Conflict**: Conflicting goals with different preferences

### Contradiction Resolution Implementation

The `ResolutionStrategy` class implements multiple approaches to resolving contradictions:

```javascript
class ResolutionStrategy {
    constructor() {
        this.strategies = resolutionStrategies;
    }

    resolve(contradiction, strategy) {
        const selectedStrategy = strategy === 'auto' ? this._selectOptimalResolutionStrategy(contradiction) : strategy;
        const executor = this.strategies[selectedStrategy] || this.strategies.monitoring;
        return executor(contradiction, context);
    }

    _selectOptimalResolutionStrategy(contradiction) {
        // Automatic selection based on contradiction severity and type
    }
}
```

Resolution strategies include:

- **Revision**: Truth value revision for directly conflicting beliefs
- **Reconciliation**: Contextual resolution for beliefs that may be true in different contexts
- **Evidence Gathering**: Generate questions to gather more evidence about the contradiction
- **Temporal Analysis**: Analyze temporal aspects of conflicting beliefs
- **Causal Analysis**: Examine causal relationships to resolve conflicts
- **Hierarchical Reconciliation**: Resolve conflicts in hierarchical knowledge structures
- **Contextual Reconciliation**: Resolve contradictions based on contextual factors
- **External Validation**: Seek external validation for conflicting beliefs
- **Monitoring**: Monitor contradictions without immediate resolution
- **Truth Value Revision**: Specialized revision for truth value conflicts

### Planning System

The `Planner` supports multiple planning strategies:

```javascript
class Planner {
    constructor(memory, lm, actionExecutor, config = {}) {
        const strategyName = config.strategy || 'HTN';
        const PlannerClass = Planners[strategyName + 'Planner'];
        this.strategy = new PlannerClass(memory, lm, config.plannerConfig);
        this.actionExecutor = actionExecutor;
        this.planCache = new Map();
    }

    async createPlan(goalTask, failedPlan = null) { /* ... */ }
}
```

Supported strategies:

- **HTN (Hierarchical Task Network)**: Default strategy for structured planning
- **AStar**: Graph-based pathfinding approach

Plan execution:

```javascript
class Plan {
    constructor(steps, actionExecutor) {
        this.steps = steps;
        this.actionExecutor = actionExecutor;
    }
    
    async execute() { /* ... */ }
}
```

### Planning System Implementation Details

The planning system is designed to decompose complex goals into executable action sequences:

#### HTN Planner Implementation

The `HTNPlanner` implements Hierarchical Task Network planning:

```javascript
class HTNPlanner extends BasePlanner {
    constructor(memory, lm, config = {}) {
        super(memory, lm, config);
        this.maxDepth = config.maxDepth || 10;
        this.maxPlans = config.maxPlans || 5;
    }
    
    async findPlan(goalTask) {
        // Implementation that searches for applicable planning rules
        // and decomposes complex goals into primitive actions
    }
    
    _isAchieved(term) {
        // Check if a goal term is already satisfied in current state
    }
}
```

Key features:

- **Hierarchical Decomposition**: Complex goals are broken down into simpler sub-goals
- **Planning Knowledge**: Uses planning rules stored directly in the knowledge graph
- **Backtracking**: Implements backtracking search for finding valid plans
- **Plan Caching**: Caches successful plans to avoid recomputation

#### AStar Planner Implementation

The `AStarPlanner` implements graph-based pathfinding:

```javascript
class AStarPlanner extends BasePlanner {
    constructor(memory, lm, config = {}) {
        super(memory, lm, config);
        this.heuristicWeights = config.heuristicWeights || {
            distance: 1.0,
            cost: 1.0,
            time: 1.0
        };
    }
    
    async findPlan(goalTask) {
        // Implementation of A* search algorithm
        // with custom heuristic function
    }
    
    _heuristic(state, goal) {
        // Calculate heuristic value for A* search
    }
}
```

Key features:

- **Graph Search**: Uses A* algorithm for optimal pathfinding
- **Custom Heuristics**: Configurable heuristic weights for different factors
- **State Space Exploration**: Explores possible action sequences
- **Optimality**: Guarantees optimal solution when heuristic is admissible

#### Plan Repair and LM Integration

The planning system integrates with the LM module for handling plan failures:

```javascript
class PlanRepairer {
    constructor(getGenerationPipeline, createStructuredChain, parseStructuredResult) {
        this.getGenerationPipeline = getGenerationPipeline;
        this.createStructuredChain = createStructuredChain;
        this.parseStructuredResult = parseStructuredResult;
    }
    
    async suggestPlanRepair(goalTask, failedPlan) {
        // Use LM to generate alternative plans when existing ones fail
    }
}
```

Key features:

- **Failure Analysis**: Analyzes failed plans to understand the cause
- **Alternative Generation**: Uses LM to suggest alternative action sequences
- **Structured Output**: Generates plans in a structured format for execution
- **Integration**: Seamlessly integrates with the main planning system

### Core Component Implementation Details

#### Term Implementation

The `Term` class implements intelligent parsing and caching of Narsese structure:

```javascript
class Term {
    constructor(key, embedding = [], complexity = 1) {
        // ...
    }
    
    // Smart accessors for component terms with caching
    get subject() { /* ... */ }
    get predicate() { /* ... */ }
    get terms() { /* ... */ }
    
    // Semantic operations
    static findSimilarTerms(terms, targetTermKey, maxResults = 10) { /* ... */ }
    static structuralSimilarity(termKey1, termKey2) { /* ... */ }
    
    // Internal structure parsing with caching
    _getStructure() { /* ... */ }
    _getComponent(componentName, structure) { /* ... */ }
}
```

Key implementation features:

- **Intelligent Parsing**: Terms parse their own Narsese key upon instantiation, caching the parsed structure for
  efficient access
- **Component Caching**: Accessors for subject, predicate, and terms use an internal cache to avoid repeated parsing
- **Semantic Operations**: Includes methods for finding similar terms based on both semantic (embedding) and structural
  similarity
- **Immutability**: Terms are immutable once created, ensuring consistency and enabling caching optimizations

#### Task Implementation

The `Task` class manages stateful cognitive atoms with evidence-based truth values:

```javascript
class Task {
    constructor(term, punctuation, truthValue = {}, stamp = {}) {
        // ...
    }
    
    reviseTruthValue(newEvidence, weight = 0.5) { /* ... */ }
    touch() { /* ... */ }
    
    // Type checking helpers
    static isBelief(task) { /* ... */ }
    static isGoal(task) { /* ... */ }
    static isQuestion(task) { /* ... */ }
}
```

Key implementation features:

- **Evidence-Based Truth Values**: Truth values consist of frequency and confidence, updated through Bayesian revision
- **Temporal Stamping**: Tasks include creation time and optional occurrence time for temporal reasoning
- **Priority Management**: Tasks maintain a priority score for the economic attention mechanism
- **Validation**: Constructor validates term and punctuation arguments
- **Serialization Support**: toJSON and fromJSON methods for persistence

#### TaskFactory Implementation

All `Task` instances are created through a `TaskFactory` to ensure consistent initialization:

```javascript
class TaskFactory {
    static createTask(term, punctuation, truthValue = {}, stamp = {}) {
        // Centralized validation and creation logic
        return new Task(term, punctuation, truthValue, stamp);
    }
    
    static createBelief(term, truthValue = {}, stamp = {}) {
        return new Task(term, '.', truthValue, stamp);
    }
    
    static createGoal(term, truthValue = {}, stamp = {}) {
        return new Task(term, '!', truthValue, stamp);
    }
    
    static createQuestion(term, truthValue = {}, stamp = {}) {
        return new Task(term, '?', truthValue, stamp);
    }
}
```

#### Memory Implementation

The `Memory` class implements a comprehensive knowledge management system:

```javascript
class Memory {
    constructor() {
        this.terms = new Map();
        this.shortTermTasks = new Map();
        this.longTermTasks = new Map();
        this.implicationIndex = new Map();
        this.beliefIndex = new Map();
        this.costIndex = new Map();
    }
    
    addTerm(term) { /* ... */ }
    getTerm(key) { /* ... */ }
    addTasks(tasks) { /* ... */ }
    getTask(id) { /* ... */ }
    getHighestPriorityTasks(k = 20) { /* ... */ }
    queryTasks(filters = {}) { /* ... */ }
}
```

Key implementation features:

- **Dual Storage**: Separate collections for short-term and long-term tasks with consolidation mechanisms
- **Indexing Systems**: Multiple indexes for efficient retrieval (implication, belief, cost)
- **Memory Maintenance**: Periodic consolidation and pruning with configurable strategies
- **Query Interface**: Flexible task querying with filtering and sorting capabilities
- **Persistence Support**: Import/export functionality for state serialization

## Economic Attention Model

Priority calculation factors for tasks:

- **Truth Value**: Confidence and frequency of beliefs
- **Complexity**: Structural complexity of terms
- **Relevance**: Relationship to active goals and recent activities
- **Temporal Factors**: Recency and urgency of tasks

Resource allocation mechanisms:

- **Probabilistic Selection**: Bag data structure for priority-weighted task selection
- **Forgetting**: Decay of low-priority tasks
- **Attention Budget**: Distribution across cognitive processes

```javascript
class PriorityManager {
    calculatePriority(task, currentTime, driveEmbeddings) {
        // Implementation in src/reasoner/PriorityManager.js
        // Combines truth value, complexity, relevance, and temporal factors
    }
}
```

### Temporal Reasoning Implementation

The system implements temporal reasoning through specialized components:

```javascript
class TemporalReasoner {
    constructor() {
        this.patternDetector = new PatternDetector();
        this.temporalRules = temporalRules;
    }
    
    infer(focusSet) {
        // Apply temporal inference rules to the focus set
    }
    
    detectTemporalPatterns(tasks) {
        // Detect temporal patterns in task sequences
    }
}
```

Key temporal features:

- **Temporal Stamping**: Tasks include creation time and optional occurrence time
- **Temporal Inference Rules**: Specialized rules for reasoning about time-based relationships
- **Pattern Detection**: Identify temporal patterns in task sequences
- **Temporal Conflict Resolution**: Resolve contradictions involving temporal aspects

Temporal term types supported:

- **Predictive Implication**: `(task1 =\> task2)` - task1 predicts task2
- **Retrospective Implication**: `(task1 =/> task2)` - task1 implies task2 occurred after
- **Concurrent Implication**: `(task1 =<> task2)` - task1 and task2 occur concurrently
- **Temporal Operators**: `next`, `previous`, `always`, `eventually`

## Implementation Patterns

### Core Design Patterns

1. **Immutability**: Terms are immutable for consistency and caching
2. **Strategy Pattern**: Extensible contradiction resolution and planning
3. **Event-Driven Architecture**: Decoupled components via EventBus
4. **Factory Pattern**: Consistent object creation and validation
5. **Observer Pattern**: Event subscription and notification system

#### Immutability Implementation

Immutability is a core principle that ensures consistency and enables caching optimizations:

```javascript
// Terms are immutable once created
class Term {
    constructor(key, embedding = [], complexity = 1) {
        // Properties are set once and never modified
        Object.defineProperty(this, 'key', {value: key, writable: false});
        Object.defineProperty(this, 'embedding', {value: [...embedding], writable: false});
        Object.defineProperty(this, 'complexity', {value: complexity, writable: false});
    }
}
```

Benefits:

- **Consistency**: Immutable objects prevent unexpected state changes
- **Caching**: Safe to cache computed values since they won't change
- **Concurrency**: No need for locks when accessing immutable objects
- **Debugging**: Easier to trace issues since objects don't change

#### Strategy Pattern Implementation

The Strategy pattern enables dynamic algorithm selection:

```javascript
// Base strategy interface
class ResolutionStrategy {
    resolve(contradiction, context) {
        throw new Error('Must implement resolve method');
    }
}

// Concrete strategies
class RevisionStrategy extends ResolutionStrategy {
    resolve(contradiction, context) { /* ... */ }
}

class ReconciliationStrategy extends ResolutionStrategy {
    resolve(contradiction, context) { /* ... */ }
}

// Context that uses strategies
class MetaCognition {
    constructor() {
        this.resolutionStrategy = new ResolutionStrategy();
    }
    
    resolveContradiction(contradiction, strategyName) {
        const strategy = this.getStrategy(strategyName);
        return strategy.resolve(contradiction, context);
    }
}
```

Benefits:

- **Flexibility**: Easy to add new algorithms without changing existing code
- **Testability**: Each strategy can be tested independently
- **Maintainability**: Isolates algorithm-specific logic
- **Performance**: Can select optimal strategy based on context

### EventBus Implementation

The system uses a central `EventBus` for decoupled communication between components:

```javascript
class EventBus {
    constructor() {
        this.listeners = {};
        this.handlers = {};
    }

    on(event, callback) { /* ... */ }
    off(event, callback) { /* ... */ }
    emit(event, data) { /* ... */ }
    handle(requestType, handler) { /* ... */ }
    async request(requestType, data) { /* ... */ }
}
```

Key features:

- **Event Subscription**: Components can subscribe to events using `on()` method
- **Event Publishing**: Components can publish events using `emit()` method
- **Request/Response**: Synchronous request handling with `handle()` and `request()` methods
- **Decoupling**: Components don't need direct references to each other
- **Flexibility**: Easy to add new event types and handlers without modifying existing code

Common events in the system:

- `NewTasksCreated`: Emitted when new tasks are created
- `SystemCycleEnded`: Emitted at the end of each cognitive cycle
- Custom events for specific modules (e.g., perception, action execution)

### Performance Optimizations

1. **Term Parsing Caching**: Terms parse and cache their structure on instantiation
2. **Bag Data Structure**: Probabilistic priority selection for efficient task sampling
3. **Lazy Evaluation**: Complex term structures evaluated only when needed
4. **Batch Processing**: Embedding generation queued and processed in batches
5. **Memory Management**: Forgetting strategies for long-running systems

#### Term Parsing Caching Implementation

Terms cache their parsed structure to avoid repeated parsing:

```javascript
class Term {
    constructor(key, embedding = [], complexity = 1) {
        this.key = key;
        this.embedding = [...embedding];
        this.complexity = complexity;
        this._structure = null; // Cached parsed structure
        this._componentCache = new Map(); // Cached component terms
    }
    
    _getStructure() {
        if (this._structure === null) {
            // Parse only once and cache the result
            this._structure = parseTerm(this.key);
        }
        return this._structure;
    }
    
    get subject() {
        // Lazy evaluation with caching
        if (!this._componentCache.has('subject')) {
            const structure = this._getStructure();
            const subjectTerm = structure ? structure.subject : null;
            this._componentCache.set('subject', subjectTerm);
        }
        return this._componentCache.get('subject');
    }
}
```

#### Bag Data Structure Implementation

The Bag data structure enables efficient probabilistic task selection:

```javascript
class Bag {
    constructor(capacity = 1000) {
        this.capacity = capacity;
        this.items = new Map();
        this.levels = new Array(10).fill(null).map(() => new Set());
    }
    
    add(item, priority) {
        // Implementation that distributes items across priority levels
    }
    
    sample() {
        // Probabilistic sampling based on priority levels
    }
    
    remove(itemId) {
        // Remove item from bag
    }
}
```

#### Lazy Evaluation Implementation

Complex computations are deferred until needed:

```javascript
class Term {
    constructor(key) {
        this.key = key;
        this._embedding = null;
        this._isEmbeddingComputed = false;
    }
    
    get embedding() {
        if (!this._isEmbeddingComputed) {
            // Only compute embedding when first accessed
            this._embedding = this._computeEmbedding();
            this._isEmbeddingComputed = true;
        }
        return this._embedding;
    }
    
    _computeEmbedding() {
        // Expensive computation deferred until needed
    }
}
```

#### Batch Processing Implementation

Operations are batched to improve efficiency:

```javascript
class LM {
    constructor() {
        this.embeddingQueue = [];
        this.isProcessingEmbeddings = false;
    }
    
    async processEmbeddingQueue() {
        const batchSize = 32; // Process embeddings in batches
        const delay = 100; // Delay between batches
        
        while (this.isProcessingEmbeddings) {
            if (this.embeddingQueue.length === 0) {
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }
            
            // Process batch of embeddings
            const batch = this.embeddingQueue.splice(0, batchSize);
            await Promise.all(batch.map(term => this._generateEmbedding(term)));
            
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}
```

#### Memory Management Implementation

Forgetting strategies prevent memory overflow in long-running systems:

```javascript
class Memory {
    constructor() {
        this.forgettingStrategy = new TimeBasedForgettingStrategy();
    }
    
    _pruneMemory() {
        if (!this.forgettingStrategy) return;
        
        const options = config.memory.FORGETTING_STRATEGY_OPTIONS || {};
        this.shortTermTasks = this.forgettingStrategy.prune(this.shortTermTasks, options.shortTerm);
        this.longTermTasks = this.forgettingStrategy.prune(this.longTermTasks, options.longTerm);
    }
}

class TimeBasedForgettingStrategy {
    prune(tasks, options) {
        const now = Date.now();
        const threshold = options.timeThreshold || 86400000; // 24 hours
        
        for (const [id, task] of tasks) {
            const age = now - Number(task.state.stamp.creationTime);
            if (age > threshold && task.state.priority < options.priorityThreshold) {
                tasks.delete(id);
            }
        }
        return tasks;
    }
}
```

### Extensibility Points

1. **Inference Rules**: Adding new rules to `src/reasoner/rules/`
2. **Contradiction Resolution**: Implementing additional strategies in `src/reasoner/strategies/resolution/`
3. **LM Services**: Extending LM capabilities with new services
4. **Constitution**: Customizing with domain-specific values
5. **Planning Strategies**: Adding new planners in `src/reasoner/`

#### Inference Rules Extensibility

New inference rules can be added by implementing the rule interface:

```javascript
// Example rule implementation
const newRule = {
    name: 'NewRule',
    arity: 2, // Number of operands required
    operands: [
        (task) => Task.isBelief(task), // Validation functions for operands
        (task) => Task.isBelief(task)
    ],
    condition: (task1, task2) => {
        // Condition that must be met for rule to apply
        return true;
    },
    action: (task1, task2) => {
        // Action to perform when rule applies
        return derivedTask;
    }
};

// Add to rules index
// src/reasoner/rules/index.js
import newRule from './new-rule.js';

export default [
    // ... existing rules
    newRule
];
```

#### Contradiction Resolution Extensibility

New contradiction resolution strategies can be implemented by extending the strategy pattern:

```javascript
// Example resolution strategy
const newResolutionStrategy = (contradiction, context) => {
    // Implementation of new resolution approach
    // Return array of tasks to address contradiction
    return [];
};

// Add to resolution strategies
// src/reasoner/strategies/resolution/index.js
import newResolutionStrategy from './new-resolution-strategy.js';

export const resolutionStrategies = {
    // ... existing strategies
    new_resolution_strategy: newResolutionStrategy
};
```

#### LM Services Extensibility

New LM services can be added by implementing service classes:

```javascript
// Example new LM service
class NewLMService {
    constructor(getGenerationPipeline, createStructuredChain, parseStructuredResult) {
        this.getGenerationPipeline = getGenerationPipeline;
        this.createStructuredChain = createStructuredChain;
        this.parseStructuredResult = parseStructuredResult;
    }
    
    async newServiceMethod(input) {
        // Implementation of new LM capability
    }
}

// Integration with main LM class
// src/lm/LM.js
import NewLMService from './NewLMService.js';

class LM {
    constructor() {
        // ... existing services
        this.newService = new NewLMService(
            this._getGenerationPipeline.bind(this),
            this._createStructuredChain.bind(this),
            this._parseStructuredResult.bind(this)
        );
    }
}
```

#### Constitution Customization

The Constitution can be customized for domain-specific applications:

```javascript
// Example domain-specific constitution
const DOMAIN_DRIVES = [
    new Task(parseTerm('DomainSpecificGoal'), '!'),
    new Task(parseTerm('DomainConstraint'), '.')
];

const DOMAIN_CONSTRAINTS = [
    new Task(parseTerm('DomainSafetyConstraint'), '.')
];

const DOMAIN_CONSTITUTION = Object.freeze([
    ...DOMAIN_DRIVES,
    ...DOMAIN_CONSTRAINTS
]);

// Usage in system initialization
const system = new System({constitution: DOMAIN_CONSTITUTION});
```

#### Planning Strategies Extensibility

New planning strategies can be added by extending the BasePlanner:

```javascript
// Example new planning strategy
class NewPlanner extends BasePlanner {
    constructor(memory, lm, config = {}) {
        super(memory, lm, config);
    }
    
    async findPlan(goalTask) {
        // Implementation of new planning approach
        return planSteps;
    }
}

// Register new planner
// src/reasoner/index.js
import NewPlanner from './NewPlanner.js';

const Planners = {
    // ... existing planners
    NewPlanner
};

export default Planners;
```

## System Workflow

1. **Initialization**:
    - System components are created
    - Constitution tasks are loaded into memory
    - Term embeddings are bootstrapped

2. **Cognitive Cycle Execution**:
    - Perception processes incoming events
    - Tasks are prioritized based on economic attention
    - Meta-cognition detects contradictions
    - Reasoner performs symbolic inference
    - LM generates hypotheses when needed
    - New terms are semantically enriched
    - Goals are planned and executed

3. **Continuous Operation**:
    - Memory maintenance (consolidation, pruning)
    - Event processing through EventBus
    - Self-monitoring and adaptation

## Testing and Validation

The system includes multiple test suites:

1. **Unit Tests**: Component-level testing (Term, Task, Memory, etc.)
2. **Integration Tests**: Cross-component functionality testing
3. **System Tests**: End-to-end cognitive cycle testing
4. **Demo Applications**: Practical demonstrations of capabilities

### Test Implementation Details

The testing framework follows a hierarchical approach:

#### Unit Testing

Component-level tests ensure individual classes function correctly:

```javascript
// Example unit test for Term class
describe('Term', () => {
    test('should parse and cache structure correctly', () => {
        const term = new Term('(cat --> animal)');
        expect(term.type).toBe('Inheritance');
        expect(term.subject.key).toBe('cat');
        expect(term.predicate.key).toBe('animal');
    });
    
    test('should find similar terms based on embedding', () => {
        const terms = new Map();
        // Add test terms
        const similar = Term.findSimilarTerms(terms, 'cat', 5);
        expect(similar.length).toBeLessThanOrEqual(5);
    });
});
```

#### Integration Testing

Cross-component tests verify interactions between modules:

```javascript
// Example integration test for Reasoner and Memory
describe('Reasoner-Memory Integration', () => {
    test('should derive new tasks from existing beliefs', async () => {
        const memory = new Memory();
        const reasoner = new Reasoner();
        
        // Add test beliefs to memory
        const beliefs = [
            new Task('(cat --> animal)', '.', {frequency: 1.0, confidence: 0.9}),
            new Task('(animal --> mammal)', '.', {frequency: 1.0, confidence: 0.8})
        ];
        memory.addTasks(beliefs);
        
        // Perform inference
        const focusSet = memory.getHighestPriorityTasks(10);
        const derivedTasks = reasoner.performInference(focusSet);
        
        // Verify derived task
        expect(derivedTasks.length).toBeGreaterThan(0);
        const derivedTask = derivedTasks[0];
        expect(derivedTask.termKey).toBe('(cat --> mammal)');
    });
});
```

#### System Testing

End-to-end tests validate complete cognitive cycles:

```javascript
// Example system test for cognitive cycle
describe('Cognitive Cycle', () => {
    test('should process perception, reasoning, and action', async () => {
        const system = new System();
        await system.initialize();
        
        // Add initial knowledge
        const initialBelief = new Task('(test --> concept)', '.', {frequency: 1.0, confidence: 0.9});
        await system.addTasks([initialBelief]);
        
        // Run multiple cycles
        const results = [];
        for (let i = 0; i < 5; i++) {
            const result = await system.runCycle();
            results.push(result);
        }
        
        // Verify system behavior
        const totalDerivedTasks = results.reduce((sum, r) => sum + r.derivedTasks, 0);
        expect(totalDerivedTasks).toBeGreaterThan(0);
    });
});
```

#### Demo Applications Testing

Demo applications provide practical validation of system capabilities:

```javascript
// Example demo test
describe('Math Inference Demo', () => {
    test('should correctly infer mathematical relationships', async () => {
        const system = new System();
        await system.initialize();
        
        // Load demo knowledge
        const demoKnowledge = [
            new Task('(odd_number * odd_number --> odd_number)', '.', {frequency: 1.0, confidence: 0.9}),
            new Task('(3 --> odd_number)', '.', {frequency: 1.0, confidence: 1.0})
        ];
        await system.addTasks(demoKnowledge);
        
        // Run inference cycles
        for (let i = 0; i < 10; i++) {
            await system.runCycle();
        }
        
        // Check for derived conclusions
        const derivedTasks = system.memory.queryTasks({termKey: '(3 * 3 --> odd_number)'});
        expect(derivedTasks.length).toBeGreaterThan(0);
    });
});
```

Key test areas:

- Term parsing and manipulation
- Task creation and management
- Inference rule application
- Contradiction detection and resolution
- Planning and execution
- Memory operations and forgetting
- LM integration
- Temporal reasoning
- EventBus communication
- Performance and scalability

### Continuous Integration

The system uses automated testing for continuous validation:

```yaml
# Example CI configuration
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '16'
    - name: Install dependencies
      run: npm install
    - name: Run tests
      run: npm test
    - name: Run linting
      run: npm run lint
    - name: Run type checking
      run: npm run type-check
```

## Future Enhancements

1. **Advanced Meta-Cognition**: More sophisticated contradiction resolution mechanisms
2. **Enhanced LM Capabilities**: Improved hypothesis generation and explanation
3. **Complex Perception Interfaces**: Sophisticated perception processing
4. **Extended Action Execution**: Enhanced action execution system
5. **Improved Temporal Reasoning**: Better temporal reasoning capabilities
6. **Dynamic Knowledge Graph Federation**: Distributed knowledge graph synchronization
7. **Cognitive Delegation**: Specialized cognitive task offloading
8. **Self-Diagnosis**: Automated test failure analysis
9. **Proactive Cognitive Augmentation**: Context-aware assistance

This design document provides a comprehensive overview of the SeNARS cognitive system architecture, highlighting its
neuro-symbolic approach to AI reasoning, its modular design, and its extensibility for future enhancements.