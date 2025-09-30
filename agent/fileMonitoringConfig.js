import fs from 'fs';
import path from 'path';
import { merge } from 'lodash';

const defaultConfig = {
    patterns: ['docs/**/*.md', 'PLAN.*.md', 'TODO.md', 'ROADMAP.md'],
    watchDir: process.cwd(),
    debounce: 1000,
    persistent: true,
    followSymlinks: false,
    ignoreInitial: true,
    usePolling: false,
    interval: 100,
    processExistingOnStartup: true,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    enableWatching: true,
};

/**
 * Manages the configuration for the file monitoring service.
 */
class FileMonitoringConfig {
    constructor(options = {}) {
        this.config = merge({}, defaultConfig, options);
    }

    /**
     * Loads configuration from a JSON file.
     * @param {string} filePath - The path to the configuration file.
     * @returns {FileMonitoringConfig} A new config instance.
     */
    static loadFromFile(filePath) {
        if (!fs.existsSync(filePath)) {
            throw new Error(`Configuration file not found: ${filePath}`);
        }
        const content = fs.readFileSync(filePath, 'utf8');
        try {
            const configData = JSON.parse(content);
            return new FileMonitoringConfig(configData);
        } catch (error) {
            throw new Error(`Invalid JSON in configuration file: ${error.message}`);
        }
    }

    /**
     * Saves the current configuration to a file.
     * @param {string} filePath - The path to save the file.
     */
    saveToFile(filePath) {
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(filePath, JSON.stringify(this.config, null, 2));
    }

    /**
     * Returns the current configuration object.
     * @returns {object} The configuration object.
     */
    getConfig() {
        return { ...this.config };
    }

    /**
     * Updates the configuration with new values.
     * @param {object} newConfig - The new configuration values to merge.
     */
    updateConfig(newConfig) {
        this.config = merge(this.config, newConfig);
    }
}

export default FileMonitoringConfig;