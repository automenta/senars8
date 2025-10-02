import express from 'express';
import path from 'path';
import {fileURLToPath} from 'url';
import {createServer} from 'http';
import { info } from '@core/utils/logger.js';
import {CONFIG} from '@common/constants/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * A simple web server responsible for serving the static files for the Web UI.
 * It reads configuration from the unified config file.
 */
class WebUI {
    constructor() {
        this.port = CONFIG.UI.PORT || 3000;
        this.host = CONFIG.UI.HOST || 'localhost';
        this.app = express();
        this.server = null;
        this.isRunning = false;

        this.setupExpressApp();
    }

    /**
     * Configures the Express application to serve static files.
     */
    setupExpressApp() {
        const staticPath = path.join(__dirname, CONFIG.UI.STATIC_PATH || '../public');
        this.app.use(express.static(staticPath));

        this.app.get('*', (req, res) => {
            res.sendFile(path.join(staticPath, 'index.html'));
        });
    }

    /**
     * Starts the web server.
     * @returns {Promise<void>}
     */
    start() {
        return new Promise((resolve) => {
            if (this.isRunning) {
                info('WebUI is already running.');
                resolve();
                return;
            }

            this.server = createServer(this.app);

            this.server.listen(this.port, this.host, () => {
                info(`WebUI server running on http://${this.host}:${this.port}`);
                this.isRunning = true;
                resolve();
            });
        });
    }

    /**
     * Stops the web server.
     */
    stop() {
        if (!this.isRunning) {
            return;
        }

        this.isRunning = false;

        if (this.server) {
            this.server.close(() => {
                info('WebUI server stopped.');
            });
        }
    }
}

export default WebUI;