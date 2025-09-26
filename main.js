import { Agent } from './agent/index.js';
import TUIApplication, { TUIConfig } from './tui/src/index.js';
import WebUI, { UIConfig } from './ui/src/index.js';

class SENARSMain {
    constructor(options = {}) {
        this.agent = null;
        this.tui = null;
        this.webui = null;
        this.config = {
            agentConfig: options.agentConfig ?? {},
            tuiConfig: options.tuiConfig ?? {},
            webuiConfig: options.webuiConfig ?? { port: 3000 }
        };
    }

    async initialize() {
        console.log('Initializing SENARS system...');
        
        // Create and initialize the agent
        this.agent = new Agent(this.config.agentConfig);
        await this.agent.initialize();
        
        console.log('Agent initialized successfully');
    }

    async startTUI() {
        if (!this.agent) {
            throw new Error('Agent must be initialized before starting TUI');
        }
        
        console.log('Starting TUI...');
        const tuiConfig = new TUIConfig(this.config.tuiConfig);
        this.tui = new TUIApplication({ config: tuiConfig });
    }

    async startWebUI() {
        if (!this.agent) {
            throw new Error('Agent must be initialized before starting WebUI');
        }
        
        console.log('Starting WebUI...');
        const webuiConfig = new UIConfig(this.config.webuiConfig);
        this.webui = new WebUI(this.agent, webuiConfig.getAll());
        await this.webui.start();
    }

    async start() {
        await this.initialize();
        
        // Start both UIs
        await this.startTUI();
        await this.startWebUI();
        
        this._logStartupMessage();
    }
    
    _logStartupMessage() {
        console.log('SENARS system started successfully!');
        console.log('TUI is available in the terminal');
        console.log('WebUI is available at http://localhost:3000');
    }

    stop() {
        console.log('Stopping SENARS system...');
        
        if (this.tui) {
            this.tui.stop?.();
        }
        
        if (this.webui) {
            this.webui.stop?.();
        }
        
        if (this.agent) {
            this.agent.stop?.();
        }
        
        console.log('SENARS system stopped');
    }
}

// Handle process termination gracefully
process.on('SIGINT', () => {
    console.log('\\nReceived SIGINT, shutting down...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\\nReceived SIGTERM, shutting down...');
    process.exit(0);
});

// For testing purposes, we'll export the main class
export default SENARSMain;

// If this file is run directly, start the application
if (import.meta.url === `file://${process.argv[1]}`) {
    const main = new SENARSMain();
    main.start().catch(console.error);
}