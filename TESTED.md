# SeNARS System Functionality Manifest

This document provides a comprehensive overview of all useful system functionality that is demonstrated in the
codebase's unit tests and demos. It serves as a manifest of verified capabilities, organized by core components and
features.

## Core Knowledge Representation

### Term System

- **Immutable Concept Representation**: Terms represent unique concepts with Narsese syntax (e.g., `cat`,
  `(cat --> animal)`)
- **Intelligent Parsing**: Terms automatically parse their Narsese structure upon instantiation
- **Semantic Grounding**: Terms are associated with semantic vector embeddings from language models
- **Complexity Calculation**: Terms maintain a structural complexity measure
- **Component Access**: Terms provide convenient access to their components (subject, predicate, etc.)
- **Equality Checking**: Terms can be compared for equality
- **Serialization**: Terms can be converted to/from JSON format

### Task System

- **Cognitive Atoms**: Tasks represent specific cognitive acts (beliefs, goals, questions) about Terms
- **Truth Value Management**: Tasks maintain frequency and confidence values representing belief strength
- **Priority Calculation**: Tasks have priority scores for attention allocation
- **Temporal Stamping**: Tasks track creation time and occurrence time for temporal reasoning
- **Type Differentiation**: Tasks distinguish between beliefs (.), goals (!), and questions (?)
- **Truth Value Revision**: Tasks can update their truth values based on new evidence
- **Serialization**: Tasks can be converted to/from JSON format

## Memory Management

### Dual Memory System

- **Short-term Memory**: Active tasks prioritized for immediate processing
- **Long-term Memory**: Consolidated tasks with high importance or confidence
- **Memory Consolidation**: Automatic transfer of important tasks from short-term to long-term memory
- **Forgetting Mechanisms**: Time-based pruning of expired, unimportant tasks
- **Priority-based Selection**: Probabilistic selection of high-priority tasks for processing
- **Statistics Tracking**: Memory maintains statistics about stored terms and tasks

### Knowledge Indexing

- **Belief Indexing**: Tasks indexed by their term keys for efficient retrieval
- **Implication Indexing**: Planning knowledge indexed for rapid access during planning
- **Cost Indexing**: Action costs indexed for planning efficiency
- **Query Interface**: Flexible querying of tasks based on various criteria

## Reasoning Engine

### Inference Rules

- **Deduction**: Classical logical deduction (`<M --> P>, <S --> M> |- <S --> P>`)
- **Induction**: Evidence-based generalization (`<M --> P>, <M --> S> |- <S --> P>`)
- **Abduction**: Hypothesis generation for explanation (`<P --> M>, <S --> M> |- <S --> P>`)
- **Analogy**: Structure-preserving inference between similar relations (`<M --> P>, <M <-> S> |- <S --> P>`)
- **Modus Ponens**: Inference from implication and antecedent to consequent
- **Inheritance Chaining**: Transitive reasoning through inheritance relations

### Meta-Cognition

- **Contradiction Detection**: System identifies contradictions between beliefs
- **Contradiction Classification**: Different types of contradictions are classified by severity
- **Resolution Strategies**: Multiple strategies for resolving contradictions:
    - Revision (confidence reduction)
    - Evidence gathering (generating questions)
    - Causal analysis (investigating causes)
    - Temporal analysis (temporal relationship examination)
    - Contextual reconciliation (context-sensitive resolution)
- **Self-Reflection**: System generates meta-tasks to investigate its own reasoning

### Planning

- **Hierarchical Task Network (HTN) Planning**: Decomposition of complex goals into primitive actions
- **A* Planning**: Heuristic search-based planning with multiple weighting factors
- **Plan Cost Calculation**: Estimation of plan execution costs
- **Task Difficulty Assessment**: Evaluation of individual task difficulty for planning
- **Strategy Selection**: Dynamic selection between different planning approaches
- **Plan Validation**: Checking if goals are already achieved
- **Multi-level Decomposition**: Handling complex nested planning problems

## Temporal Reasoning

- **Temporal Relationship Inference**: Determination of temporal relationships between events
- **Temporal Pattern Detection**: Identification of periodic and sequential patterns
- **Temporal Cycle Detection**: Recognition of recurring temporal sequences
- **Temporal Abstraction**: Creation of higher-level temporal concepts
- **Anomaly Detection**: Identification of temporal anomalies
- **Future Prediction**: Prediction of future task occurrences
- **Temporal Clustering**: Grouping of temporally related tasks
- **Temporal Coherence**: Calculation of temporal consistency measures

