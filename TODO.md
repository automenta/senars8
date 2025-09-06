# TODO

## Phase 1: Stabilization and Refactoring (Short-Term)

### `[ ]` 1. Stabilize Core System
- [ ] **Fix Failing Integration Tests:**
    - [ ] Isolate the root cause of failures in the `Reasoner` and `Cycle` integration tests.
    - [ ] Ensure all existing tests pass reliably.

### `[ ]` 2. Complete Codebase Refactoring
- [ ] **Refactor `Cycle.js`:**
    - [ ] Move constants to a central `config.js` file.
    - [ ] Extract priority calculation logic into a `PriorityManager` module.
- [ ] **Refactor `MetaCognition.js`:**
    - [ ] Extract contradiction analysis logic into a `ContradictionAnalyzer` module.
    - [ ] Extract resolution strategies into a `ResolutionStrategy` module.
- [ ] **Refactor `Perception.js`:**
    - [ ] Extract task creation logic into a `TaskFactory` module.
    - [ ] Extract pattern detection logic into a `PatternDetector` module.
- [ ] **Refactor `Planner.js`:**
    - [ ] Improve planning algorithms beyond the current simple implementation.
- [ ] **Refactor `ActionExecutor.js`:**
    - [ ] Make the action execution more robust and extensible.
- [ ] **Refactor `LM.js`:**
    - [ ] Enhance language model capabilities (e.g., hypothesis generation).

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
