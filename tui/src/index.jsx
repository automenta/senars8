#!/usr/bin/env node

import { TUI_CONSTANTS, getTimeout, getMessage } from './constants.js';

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
const startTui = async () => {
    try {
        console.log('🚀 Starting SeNARS TUI...');

        // Import dependencies
        const { render } = await import('ink');
        const React = await import('react');
        const App = await import('./App.jsx');

        // Environment detection
        const isRawModeSupported = process.stdin.isTTY && process.stdin.setRawMode;
        const isDevelopment = process.env.NODE_ENV === 'development';

        if (!isRawModeSupported) {
            console.log(getMessage('LIMITED_INPUT'));
        }

        // Initialize application
        const app = render(React.default.createElement(App.default, {
            onExit: () => isDevelopment && console.log('✅ TUI exited gracefully')
        }), {
            exitOnCtrlC: true,
            patchConsole: false,
            stdin: isRawModeSupported ? process.stdin : undefined,
            stdout: process.stdout,
            stderr: process.stderr
        });

        // Graceful shutdown handler
        const shutdown = (signal) => {
            if (isDevelopment) {
                console.log(`\n🛑 Shutting down TUI (${signal})...`);
            }

            try {
                app?.unmount();
            } catch (error) {
                handleError(error, 'Shutdown error');
            }

            process.exit(TUI_CONSTANTS.EXIT_CODES.SUCCESS);
        };

        // Register signal handlers
        process.on('SIGINT', () => shutdown('SIGINT'));
        process.on('SIGTERM', () => shutdown('SIGTERM'));

        // Enhanced input handling for raw mode
        if (isRawModeSupported) {
            process.stdin.setRawMode(true);
            process.stdin.resume();
            process.stdin.on('data', (key) => {
                if (key[0] === 3) { // Ctrl+C
                    shutdown('Ctrl+C');
                }
            });
        } else {
            // Fallback for non-raw mode
            process.stdin.on('data', (data) => {
                const input = data.toString().trim().toLowerCase();
                if (['quit', 'exit'].includes(input)) {
                    shutdown('quit command');
                }
            });
        }

        // Development diagnostics
        if (isDevelopment) {
            setTimeout(() => {
                console.log(`${getMessage('SIGNAL_TEST')} ${process.listeners('SIGINT').length}`);
            }, getTimeout('SIGNAL_TEST'));
        }

        // Startup timeout protection
        const startupTimeout = setTimeout(() => {
            console.log(getMessage('STARTUP_TIMEOUT'));
            shutdown('timeout');
        }, getTimeout('STARTUP'));

        // Clear timeout after successful startup
        setTimeout(() => {
            clearTimeout(startupTimeout);
            console.log(getMessage('STARTED'));
            if (isRawModeSupported) {
                console.log(getMessage('PRESS_CTRL_C'));
            } else {
                console.log(getMessage('TYPE_QUIT'));
            }
        }, getTimeout('CLEANUP_DELAY'));

    } catch (error) {
        handleError(error, 'Failed to start TUI');
    }
};

// Start the application
startTui().catch(handleError);