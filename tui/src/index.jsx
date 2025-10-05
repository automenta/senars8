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

    // Check if raw mode is supported
    const isRawModeSupported = process.stdin.isTTY && process.stdin.setRawMode;

    if (!isRawModeSupported) {
        console.log('⚠️  Raw mode not supported in this environment');
        console.log('🔧 Falling back to basic mode...');
    }

    // Start the Ink application with proper keyboard handling
    const app = render(React.default.createElement(App.default, {
        onExit: () => {
            console.log('TUI exited gracefully');
        }
    }), {
        exitOnCtrlC: true,
        patchConsole: false,
        stdin: isRawModeSupported ? process.stdin : undefined,
        stdout: process.stdout,
        stderr: process.stderr
    });

    // Handle graceful exit - simplified and more reliable
    const handleExit = () => {
        console.log('\n🛑 Shutting down TUI...');

        try {
            if (app) {
                app.unmount();
            }
        } catch (error) {
            console.error('❌ Error during shutdown:', error);
        }

        console.log('✅ TUI shutdown complete');
        process.exit(0);
    };

    // Register signal handlers BEFORE starting the app
    console.log('📋 Setting up signal handlers...');
    process.on('SIGINT', () => {
        console.log('🔄 SIGINT received');
        handleExit();
    });
    process.on('SIGTERM', () => {
        console.log('🔄 SIGTERM received');
        handleExit();
    });

    // Handle input based on environment capabilities
    if (isRawModeSupported) {
        console.log('⌨️  Raw mode supported - full keyboard input available');
        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.on('data', (key) => {
            if (key[0] === 3) { // Ctrl+C
                console.log('\n⌨️  Ctrl+C detected via stdin, exiting...');
                handleExit();
            }
        });
    } else {
        console.log('⚠️  Raw mode not supported - limited input available');
        console.log('💡 Use Ctrl+C in terminal or kill process manually');
        // Still allow line input as fallback
        process.stdin.on('data', (data) => {
            const input = data.toString().trim();
            if (input.toLowerCase() === 'quit' || input.toLowerCase() === 'exit') {
                console.log('👋 Exiting via text command...');
                handleExit();
            }
        });
    }

    // Test signal handling after a short delay
    setTimeout(() => {
        console.log('🔍 Signal handler test - SIGINT listeners:', process.listeners('SIGINT').length);
        console.log('🔍 Process PID:', process.pid);
    }, 1000);

    // Set up a timeout to ensure the app doesn't hang
    const timeout = setTimeout(() => {
        console.log('\nTUI startup timeout reached, exiting...');
        process.exit(0);
    }, 30000); // 30 second timeout

    // Clear timeout once app is successfully started
    setTimeout(() => {
        clearTimeout(timeout);
    }, 5000);

    console.log('✅ TUI started successfully');
    console.log('🎯 Press Ctrl+C to exit');
    console.log('🔧 Signal handlers registered:', !!process.listeners('SIGINT').length, 'SIGINT listeners');
} catch (error) {
    console.error('Failed to start TUI:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
}