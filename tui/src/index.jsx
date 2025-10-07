#!/usr/bin/env node

import {getMessage, TUI_CONSTANTS} from './constants.js';

// Enhanced error handling with graceful degradation
const handleError = (error, context) => {
    console.error(`❌ ${context}:`, error.message);
    if (process.env.NODE_ENV === 'development') {
        console.error('Stack:', error.stack);
    }
    process.exit(TUI_CONSTANTS.EXIT_CODES.ERROR);
};

// Global error handlers
process.on('uncaughtException', (error) => handleError(error, 'TUI startup failed'));
process.on('unhandledRejection', (reason) => handleError(reason, 'Unhandled promise rejection'));

// Main TUI startup function
const startTui = async (initialMode = 'agent') => {
    try {
        console.log(`🚀 Starting SeNARS TUI in ${initialMode} mode...`);

        // Import dependencies
        const {render} = await import('ink');
        const React = await import('react');
        const App = await import('./App.jsx');

        // Environment detection
        const isRawModeSupported = process.stdin.isTTY && process.stdin.setRawMode;

        if (!isRawModeSupported) {
            console.log(getMessage('LIMITED_INPUT'));
        }

        // Initialize application with proper raw mode handling
        const renderOptions = {
            exitOnCtrlC: true,
            patchConsole: false,
            stdout: process.stdout,
            stderr: process.stderr
        };

        // Only add stdin if raw mode is supported
        if (isRawModeSupported) {
            renderOptions.stdin = process.stdin;
        }

        const app = render(React.default.createElement(App.default, {initialMode}), renderOptions);

        // Simplified shutdown handler
        const shutdown = (signal) => {
            try {
                app?.unmount();
            } catch (error) {
                console.error('Shutdown error:', error.message);
            }
            process.exit(TUI_CONSTANTS.EXIT_CODES.SUCCESS);
        };

        // Register signal handlers
        process.on('SIGINT', () => shutdown('SIGINT'));
        process.on('SIGTERM', () => shutdown('SIGTERM'));

        // Basic startup completion
        setTimeout(() => {
            console.log(getMessage('STARTED'));
            if (isRawModeSupported) {
                console.log(getMessage('PRESS_CTRL_C'));
            } else {
                console.log(getMessage('TYPE_QUIT'));
            }
        }, 100);

    } catch (error) {
        handleError(error, 'Failed to start TUI');
    }
};

// Parse command line arguments
const parseArgs = () => {
    const args = process.argv.slice(2);
    const modeArg = args.find(arg => arg.startsWith('--mode='));
    return {
        mode: modeArg ? modeArg.split('=')[1] : 'agent'
    };
};

// Start the application
const {mode} = parseArgs();
startTui(mode).catch(handleError);