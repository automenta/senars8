/**
 * Plugin Manager for SeNARS
 * Provides a clean API for extending the system with new components
 */

import {info, warn, error} from './core/utils/logger.js';
import {LIFETIME} from './core/system/DIContainer.js';

class PluginManager {
    constructor(container) {
        this.container = container;
        this.plugins = new Map();
        this.initialized = false;
    }

    /**
     * Register a plugin with the system
     * @param {string} name - The name of the plugin
     * @param {Object} plugin - The plugin object with lifecycle methods
     */
    registerPlugin(name, plugin) {
        if (this.plugins.has(name)) {
            warn(`Plugin ${name} is already registered, overwriting`);
        }

        // Validate plugin structure
        if (typeof plugin !== 'object') {
            throw new Error(`Plugin ${name} must be an object with lifecycle methods`);
        }

        this.plugins.set(name, {
            name,
            instance: plugin,
            registered: new Date()
        });

        info(`Plugin ${name} registered successfully`);
    }

    /**
     * Load plugins from a directory
     * @param {string} directoryPath - Path to directory containing plugins
     */
    async loadPluginsFromDirectory(directoryPath) {
        const {readdir, stat, readFile} = await import('fs/promises');
        const {join} = await import('path');
        
        try {
            const files = await readdir(directoryPath);
            
            for (const file of files) {
                const fullPath = join(directoryPath, file);
                const fileStat = await stat(fullPath);
                
                if (fileStat.isDirectory()) {
                    await this.loadPluginsFromDirectory(fullPath);
                } else if (file.endsWith('.js')) {
                    try {
                        const module = await import(`file://${fullPath}`);
                        const plugin = module.default || module;
                        
                        if (plugin && typeof plugin === 'object') {
                            const pluginName = file.replace('.js', '');
                            this.registerPlugin(pluginName, plugin);
                        }
                    } catch (err) {
                        error(`Failed to load plugin from ${fullPath}:`, err.message);
                    }
                }
            }
        } catch (err) {
            error(`Failed to load plugins from directory ${directoryPath}:`, err.message);
        }
    }

    /**
     * Register components from plugins with the DI container
     */
    registerPluginComponents() {
        for (const [name, plugin] of this.plugins) {
            if (typeof plugin.instance.registerComponents === 'function') {
                try {
                    plugin.instance.registerComponents(this.container);
                    info(`Components from plugin ${name} registered successfully`);
                } catch (err) {
                    error(`Failed to register components from plugin ${name}:`, err.message);
                }
            }
        }
    }

    /**
     * Initialize all registered plugins
     */
    async initializePlugins() {
        for (const [name, plugin] of this.plugins) {
            if (typeof plugin.instance.initialize === 'function') {
                try {
                    await plugin.instance.initialize(this.container);
                    info(`Plugin ${name} initialized successfully`);
                } catch (err) {
                    error(`Failed to initialize plugin ${name}:`, err.message);
                }
            }
        }
        this.initialized = true;
    }

    /**
     * Shutdown all plugins
     */
    async shutdownPlugins() {
        for (const [name, plugin] of this.plugins) {
            if (typeof plugin.instance.shutdown === 'function') {
                try {
                    await plugin.instance.shutdown();
                    info(`Plugin ${name} shutdown successfully`);
                } catch (err) {
                    error(`Failed to shutdown plugin ${name}:`, err.message);
                }
            }
        }
        this.initialized = false;
    }

    /**
     * Get a plugin by name
     */
    getPlugin(name) {
        return this.plugins.get(name);
    }

    /**
     * Get all registered plugins
     */
    getPlugins() {
        return Array.from(this.plugins.values());
    }

    /**
     * Check if a plugin is registered
     */
    hasPlugin(name) {
        return this.plugins.has(name);
    }
}

export default PluginManager;