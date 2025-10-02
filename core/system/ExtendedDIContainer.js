/**
 * @fileoverview An extended dependency injection container with plugin support.
 */

import {lstatSync, readdirSync} from 'fs';
import {join, parse} from 'path';
import {diContainerErrorHandler as errorHandler} from '../utils/errorHandler.js';

const LIFETIME = {
    TRANSIENT: 'transient',
    SINGLETON: 'singleton',
};

/**
 * Interface for plugins that can extend DI container functionality
 */
class DIPlugin {
    /**
     * Called when plugin is registered with container
     * @param {ExtendedDIContainer} container - The container instance
     */
    onRegister(_container) {
    }

    /**
     * Called before a service is registered
     * @param {string} name - Service name
     * @param {Function} definition - Service definition
     * @param {string[]} dependencies - Dependencies
     * @param {object} options - Registration options
     * @returns {object} Modified registration parameters or null to continue normally
     */
    preRegister(_name, _definition, _dependencies, _options) {
        return null;
    }

    /**
     * Called after a service is registered
     * @param {string} name - Service name
     */
    postRegister(_name) {
    }

    /**
     * Called before a service is resolved
     * @param {string} name - Service name to resolve
     */
    preResolve(_name) {
    }

    /**
     * Called after a service is resolved
     * @param {string} name - Service name that was resolved
     * @param {*} instance - The resolved instance
     */
    postResolve(_name, _instance) {
    }
}

class ExtendedDIContainer {
    constructor() {
        this.services = new Map();
        this.singletons = new Map();
        this.plugins = [];
        this.dependencyGraph = new Map(); // Cache for dependency resolution
    }

    /**
     * Registers a plugin with the container
     * @param {DIPlugin} plugin - The plugin to register
     */
    registerPlugin(plugin) {
        if (!(plugin instanceof DIPlugin)) {
            throw new Error('Plugin must be an instance of DIPlugin');
        }
        this.plugins.push(plugin);
        plugin.onRegister(this);
    }

    /**
     * Registers a service with the container.
     * @param {string} name - The name of the service.
     * @param {Function} definition - The class or factory function for the service.
     * @param {string[]} dependencies - An array of dependency names.
     * @param {object} options - Registration options.
     * @param {string} options.lifetime - The lifetime of the service (e.g., 'singleton', 'transient').
     */
    register(name, definition, dependencies = [], {lifetime = LIFETIME.TRANSIENT} = {}) {
        // Let plugins modify the registration if needed
        for (const plugin of this.plugins) {
            const result = plugin.preRegister(name, definition, dependencies, {lifetime});
            if (result) {
                ({name, definition, dependencies, lifetime} = result);
            }
        }

        this.services.set(name, {name, definition, dependencies, lifetime, isValue: false});
        this.dependencyGraph.clear(); // Clear dependency graph cache when service is registered

        // Notify plugins that service was registered
        for (const plugin of this.plugins) {
            plugin.postRegister(name);
        }
    }

    /**
     * Registers a value with the container.
     * @param {string} name - The name of the value.
     * @param {*} value - The value to register.
     */
    registerValue(name, value) {
        this.services.set(name, {
            name,
            definition: value,
            dependencies: [],
            lifetime: LIFETIME.SINGLETON,
            isValue: true
        });
    }

    /**
     * Resolves a service from the container.
     * @param {string} name - The name of the service to resolve.
     * @param {string[]} resolving - An array of names of services currently being resolved (for circular dependency detection).
     * @returns {*} The resolved service.
     */
    get(name, resolving = []) {
        // Let plugins know about the resolution
        for (const plugin of this.plugins) {
            plugin.preResolve(name);
        }

        if (resolving.includes(name)) {
            throw new Error(`Circular dependency detected: ${resolving.join(' -> ')} -> ${name}`);
        }

        const service = this.services.get(name);

        if (!service) {
            throw new Error(`Service not found: ${name}`);
        }

        if (service.isValue) {
            const result = service.definition;
            // Notify plugins about resolved instance
            for (const plugin of this.plugins) {
                plugin.postResolve(name, result);
            }
            return result;
        }

        if (service.lifetime === LIFETIME.SINGLETON && this.singletons.has(name)) {
            const result = this.singletons.get(name);
            // Notify plugins about resolved instance
            for (const plugin of this.plugins) {
                plugin.postResolve(name, result);
            }
            return result;
        }

        // Use cached dependency resolution when available
        const dependencies = this._resolveDependencies(name, [...resolving, name]);
        const instance = new service.definition(...dependencies);

        if (service.lifetime === LIFETIME.SINGLETON) {
            this.singletons.set(name, instance);
        }

        // Notify plugins about resolved instance
        for (const plugin of this.plugins) {
            plugin.postResolve(name, instance);
        }

        return instance;
    }

    /**
     * Resolves dependencies for a service, with caching
     * @private
     */
    _resolveDependencies(name, resolving) {
        // Check if we have cached dependencies for this service
        if (this.dependencyGraph.has(name)) {
            return this.dependencyGraph.get(name);
        }

        const service = this.services.get(name);
        if (!service) {
            throw new Error(`Service not found: ${name}`);
        }

        const resolvedDependencies = service.dependencies.map(dep => this.get(dep, resolving));

        // Cache the resolved dependencies
        this.dependencyGraph.set(name, resolvedDependencies);

        return resolvedDependencies;
    }

    /**
     * Loads and registers all modules from a directory.
     * @param {string} directoryPath - The path to the directory.
     * @param {object} options - Options for loading modules.
     * @param {string} options.lifetime - The lifetime to use for all loaded modules.
     */
    async load(directoryPath, {lifetime = LIFETIME.SINGLETON} = {}) {
        try {
            const files = readdirSync(directoryPath);
            for (const file of files) {
                const fullPath = join(directoryPath, file);
                if (lstatSync(fullPath).isDirectory()) {
                    await this.load(fullPath, {lifetime});
                } else if (file.endsWith('.js')) {
                    const {name: moduleName} = parse(file);
                    const module = await import(fullPath);
                    if (module.default && typeof module.default === 'function') {
                        // A simple way to infer dependencies from constructor parameter names.
                        // This is not very robust and has limitations (e.g., doesn't work with minified code).
                        // A more robust solution would be to use annotations or a separate configuration file.
                        const functionString = module.default.toString();
                        const constructorMatch = functionString.match(/constructor\s*\(([^)]*)\)/);
                        let dependencies = [];
                        if (constructorMatch && constructorMatch[1]) {
                            dependencies = constructorMatch[1].split(',').map(param => param.trim()).filter(Boolean);
                        }
                        this.register(moduleName, module.default, dependencies, {lifetime});
                    }
                }
            }
        } catch (err) {
            errorHandler.handleWithDefault(err, 'loadModulesFromDirectory');
        }
    }

    /**
     * Check if a service exists in the container
     * @param {string} name - The name of the service to check
     * @returns {boolean} True if the service exists
     */
    has(name) {
        return this.services.has(name);
    }

    /**
     * Remove a service from the container
     * @param {string} name - The name of the service to remove
     */
    remove(name) {
        if (this.singletons.has(name)) {
            this.singletons.delete(name);
        }
        this.services.delete(name);
        this.dependencyGraph.delete(name);
    }

    /**
     * Get all registered service names
     * @returns {string[]} Array of service names
     */
    getServiceNames() {
        return Array.from(this.services.keys());
    }
}

export default ExtendedDIContainer;
export {DIPlugin, LIFETIME};