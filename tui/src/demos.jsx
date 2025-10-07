#!/usr/bin/env node

import React from 'react';
import {render} from 'ink';
import DemoRunner from './components/DemoRunner.jsx';

const DemoApp = () => {
    return <DemoRunner/>;
};

// Check if raw mode is supported
const isRawModeSupported = process.stdin.isTTY && process.stdin.setRawMode;

if (!isRawModeSupported) {
    console.log('❌ Raw mode is not supported in this environment.');
    console.log('💡 The TUI demo runner requires a proper terminal environment.');
    console.log('   Try running this in a proper terminal or use the CLI demo runner instead.');
    console.log('');
    console.log('Alternative options:');
    console.log('  • node tests/demos/interactive-runner.js');
    console.log('  • npm run test:demos');
    process.exit(1);
}

const app = render(<DemoApp/>);

// Handle graceful shutdown
process.on('SIGINT', () => {
    app.unmount();
    process.exit(0);
});

process.on('SIGTERM', () => {
    app.unmount();
    process.exit(0);
});