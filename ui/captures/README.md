# Web UI Captures

This directory contains utilities and captured materials for documenting the Web UI.

## Capture Utilities

The main capture utility is located at `capture-webui.js` in the parent directory and allows you to capture screenshots
and generate documentation.

### Usage

```bash
# Screenshot capture
node capture-webui.js --title "My Screenshot" --type screenshot

# Asciinema-style capture (simulated)
node capture-webui.js --title "Demo Capture" --type asciinema

# Both types
node capture-webui.js --title "Full Demo" --type both
```

## Captured Materials

Screenshots and captures are saved to this directory with timestamps in the filename.

## Demo Application

A demo application is available to showcase Web UI functionality with a running agent:

```bash
node tests/WebUIDemo.js
```

Then start the UI separately with `npm run dev` to see it in action.