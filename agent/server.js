import {spawn} from 'child_process';
import express from 'express';
import {createServer} from 'http';
import {fileURLToPath} from 'url';
import path from 'path';
import AgentManager from './AgentManager.js';
import {startWebSocketServer} from './WebSocketServer.js';
import {createMessageHandler} from './MessageHandler.js';
import {error, info} from '../core/utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 8080;

async function main() {
    const args = process.argv.slice(2);

    const app = express();
    const server = createServer(app);

    const {broadcast, setMessageHandler} = startWebSocketServer(server);
    const agentManager = new AgentManager(broadcast);
    const messageHandler = createMessageHandler(agentManager, broadcast);
    setMessageHandler(messageHandler);

    await agentManager.initialize().catch(err => {
        error('Failed to initialize AgentManager:', err);
        process.exit(1);
    });

    if (args.includes('--tui')) {
        info('Starting TUI...');
        const tuiProcess = spawn('node', ['src/index.js'], {
            cwd: path.resolve(__dirname, '../tui'),
            stdio: 'inherit',
        });

        tuiProcess.on('close', code => {
            info(`TUI process exited with code ${code}`);
            process.exit(code);
        });
    } else if (args.includes('--dev')) {
        info('Starting dev server with UI...');
        const { createServer: createViteServer } = await import('vite');
        const vite = await createViteServer({
            server: { middlewareMode: true },
            appType: 'spa',
            root: path.resolve(__dirname, '../ui'),
            publicDir: path.resolve(__dirname, '../ui/public'),
        });
        app.use(vite.middlewares);
    }

    server.listen(PORT, () => {
        info(`Server is running on http://localhost:${PORT}`);
    });
}

main().catch(err => {
    error('Failed to start server:', err);
    process.exit(1);
});