## Language Model Integration

### Neuro-Symbolic Bridge

- **Embedding Generation**: Automatic generation of semantic embeddings for terms
- **Hypothesis Generation**: Creative generation of hypotheses from observations
    - Causal hypotheses
    - Predictive hypotheses
    - Comprehensive hypotheses
- **Hypothesis Evaluation**: Semantic similarity-based ranking of hypotheses
- **Hypothesis Refinement**: Formalization and simplification of generated hypotheses
- **Explanation Generation**: Natural language explanations of reasoning chains
- **Question Answering**: Natural language question answering capabilities
- **Plan Repair**: Suggestions for alternative plans when execution fails
- **Proactive Enrichment**: Automatic expansion of knowledge based on new information
- **Counterfactual Reasoning**: Exploring alternative scenarios

## Attention and Priority Management

### Economic Attention Model

- **Priority Calculation**: Dynamic priority computation based on truth value, complexity, and relevance
- **Probabilistic Selection**: Bag-based probabilistic selection of tasks for processing
- **Resource Allocation**: Efficient distribution of attention across cognitive processes

## System Architecture

### Event-Driven Design

- **Event Bus**: Central communication mechanism for decoupled components
- **Event Subscription**: Components can subscribe to and publish events
- **Decoupled Communication**: Components communicate without direct dependencies

### Constitution

- **Immutable Foundation**: Permanent set of drives and constraints
- **Core Motivations**: Fundamental system drives (AcquireKnowledge, ReduceUncertainty, MaintainCoherence)
- **Safety Constraints**: Immutable beliefs about negative outcomes

## Execution and Action

### Action Execution

- **Primitive Action Execution**: Direct execution of simple actions
- **Parallel Execution**: Concurrent execution of multiple actions
- **Conditional Actions**: Execution based on conditional relationships
- **Hierarchical Planning**: Complex multi-step action sequences
- **Choice Actions**: Selection between alternative action approaches
- **Rollback Mechanisms**: Recovery from failed action executions

## Testing and Verification

### Unit Testing

- **Core Component Testing**: Individual testing of Term, Task, and Memory components
- **Reasoning Logic Testing**: Verification of inference rules and meta-cognition
- **Memory Management Testing**: Validation of consolidation and forgetting mechanisms
- **Planning Algorithm Testing**: Verification of HTN and A* planning capabilities
- **Cost Management Testing**: Validation of task difficulty and plan cost calculations

### Integration Testing

- **End-to-End Reasoning**: Testing of complete reasoning cycles
- **Planning Integration**: Verification of planning with memory and reasoning components
- **Temporal Reasoning Integration**: Testing of temporal reasoning with core components
- **Narsese Parsing**: Comprehensive validation of Narsese term parsing

### System Testing

- **Contradiction Resolution**: Verification of complete contradiction detection and resolution workflows
- **Complex Scenario Testing**: Testing of comprehensive cognitive scenarios

## Demonstrated Capabilities

### Basic Reasoning

- Inheritance chaining (e.g., cat->mammal + mammal->animal => cat->animal)
- Modus ponens inference
- Contradiction detection and resolution

### Advanced Reasoning

- Temporal pattern recognition
- Creative hypothesis generation
- Multi-step planning with complex goal decomposition
- Meta-cognitive self-reflection and self-improvement

### Knowledge Management

- Automatic forgetting of unimportant information
- Consolidation of important knowledge to long-term memory
- Semantic similarity-based knowledge retrieval

### Cognitive Control

- Dynamic switching between different planning strategies (HTN vs A* planning)
- Adaptive attention allocation based on task importance
- Self-monitoring for reasoning consistency

### Narsese Support

- **Atomic Terms**: Simple terms like `cat`
- **Inheritance Relations**: `(cat --> mammal)`
- **Implication Relations**: `(cat ==> furry)`
- **Negation**: `(--, cat)`
- **Conjunction**: `(&, cat, dog)`
- **Disjunction**: `(||, cat, dog)`
- **Extensional Difference**: `(#, cat, dog)`
- **Intensional Difference**: `(\\, cat, dog)`
- **Instance Relations**: `(cat {-- animal)`
- **Property Relations**: `(cat --} furry)`
- **Nested Expressions**: `(cat --> (&, furry, intelligent))`

This manifest represents the currently implemented and tested functionality of the SeNARS cognitive system. All features
listed here are demonstrated through either unit tests or runnable demos in the codebase.