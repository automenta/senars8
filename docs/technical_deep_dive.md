---
theme: dracula
title: 'SeNARS: A Technical Deep Dive'
background: https://source.unsplash.com/1600x900/?binary-code
highlighter:
  engine: shiki
  theme: 'dracula'
lineNumbers: true
transition: slide-up
---

# SeNARS

## A Technical Deep Dive

<div class="center text-sm opacity-75">
  For Developers and Researchers
</div>

---

# Agenda

1. **Core Architecture & Philosophy**
2. **The Cognitive Cycle: How SeNARS "Thinks"**
3. **Knowledge Representation: Narsese Grammar**
4. **The Neuro-Symbolic Bridge in Detail**
5. **Advanced Reasoning: Temporal & Planning**
6. **Getting Involved: The Development Roadmap**

---

# 1. Core Architecture & Philosophy

- **Pragmatism under Scarcity**: The system operates under the assumption of finite computational resources.
- **Economic Attention**: A priority system that directs focus to the most salient `Task`s.
- **Unified Knowledge Hypergraph**: All `Term`s and `Task`s reside in a central `Memory` component.
- **Modularity & Extensibility**: Components are decoupled and assembled by a `SystemFactory`.

```mermaid
graph TD
    subgraph "System Core"
        A[System API]
        F[SystemFactory]
        I[Introspection API]
    end

    subgraph "Cognitive Components"
        M[Memory]
        R[Reasoner]
        L[LM]
        P[Planner]
        AE[Action Executor]
        C[Cycle]
    end

    F -- Assembles --> A
    A -- Exposes --> I
    A -- Delegates to --> C
    C -- Orchestrates --> M & R & L & P & AE
```

---

# The Three Pillars: Term, Task, Memory

<div class="grid grid-cols-3 gap-4">
  <div class="p-4 bg-blue-500 bg-opacity-20 rounded text-center">
    <div class="font-bold text-lg">Term</div>
    <div class="text-2xl mb-2">🔤</div>
    <div class="text-sm">An **immutable** representation of a concept. The stable vocabulary of the system.</div>
    <div class="text-xs font-mono mt-2 p-1 bg-gray-700 rounded">`(cat --> animal)`</div>
  </div>
  <div class="p-4 bg-green-500 bg-opacity-20 rounded text-center">
    <div class="font-bold text-lg">Task</div>
    <div class="text-2xl mb-2">🎯</div>
    <div class="text-sm">A **stateful** unit of cognitive work (belief, goal, or question) with dynamic priority.</div>
    <div class="text-xs font-mono mt-2 p-1 bg-gray-700 rounded">`Task { term: "(cat --> animal)", punc: '.', truth: { f:1, c:0.9 } }`</div>
  </div>
  <div class="p-4 bg-purple-500 bg-opacity-20 rounded text-center">
    <div class="font-bold text-lg">Memory</div>
    <div class="text-2xl mb-2">💾</div>
    <div class="text-sm">The central **knowledge hypergraph** with specialized indexes and a forgetting mechanism.</div>
    <div class="text-xs font-mono mt-2 p-1 bg-gray-700 rounded">`Memory { terms: [...], tasks: [...] }`</div>
  </div>
</div>

---

# 2. The Cognitive Cycle

The system "thinks" in a discrete loop that orchestrates all cognitive processes.

```mermaid
flowchart TD
    A[Perception] --> B(Prioritization<br/>Economic Attention Model)
    B --> C{Meta-Cognition<br/>Contradiction Detection}
    C --> D[Reasoning<br/>Inference on Salient Tasks]
    D --> E(Enrichment & Action<br/>LM Services & Action Executor)
    E --> A
```

| Phase              | Description                                                                      |
|--------------------|----------------------------------------------------------------------------------|
| **Perception**     | Ingests new information from the environment into `Task`s.                       |
| **Prioritization** | Calculates the priority of all `Task`s in `Memory`.                              |
| **Meta-Cognition** | Scans for contradictions and reasoning failures, generating goals to fix them.   |
| **Reasoning**      | Applies formal inference rules to high-priority `Task`s to derive new knowledge. |
| **Enrichment**     | Triggers LM services for creative input or executes `Action`s on achieved goals. |

