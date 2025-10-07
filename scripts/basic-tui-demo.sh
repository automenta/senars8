#!/bin/bash

# Basic TUI interaction demo script
# This script demonstrates simple tasks in the TUI

# Start the agent with WebSocket support
echo "Starting agent with WebSocket support..."
WS_PORT=8081 node main.js --web &
AGENT_PID=$!

# Wait for agent to start
sleep 3

# Record the TUI interaction
echo "Recording basic TUI interaction..."
asciinema rec docs/screenshots/tui/basic-tui-interaction.cast -c "
node main.js --tui << EOF
# Add a simple belief
(cat --> animal).

# Add another belief
(animal --> living).

# Ask a question
(living --> ?)?

# Add a goal
(food --> available)!

# Test some TUI commands
help

beliefs

goals

# Exit the TUI
quit
EOF
" -y

# Kill the agent process
kill $AGENT_PID

echo "Basic TUI interaction recording completed!"