# TODO

## Phase 1: Stabilization and Refactoring (Short-Term)

### `[x]` 1. Stabilize Core System

- [x] **Fix Failing Integration Tests:**
    - [x] Isolate the root cause of failures in the `Reasoner` and `Cycle` integration tests.
    - [x] Ensure all existing tests pass reliably.

### `[x]` 2. Complete Codebase Refactoring

- [x] **Refactor `Cycle.js`:**
    - [x] Move constants to a central `config.js` file.
    - [x] Extract priority calculation logic into a `PriorityManager` module.
- [x] **Refactor `MetaCognition.js`:**
    - [x] Extract contradiction analysis logic into a `ContradictionAnalyzer` module.
    - [x] Extract resolution strategies into a `ResolutionStrategy` module.
- [x] **Refactor `Perception.js`:**
    - [x] Extract task creation logic into a `TaskFactory` module.
    - [x] Extract pattern detection logic into a `PatternDetector` module.
- [x] **Refactor `Planner.js`:**
    - [x] Improve planning algorithms beyond the current simple implementation.
- [x] **Refactor `ActionExecutor.js`:**
    - [x] Make the action execution more robust and extensible.
- [x] **Refactor `LM.js`:**
    - [x] Enhance language model capabilities (e.g., hypothesis generation).

## Phase 2: Advanced Capabilities (Long-Term)

### `[ ]` 1. Systematic Evaluation and Benchmarking

- [ ] **Develop Cognitive Test Suite:**
    - [ ] Create tests for deductive reasoning (e.g., logic puzzles).
    - [ ] Create tests for inductive/abductive reasoning (e.g., scientific reasoning).
    - [ ] Create tests for constitutional/moral reasoning (e.g., moral dilemmas).
    - [ ] Create tests for creative reasoning (e.g., analogy making).
- [ ] **Define and Track Performance Metrics:**
    - [ ] Implement tracking for inference speed.
    - [ ] Implement tracking for knowledge acquisition rate.
    - [ ] Implement tracking for contradiction resolution time.
    - [ ] Implement tracking for goal achievement rate.

### `[ ]` 2. Advanced Meta-Cognition and Self-Improvement

- [ ] **Implement Automated Bug-Fixing:**
    - [ ] Develop a mechanism to identify and flag faulty inference rules.
    - [ ] Develop a mechanism to identify and distrust unreliable information sources.
- [ ] **Implement Dynamic Resource Management:**
    - [ ] Allow the system to manage its own computational resources based on cognitive load.

### `[ ]` 3. Richer Interfaces and Embodiment

- [ ] **Integrate with a Robotic Platform:**
    - [ ] Connect SeNARS to a simulated or physical robot.
    - [ ] Develop perception and action capabilities for a physical environment.
- [ ] **Develop Sophisticated Conversational Interface:**
    - [ ] Implement advanced dialogue management.
    - [ ] Incorporate understanding of pragmatics and context.
    - [ ] Develop a basic "Theory of Mind" model for user interaction.

### `[ ]` 4. Long-Term Memory and Learning

- [ ] **Implement a Forgetting Mechanism:**
    - [ ] Create a system for pruning irrelevant or old information from memory.
- [ ] **Implement Memory Consolidation:**
    - [ ] Develop a process for consolidating short-term memories into a long-term knowledge base.

## Phase 3: Community and Growth

### `[ ]` 1. Foster an Open-Source Community

- [ ] **Create Comprehensive Documentation:**
    - [ ] Write detailed documentation for the system's theory, API, and usage.
    - [ ] Create tutorials and contribution guidelines.
- [ ] **Promote Open-Source Collaboration:**
    - [ ] Engage with the research community to encourage contributions.
