# SeNARS - Semantic Non-Axiomatic Reasoning System

## Project Structure

- **Core** (`core/`): The main reasoning engine and memory management
- **Cognitive Agent** (`agent/`): WebSocket server for UI communication
- **Web UI** (`ui/`): Full-featured React-based interface
- **Text UI** (`tui/`): Lightweight terminal-based interface
- **Common** (`common/`): Shared utilities and types across modules
- **Utils** (`utils/`): Utility functions and helpers
- **Tests** (`tests/`): Comprehensive test suite with unit, integration, and system tests
- **Docs** (`docs/`): Documentation and presentation materials

## Key Features

- **🧠 Dual-Engine**: Combines the rigor of symbolic logic with the creativity of large language models.
- **🔄 Meta-Cognition**: Self-improves by detecting and resolving its own reasoning failures.
- **🏛️ Immutable Constitution**: Core motives and safety constraints are built-in and unchangeable.
- **🔌 Pluggable Design**: Easily extend or replace any component, from the reasoner to the memory system.
- **🧪 Testing Framework**: Comprehensive testing using Vitest instead of Jest for better performance and compatibility

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm

### Installation

```bash
npm install
```

### Running the Application

To start the full application (agent + Web UI + TUI):

```bash
npm run dev
```

To start just the agent service:

```bash
npm start
```

### Running Tests

Run all tests:

```bash
npm test
```

Run tests with UI:

```bash
npm run test:ui
```

## Development

### Project Commands

- `npm run lint`: Lint all source code
- `npm run lint:fix`: Auto-fix linting issues
- `npm run slides`: Start presentation slides for documentation

### Testing

The project uses Vitest for testing with the following configuration:

- Unit tests: `tests/unit/`
- Integration tests: `tests/integration/`
- System tests: `tests/system/`
- Parser tests: `tests/parser/`
- Reasoner tests: `tests/reasoner/`
- Demo tests: `tests/demos/`

## Core Concepts

| Concept       | Description                                                                 |
|---------------|-----------------------------------------------------------------------------|
| 🔤 **Term**   | Immutable representation of a concept. Examples: `cat`, `(cat --> animal)`. |
| 🎯 **Task**   | Stateful unit of cognitive work (a belief, goal, or question).              |
| 💾 **Memory** | Unified knowledge hypergraph storing terms and tasks.                       |

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

