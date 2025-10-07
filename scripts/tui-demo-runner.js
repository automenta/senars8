#!/usr/bin/env node

/**
 * TUI Demo Runner - Demonstrates running demos through the TUI
 * This script starts an agent server and then runs the TUI with demo inputs
 */

import {execa} from 'execa';
import fs from 'fs';
import path from 'path';

async function runTuiDemo() {
    console.log("Starting TUI demo demonstration...");

    // Start the agent with WebSocket support in background
    console.log("Starting agent with WebSocket support on port 8081...");
    const agentProcess = execa('node', ['main.js', '--web'], {
        env: {WS_PORT: '8081'},
        reject: false
    });

    // Wait for agent to start
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Create a temporary script file to feed commands to the TUI
    const tuiCommands = `
# TUI Demo - Basic Reasoning
# Add basic facts
(bird --> animal).
(animal --> living).
(living --> mortal).
bird.

# Ask a question
(mortal --> ?)?

# Check beliefs
beliefs

# Check status
help

# Exit
quit
`;

    const tempScriptFile = path.join(process.cwd(), 'temp_tui_demo.sh');
    fs.writeFileSync(tempScriptFile, `#!/bin/bash\ncat << 'EOF'\n${tuiCommands}\nEOF`);

    try {
        // Run the TUI and feed it commands
        console.log("Starting TUI and running demo commands...");
        const tuiProcess = execa('node', ['main.js', '--tui'], {
            timeout: 15000, // 15 seconds timeout
        });

        // Wait for TUI to finish
        const result = await tuiProcess;
        console.log("TUI demo completed.");
        console.log("stdout:", result.stdout);
        if (result.stderr) {
            console.log("stderr:", result.stderr);
        }
    } catch (error) {
        console.error("Error running TUI demo:", error.message);
    } finally {
        // Clean up the temporary script
        if (fs.existsSync(tempScriptFile)) {
            fs.unlinkSync(tempScriptFile);
        }

        // Kill the agent process
        agentProcess.kill();
    }
}

// Run the TUI demo
runTuiDemo().catch(console.error);