import Application from './Application.js';

const app = new Application();

app.start().catch(error => {
    console.error('Failed to start application:', error);
    process.exit(1);
});

async function shutdown() {
    console.log('Shutting down TUI...');
    await app.stop();
    process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);