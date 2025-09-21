# SeNARS: A Conceptual Overview

Welcome to the SeNARS technical overview. This document provides a deeper, more conceptual look at the system's
architecture and is intended for developers who want to understand the "how" behind the system's operation. It serves as
a bridge between the high-level `README.md` and the source code itself.

## The Core Philosophy: Principled, Pragmatic Cognition

SeNARS is designed to emulate a pragmatic "stream of consciousness." It doesn't attempt to solve every problem at once.
Instead, it operates under the assumption of **finite resources**, forcing it to make continuous, intelligent decisions
about what to focus on. This is achieved through a core principle we call **Economic Attention**, where every piece of
knowledge and every goal (`Task`) is given a priority based on its relevance, urgency, and the system's confidence in
it.

## The Three Pillars of SeNARS

The architecture is built upon three fundamental and deeply interconnected components: `Term`, `Task`, and `Memory`.

### 1. `Term`: The Vocabulary of Thought

A `Term` is an **immutable** representation of a concept. It is the fundamental building block of knowledge in the
system. Terms can be simple atoms or complex, nested structures that represent relationships.

- **Examples**: `cat`, `(cat --> animal)`, `((&, cat, furry) ==> friendly)`
- **Immutability**: Once a `Term` is created, it cannot be changed. This ensures that concepts remain stable and
  consistent throughout the system's lifetime.
- **Intelligent Design**: Terms are not just strings; they are objects that understand their own structure. A `Term`
  like `(cat --> animal)` can be queried for its subject (`cat`) and predicate (`animal`) without needing to be
  re-parsed every time. This makes the reasoning process highly efficient.

### 2. `Task`: The Atoms of Cognition

A `Task` is a **stateful, dynamic** unit of cognitive work. It represents a specific piece of information the system is
currently "thinking about." Each `Task` is fundamentally a wrapper around a `Term`, but with crucial state information
attached.

- **Structure**: A `Task` combines a `Term` with punctuation (`.`, `!`, `?`) to represent a **belief**, a **goal**, or a
  **question**.
- **Stateful Nature**: Each `Task` holds critical, ever-changing state, including:
    - **Truth Value**: A confidence score indicating how much the system believes the `Task` to be true.
    - **Priority**: A dynamically calculated value that determines its importance in the cognitive cycle.
    - **Temporal Stamps**: Information about when the `Task` was created and last accessed.

### 3. `Memory`: The Unified Knowledge Hypergraph

`Memory` is the central hub of the system, storing and managing all `Term`s and `Task`s in a unified knowledge
hypergraph. It is more than just a database; it is an active component responsible for organizing knowledge for
efficient processing.

- **Dual-Storage System**: `Memory` maintains both a short-term and long-term storage, analogous to human working memory
  and long-term memory.
- **Specialized Indexing**: To facilitate rapid reasoning, `Memory` uses several specialized indexes to retrieve
  relevant information quickly. For example, it maintains an index of all implications (`(A ==> B)`) to accelerate
  planning and deduction.
- **Forgetting Mechanism**: To manage finite resources, `Memory` includes a forgetting mechanism that periodically
  prunes old or low-priority `Task`s, ensuring the system remains focused on what's most important.

## The Cognitive Cycle: A Stream of Consciousness

The SeNARS system "thinks" in a discrete loop called the **Cognitive Cycle**. This cycle is the heartbeat of the
architecture, orchestrating the flow of information and reasoning between all components. Each cycle consists of several
phases:

1. **Perception**: New information from the external world is taken in and converted into `Task`s.
2. **Prioritization**: The **Economic Attention** model calculates the priority of all `Task`s in `Memory`.
3. **Reasoning**: The `Reasoner` selects the highest-priority `Task`s and applies formal inference rules (e.g.,
   deduction, induction, abduction) to derive new knowledge.
4. **Meta-Cognition**: The system analyzes its own performance, detects contradictions or reasoning failures, and
   generates new goals to resolve them.
5. **Enrichment & Action**: The `LM` (Language Model) component may be triggered to provide creative insights or
   semantic grounding for new concepts. The `ActionExecutor` may be engaged to perform actions in the world if a goal
   has been achieved.

This cycle runs continuously, allowing the system to learn, adapt, and reason in a dynamic and principled manner.

## The Neuro-Symbolic Bridge: Synergy in Action

SeNARS does not treat the Large Language Model (LM) as a black-box brain. Instead, it is integrated as a suite of
specialized, pluggable services that are called upon by the symbolic `Reasoner` when it identifies a gap in its own
knowledge or capabilities.

- **Hypothesis Generation**: When the `Reasoner` needs a creative leap, it can ask the `LM` to generate novel
  hypotheses.
- **Plan Repair**: If a logical plan fails, the `LM` can be asked to suggest creative alternative solutions.
- **Explanation**: The `LM` can translate the `Reasoner`'s formal, symbolic logic into fluent, human-readable natural
  language.

This creates a powerful synergy: the `Reasoner` provides the rigor, structure, and explainability, while the `LM`
provides the semantic understanding, creativity, and fluency.
