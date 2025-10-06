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

### Installation & Quick Start

**One-command setup:** The simplest way to get started is with a single command:

```bash
npm install && npm run dev
```

This will install dependencies and start the full application with both the Web UI and embedded agent.

### Running the Application

#### Full Development Mode (Recommended for new users)

Start everything with hot reloading:

```bash
npm run dev
```

This automatically starts:
- The embedded agent with all cognitive components
- The Web UI on http://localhost:3000
- The WebSocket server on port 8081

#### For Development Workflows

- `npm run dev:core` - Start the core agent for development
- `npm run dev:ui` - Start the Web UI with embedded agent
- `npm run tui:dev` - Start the Terminal UI independently

#### Alternative Commands

- `npm run start` - Start the core agent only (without UI)
- `npm run tui` - Start the terminal UI only (requires agent with WebSocket)
- `npm run agent` - Start the agent service only
- `npm run web` - Start the Web UI with embedded agent (same as `npm run dev`)

### Configuration

The application uses sensible defaults but can be configured with environment variables:

```bash
SENARS_UI_PORT=3000      # Web UI port
SENARS_WS_PORT=8081      # WebSocket port  
SENARS_DEV_MODE=true     # Development mode
SENARS_LOG_LEVEL=info    # Log level (debug, info, warn, error)
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

    subgraph "Extensibility"
        PluginManager
        DIContainer
    end

    SystemFactory -- Uses --> PluginManager
    PluginManager -- Integrates with --> DIContainer
```

## Plugin System

SeNARS features a modular plugin system that allows extending functionality without modifying core code:

### Creating a Plugin

Create a new file in the `plugins/` directory:

```js
// plugins/my-plugin.js
import {info} from '../core/utils/logger.js';

class MyPlugin {
    constructor(options = {}) {
        this.options = options;
    }

    registerComponents(container) {
        // Register new services with the DI container
        // container.register('myService', MyService, ['dependency1']);
    }

    async initialize(container) {
        // Access system components through the container
        const system = container.get('system');
        const memory = container.get('memory');
        
        info('MyPlugin: Initialized');
    }

    async shutdown() {
        info('MyPlugin: Shutting down');
    }
}

export default new MyPlugin();
```

### Loading Plugins

Plugins are loaded automatically from the `plugins/` directory or can be registered programmatically.

For complete API documentation, see [PLUGIN_API.md](PLUGIN_API.md).

### Plugin Development

To create your own plugin, implement the plugin interface with the following methods:

- `registerComponents(container)` - Register new services with the DI container
- `initialize(container)` - Initialize the plugin and access system components
- `shutdown()` - Clean up resources when shutting down

See `plugins/example-plugin.js` for a complete example.

