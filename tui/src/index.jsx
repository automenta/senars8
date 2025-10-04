#!/usr/bin/env node

// Error handling for TUI startup
process.on('uncaughtException', (error) => {
    console.error('TUI failed to start:', error.message);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled promise rejection in TUI:', reason);
    process.exit(1);
});

try {
    console.log('Starting TUI...');

    // Import dependencies with error handling
    const {render} = await import('ink');
    const React = await import('react');
    const App = await import('./App.jsx');

    console.log('TUI dependencies loaded successfully');

    // Start the Ink application
    render(React.default.createElement(App.default));

    console.log('TUI started successfully');
} catch (error) {
    console.error('Failed to start TUI:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
}