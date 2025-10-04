# SeNARS Multi-Agent TUI (Text User Interface)

The SeNARS Multi-Agent TUI is a modern terminal-based interface built with Ink (React for terminals). It provides
autonomous connection management to multiple agents simultaneously, solving the orchestration issues of the previous
TUI.

## Features

- **Multi-Agent Support**: Connect to multiple agents simultaneously from a single interface
- **Auto-Discovery**: Automatically scans common ports for available agents
- **Connection Management**: Connect/disconnect agents without restarting the interface
- **Real-time Status**: Monitor multiple agents with live updating statistics
- **Shared Codebase**: Leverages the same services and logic as the Web UI
- **React-based Components**: Uses React paradigms for familiar development experience

## Architecture

The new TUI uses:

- `ink` for React-based terminal UI rendering
- Shared `ApiService` for WebSocket communication with agents
- Custom `TuiAgentService` extending the base service with TUI-specific features
- `AgentManager` for multi-agent connection orchestration
- Auto-discovery mechanism to find agents on common ports

## Installation

The TUI is installed as part of the workspace:

```bash
npm install
```

## Usage

```bash
npm run tui
```

The TUI will automatically scan for available agents and display connection options.

### Connection Features

- The TUI automatically discovers agents on ports 8080, 8081, 8082, and 8083
- Connect to agents using the CONNECT button
- Disconnect using the DISCONNECT button
- View real-time status of connected agents
- Switch between active agents

### Commands

The TUI is currently in connection management mode. Future versions will include:

- Narsese input for connected agents
- Task management across multiple agents
- Memory browsing for connected agents

## Benefits Over Previous TUI

1. **No Orchestration Required**: The TUI can discover and connect to agents without requiring them to be started in a
   specific order
2. **Multi-Agent Support**: Manage multiple agents from a single interface
3. **Resilient Connections**: Individual agent disconnections don't affect the TUI
4. **Auto-Discovery**: Automatically finds available agents without manual configuration
5. **Shared Codebase**: Leverages the same communication services as the Web UI

## Development

To run in development mode with auto-reload:

```bash
npm run tui
```

## Troubleshooting

- If no agents are discovered, ensure agent services are running on common ports (8080-8083)
- The TUI will show "available" status for discoverable agents and "connected/disconnected" for active connections
- Agent services must have WebSocket support enabled