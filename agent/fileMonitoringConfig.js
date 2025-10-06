import fs from 'fs';
import path from 'path';

const defaultConfig = {
    patterns: ['docs/TODO.md'],
    watchDir: process.cwd(),
    debounce: 1000,
    persistent: true,
    followSymlinks: false,
    ignoreInitial: true,
    usePolling: false,
    interval: 100,
    processExistingOnStartup: true,
    maxFileSize: 10 * 1024 * 1024,
    enableWatching: true,
};

export default class FileMonitoringConfig {
    constructor(options = {}) {
        this.config = {...defaultConfig, ...options};
    }

    static loadFromFile(filePath) {
        if (!fs.existsSync(filePath)) throw new Error(`Config not found: ${filePath}`);
        try {
            return new FileMonitoringConfig(JSON.parse(fs.readFileSync(filePath, 'utf8')));
        } catch (error) {
            throw new Error(`Invalid config JSON: ${error.message}`);
        }
    }

    saveToFile(filePath) {
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, {recursive: true});
        fs.writeFileSync(filePath, JSON.stringify(this.config, null, 2));
    }

    getConfig() {
        return {...this.config};
    }

    updateConfig(newConfig) {
        this.config = {...this.config, ...newConfig};
    }
}