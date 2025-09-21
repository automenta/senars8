# SeNARS 🧠

A new primitive for neuro-symbolic cognition.

SeNARS is a cognitive architecture that creates a powerful synergy between symbolic reasoning and neural processing. It provides a foundation for building transparent, adaptive, and complex-reasoning AI systems.

## Core Concepts

| Concept | Description |
|---|---|
| 🔤 **Term** | Immutable representation of a concept. Examples: `cat`, `(cat --> animal)`. |
| 🎯 **Task** | Stateful unit of cognitive work (a belief, goal, or question). |
| 💾 **Memory** | Unified knowledge hypergraph storing terms and tasks. |

## Architecture

```mermaid
graph TD
    subgraph "Cognitive Cycle"
        direction LR
        Perception --> Prioritization --> Reasoning --> MetaCognition --> Enrichment
        Enrichment --> Perception
    end

    subgraph "Core Components"
        Memory
        Reasoner
        LM
        Planner
        ActionExecutor
    end

    Cognitive Cycle -- Orchestrates --> Core Components

    subgraph "System"
        SystemAPI
        SystemFactory
        IntrospectionAPI
    end

    SystemAPI -- Manages --> Cognitive Cycle
    SystemFactory -- Assembles --> SystemAPI
```

## Key Features

- **🧠 Dual-Engine**: Combines the rigor of symbolic logic with the creativity of large language models.
- **🔄 Meta-Cognition**: Self-improves by detecting and resolving its own reasoning failures.
- **🏛️ Immutable Constitution**: Core motives and safety constraints are built-in and unchangeable.
- **🔌 Pluggable Design**: Easily extend or replace any component, from the reasoner to the memory system.

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm

### Installation

```bash
npm install
```

### Run Demos

To see SeNARS in action, run the interactive demo runner:

```bash
npm run start:demo
```

For a comprehensive tour of the system's capabilities, run the showcase demo:

```bash
npm run start:showcase
```

### Run Tests

```bash
npm test
```

## Development

- **Core Logic**: `src/`
- **Documentation**: `docs/`
- **Demos**: `demos/`
- **Tests**: `tests/`

For a deeper dive, see the [SYSTEM_OVERVIEW.md](./docs/SYSTEM_OVERVIEW.md) and the [slide deck](./docs/slides.md).
