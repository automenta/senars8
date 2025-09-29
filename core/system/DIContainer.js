/**
 * @fileoverview A lightweight dependency injection container.
 */

import {lstatSync, readdirSync} from 'fs';
import {join, parse} from 'path';
import {diContainerErrorHandler as errorHandler} from '../utils/errorHandler.js';

const LIFETIME = {
    TRANSIENT: 'transient',
    SINGLETON: 'singleton',
};

class DIContainer {
    constructor() {
        this.services = new Map();
        this.singletons = new Map();
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
        this.services.set(name, {name, definition, dependencies, lifetime, isValue: false});
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
        if (resolving.includes(name)) {
            throw new Error(`Circular dependency detected: ${resolving.join(' -> ')} -> ${name}`);
        }

        const service = this.services.get(name);

        if (!service) {
            throw new Error(`Service not found: ${name}`);
        }

        if (service.isValue) {
            return service.definition;
        }

        if (service.lifetime === LIFETIME.SINGLETON && this.singletons.has(name)) {
            return this.singletons.get(name);
        }

        const {definition, dependencies} = service;
        const resolvedDependencies = dependencies.map(dep => this.get(dep, [...resolving, name]));
        const instance = new definition(...resolvedDependencies);

        if (service.lifetime === LIFETIME.SINGLETON) {
            this.singletons.set(name, instance);
        }

        return instance;
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
}

const containerSingleton = new DIContainer();
export default containerSingleton;
export {DIContainer, LIFETIME};
