# TUI Session Capture

This directory contains utilities for capturing and documenting TUI (Text User Interface) sessions as asciinema recordings or screenshots for documentation and educational purposes.

## Capture Utility

The main capture utility is located at `capture-tui.js` and allows you to record terminal sessions showing the TUI in action.

### Usage

```bash
# Basic usage (30 second recording)
node capture-tui.js --title "My TUI Demo"

# With custom duration and port
node capture-tui.js --title "Advanced Demo" --port 8086 --duration 60

# Help
node capture-tui.js --help
```

## Captured Sessions

Recordings are saved to the `captures/` directory with timestamps in the filename.

## Integration with Documentation

These captures can be used for:
- User documentation
- Educational materials
- Feature demonstrations
- Troubleshooting guides

## TUI Demo

A demo script is available to showcase TUI functionality:

```bash
node tests/TuiDemo.js
```

This starts an agent server and connects the TUI to demonstrate real functionality.