---

# 3. Knowledge Representation: Narsese

SeNARS uses a rich, formal grammar called Narsese to represent knowledge with precision.

| Type                     | Syntax                     | Example                            | Purpose                                 |
|--------------------------|----------------------------|------------------------------------|-----------------------------------------|
| **Inheritance**          | `<subject --> predicate>`  | `(cat --> mammal)`                 | Represents an "is-a" relationship.      |
| **Implication**          | `<premise ==> conclusion>` | `(raining ==> wet_streets)`        | Represents a predictive or causal link. |
| **Conjunction**          | `(&, term1, term2, ...)`   | `(&, cat, furry)`                  | Represents a logical AND.               |
| **Negation**             | `(--, term)`               | `(--, cat)`                        | Represents logical NOT.                 |
| **Temporal Implication** | `<premise =/> conclusion>` | `(see_lightning =/> hear_thunder)` | Represents a temporal sequence.         |

This formal grammar is the foundation for the system's rigorous, explainable reasoning capabilities.

---

# 4. The Neuro-Symbolic Bridge

The LM is not a black-box brain; it's a suite of specialized services orchestrated by the symbolic core.

```mermaid
graph TD
    A[Symbolic Reasoner] -- Identifies Gap --> B{LM Service Bus}
    B --> C[HypothesisGenerator]
    B --> D[PlanRepairer]
    B --> E[ExplanationGenerator]
    B --> F[QAService]

    C -- Creative Ideas --> G[Memory]
    D -- Novel Solutions --> G
    E -- Fluent Narratives --> H[Output]
    F -- Natural Language --> H

    subgraph "Symbolic Core"
        A
        G
    end
    subgraph "LM Services (Pluggable)"
        B
        C
        D
        E
        F
    end

    style A fill:#4F86C6,stroke:#333,stroke-width:2px
    style B fill:#8E6C88,stroke:#333,stroke-width:2px
```

The **Reasoner** maintains control, calling on the **LM** for specific tasks like generating creative hypotheses when
logic reaches an impasse, or translating formal proofs into human-readable text.

---

# 5. Advanced Reasoning

### Temporal Reasoning

SeNARS has specialized mechanisms for reasoning about time.

- **Temporal Relationship Inference**: Determines relationships between events (before, after, concurrent).
- **Pattern Detection**: Identifies periodic and sequential patterns in data.
- **Future Prediction**: Forecasts future `Task` occurrences based on learned temporal implications.

### Planning

The system supports multiple planning strategies, selectable via configuration.

- **HTN (Hierarchical Task Network)**: The default planner, which decomposes complex goals into primitive, executable
  actions. It's robust and well-suited for structured problems.
- **A* Search**: An experimental, heuristic-based planner that can find optimal paths in a state space.

---

# 6. Development Roadmap & Getting Involved

We are actively working on several key areas to enhance the system's capabilities.

<div class="grid grid-cols-2 gap-4 mt-4">
  <div class="p-4 bg-blue-500 bg-opacity-20 rounded">
    <div class="font-bold text-lg mb-2">Core Cognition & Self-Improvement</div>
    <ul class="text-sm space-y-1 list-disc list-inside">
      <li>Self-tuning planners</li>
      <li>Principled goal refinement</li>
      <li>Auditable Constitution evolution</li>
    </ul>
  </div>
  <div class="p-4 bg-green-500 bg-opacity-20 rounded">
    <div class="font-bold text-lg mb-2">Knowledge Architecture & Scalability</div>
    <ul class="text-sm space-y-1 list-disc list-inside">
      <li>Vector database integration</li>
      <li>Hybrid memory systems</li>
      <li>Decentralized knowledge federation</li>
    </ul>
  </div>
</div>

We welcome contributions! Please see the `README.md` for details on how to get started.

---

# Q&A

<div class="center text-lg mt-8">
  Thank you.
</div>

<div class="center text-sm opacity-75 mt-4">
  [github.com/automenta/senars8](https://github.com/automenta/senars8)
</div>
