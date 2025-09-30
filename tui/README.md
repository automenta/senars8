# SeNARS TUI (Text User Interface)

The SeNARS TUI is a terminal-based interface for SeNARS. It provides a
lightweight, efficient way to interact with NARS agents directly from the command line.

## Features

- **Real-time Agent Interaction**: Connect to and control NARS agents
- **Task Management**: View and manage beliefs, goals, and questions
- **System Monitoring**: Monitor agent statistics and performance
- **Narsese Input**: Direct input of Narsese statements and queries
- **Command Interface**: Simple command-based interface with help system

## Architecture

The TUI uses:

- `blessed` for terminal UI rendering
- A shared `AgentCommunicationService` for WebSocket communication with the agent service
- The same communication protocol as the Web UI for consistent behavior

## Installation

```bash
cd tui
npm install
```

## Usage

```bash
npm start
```

Once started, the TUI will attempt to connect to the agent service at `ws://localhost:8080`.

## Commands

| Command         | Description             |
|-----------------|-------------------------|
| `!start`        | Start the agent cycling |
| `!stop`         | Stop the agent cycling  |
| `!reset`        | Reset the agent         |
| `!add <task>`   | Add a new task          |
| `!query <text>` | Query the agent         |
| `!stats`        | Get system statistics   |
| `!help`         | Show help information   |

## Examples

```
!add <cat --> animal>.
!query <cat --> animal>?
<bird --> animal>.
```

## Integration with Core Components

The TUI connects to the agent service via WebSocket and integrates with:

- Core reasoning engine through the agent service
- Memory systems for task management
- Event system for real-time updates
- Configuration system for agent parameters

## Shared Communication Service

The TUI uses a shared communication service that's also used by the Web UI, ensuring consistent behavior across
interfaces. The service handles:

- Connection management and reconnection logic
- Message queuing when disconnected
- Event emission for UI updates
- Error handling and logging

## Development

To run in development mode with auto-reload:

```bash
npm run dev
```

## Testing

Run integration tests:

```bash
npm run test:jest
```

## Troubleshooting

- If the TUI fails to connect, ensure the agent service is running on port 8080
- Check that the agent service WebSocket endpoint is accessible
- Verify network connectivity between the TUI and agent service