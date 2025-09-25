# SeNARS IDE UI

This is the UI component of the SeNARS (Self-Evolving Neuromorphic-Adaptive Reasoning System) IDE, built with React and
Vite.
The IDE provides a comprehensive interface for interacting with NARS agents, visualizing knowledge graphs, memory,
reasoning traces,
and configuring agent parameters.

## Features

- **Interactive Chat Interface**: Natural language and Narsese input with examples and suggestions
- **Memory Visualization**: View and filter working and long-term memory items
- **Knowledge Graph**: Interactive visualization of concepts and relationships
- **Reasoning Visualization**: Visual and trace-based reasoning flow visualization
- **Agent Control**: Start, stop, and reset agent controls
- **System Monitoring**: Real-time statistics and status indicators
- **File Management**: File explorer and code editor capabilities
- **Terminal Interface**: Integrated terminal for command execution
- **Configuration Panel**: Comprehensive agent configuration settings
- **Layout Management**: Save, load, and manage different UI layouts
- **Notification System**: Comprehensive notification and alert system

## Architecture

The UI follows a component-based architecture with:

- Panel-based layout system using flexlayout-react
- Context providers for shared state management
- WebSocket connection to backend agent service
- CRDT-based collaborative editing capabilities
- Comprehensive error handling and boundary protection

## Enhanced Agent Communication

The Web UI now uses an enhanced agent service that leverages shared communication infrastructure with the TUI:

- **Shared Communication Service**: A common base service used by both Web UI and TUI for consistent communication
- **Improved Connection Management**: Enhanced reconnection logic and error handling
- **Message Queuing**: Proper queuing of messages when disconnected with automatic retry
- **Event Consolidation**: Unified event system for consistent agent updates across interfaces

## Enhanced Backend Integration

Key improvements to backend integration:

- **Y.js Integration**: Maintains collaborative editing features using Y.js CRDTs
- **Consistent Protocol**: Uses the same communication protocol as the TUI
- **Better Error Handling**: Improved error handling and logging
- **Performance Optimizations**: More efficient message handling and UI updates

## Development

To run the Web UI:

```bash
cd ui
npm install
npm run dev
```

## Integration with Core Components

The Web UI connects to the agent service and integrates with:
- Core reasoning engine through the agent service
- Memory systems for task management
- Event system for real-time updates
- Configuration system for agent parameters
- CRDT-based collaborative editing features

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check
out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information
on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Future Development: Collaborative Features with CRDTs

This UI is designed to be extensible. One area of future development is the integration of collaborative features,
allowing multiple users to interact with the same NARS agent in real-time. This could be useful for teaching, debugging,
and collective reasoning experiments.

To enable robust, real-time collaboration, we plan to use Conflict-Free Replicated Data Types (CRDTs). CRDTs are a class
of data structures that can be replicated across multiple computers, and which can be updated independently and
concurrently without coordination between the replicas. The replicas will eventually converge to the same state.

Libraries like [Y.js](https://yjs.dev/) or [Automerge](https://automerge.org/) could be used to implement CRDTs for
shared state, such as the content of the input panel, the state of the knowledge graph, or the agent's beliefs. This
would provide a solid foundation for building a truly collaborative NARS IDE.
