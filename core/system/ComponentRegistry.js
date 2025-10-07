/**
 * Component Registration System for SeNARS
 * Provides a modular way to register system components
 */

import {LIFETIME} from './DIContainer.js';

// Define component categories for better organization
const COMPONENT_CATEGORIES = {
    FOUNDATIONAL: 'foundational',
    CORE: 'core',
    ADVANCED: 'advanced',
    INTEGRATION: 'integration',
    UTILITY: 'utility'
};

// Component registry to organize registration
class ComponentRegistry {
    constructor() {
        this.components = new Map();
        this.dependencies = new Map(); // Track inter-component dependencies
        this.categories = new Map(); // Track component categories
    }

    /**
     * Register a component with its dependencies and category
     * @param {string} name - Component name
     * @param {Function|Object} definition - Component constructor or value
     * @param {string[]} dependencies - List of dependency names
     * @param {Object} options - Registration options
     * @param {string} options.category - Component category
     * @param {string} options.lifetime - Component lifetime
     */
    register(name, definition, dependencies = [], options = {}) {
        const {
            category = COMPONENT_CATEGORIES.CORE,
            lifetime = LIFETIME.SINGLETON,
            isValue = false
        } = options;

        this.components.set(name, {
            name,
            definition,
            dependencies,
            lifetime,
            isValue
        });

        this.dependencies.set(name, dependencies);
        this.categories.set(name, category);

        return this;
    }

    /**
     * Register a value component
     * @param {string} name - Component name
     * @param {*} value - Component value
     * @param {string} category - Component category
     */
    registerValue(name, value, category = COMPONENT_CATEGORIES.UTILITY) {
        return this.register(name, value, [], {category, isValue: true});
    }

    /**
     * Get all registered components
     */
    getAll() {
        return Array.from(this.components.values());
    }

    /**
     * Get components by category
     * @param {string} category - Component category
     */
    getByCategory(category) {
        return Array.from(this.components.values())
            .filter(component => this.categories.get(component.name) === category);
    }

    /**
     * Get component dependencies
     * @param {string} name - Component name
     */
    getDependencies(name) {
        return this.dependencies.get(name) || [];
    }

    /**
     * Get all component names
     */
    getNames() {
        return Array.from(this.components.keys());
    }

    /**
     * Check if a component exists
     * @param {string} name - Component name
     */
    has(name) {
        return this.components.has(name);
    }

    /**
     * Get registration options for a component
     * @param {string} name - Component name
     */
    getOptions(name) {
        return this.components.get(name);
    }
}

// Create singleton registry instance
const componentRegistry = new ComponentRegistry();

// Predefined component definitions to ensure consistent registration
const CoreComponents = {
    // Foundational components
    configManager: {
        name: 'configManager',
        dependencies: [],
        category: COMPONENT_CATEGORIES.FOUNDATIONAL,
        lifetime: LIFETIME.SINGLETON,
    },

    eventBus: {
        name: 'eventBus',
        dependencies: [],
        category: COMPONENT_CATEGORIES.FOUNDATIONAL,
        lifetime: LIFETIME.SINGLETON,
    },

    commandBus: {
        name: 'commandBus',
        dependencies: [],
        category: COMPONENT_CATEGORIES.FOUNDATIONAL,
        lifetime: LIFETIME.SINGLETON,
    },

    metricsService: {
        name: 'metricsService',
        dependencies: [],
        category: COMPONENT_CATEGORIES.FOUNDATIONAL,
        lifetime: LIFETIME.SINGLETON,
    },

    // Core components
    memory: {
        name: 'memory',
        dependencies: ['configManager', 'eventBus', 'commandBus'],
        category: COMPONENT_CATEGORIES.CORE,
        lifetime: LIFETIME.SINGLETON,
    },

    truthValueManager: {
        name: 'truthValueManager',
        dependencies: [],
        category: COMPONENT_CATEGORIES.CORE,
        lifetime: LIFETIME.SINGLETON,
    },

    strategyRegistry: {
        name: 'strategyRegistry',
        dependencies: ['metricsService'],
        category: COMPONENT_CATEGORIES.CORE,
        lifetime: LIFETIME.SINGLETON,
    },

    lm: {
        name: 'lm',
        dependencies: ['configManager', 'commandBus', 'eventBus', 'metricsService'],
        category: COMPONENT_CATEGORIES.CORE,
        lifetime: LIFETIME.SINGLETON,
    },

    // Advanced components
    taskFactory: {
        name: 'taskFactory',
        dependencies: ['memory', 'lm', 'eventBus', 'commandBus'],
        category: COMPONENT_CATEGORIES.ADVANCED,
        lifetime: LIFETIME.SINGLETON,
    },

    temporalReasoner: {
        name: 'temporalReasoner',
        dependencies: ['configManager', 'metricsService'],
        category: COMPONENT_CATEGORIES.ADVANCED,
        lifetime: LIFETIME.SINGLETON,
    },

    actionExecutor: {
        name: 'actionExecutor',
        dependencies: ['memory', 'configManager', 'eventBus', 'commandBus'],
        category: COMPONENT_CATEGORIES.ADVANCED,
        lifetime: LIFETIME.SINGLETON,
    },

    perception: {
        name: 'perception',
        dependencies: ['memory', 'taskFactory', 'eventBus', 'commandBus'],
        category: COMPONENT_CATEGORIES.ADVANCED,
        lifetime: LIFETIME.SINGLETON,
    },

    planner: {
        name: 'planner',
        dependencies: ['memory', 'lm', 'actionExecutor', 'configManager'],
        category: COMPONENT_CATEGORIES.ADVANCED,
        lifetime: LIFETIME.SINGLETON,
    },

    priorityManager: {
        name: 'priorityManager',
        dependencies: ['memory', 'configManager'],
        category: COMPONENT_CATEGORIES.ADVANCED,
        lifetime: LIFETIME.SINGLETON,
    },

    contradictionAnalyzer: {
        name: 'contradictionAnalyzer',
        dependencies: [],
        category: COMPONENT_CATEGORIES.ADVANCED,
        lifetime: LIFETIME.SINGLETON,
    },

    resolutionStrategy: {
        name: 'resolutionStrategy',
        dependencies: ['truthValueManager', 'metricsService'],
        category: COMPONENT_CATEGORIES.ADVANCED,
        lifetime: LIFETIME.SINGLETON,
    },

    // Higher-level components
    reasoner: {
        name: 'reasoner',
        dependencies: ['configManager', 'temporalReasoner', 'strategyRegistry', 'commandBus'],
        category: COMPONENT_CATEGORIES.ADVANCED,
        lifetime: LIFETIME.SINGLETON,
    },

    metaCognition: {
        name: 'metaCognition',
        dependencies: ['configManager', 'contradictionAnalyzer', 'resolutionStrategy', 'eventBus', 'commandBus', 'metricsService'],
        category: COMPONENT_CATEGORIES.ADVANCED,
        lifetime: LIFETIME.SINGLETON,
    },

    // Top-level components
    cycle: {
        name: 'cycle',
        dependencies: [
            'configManager', 'memory', 'reasoner', 'lm', 'perception',
            'planner', 'metaCognition', 'temporalReasoner', 'priorityManager', 'eventBus', 'commandBus'
        ],
        category: COMPONENT_CATEGORIES.CORE,
        lifetime: LIFETIME.SINGLETON,
    },

    system: {
        name: 'system',
        dependencies: [
            'configManager', 'memory', 'reasoner', 'actionExecutor', 'cycle',
            'planner', 'metaCognition', 'perception', 'eventBus', 'commandBus'
        ],
        category: COMPONENT_CATEGORIES.CORE,
        lifetime: LIFETIME.SINGLETON,
    }
};

/**
 * Register all core components with the container
 * @param {DIContainer} container - The DI container instance
 * @param {ConfigManager} configManager - The configuration manager
 */
const registerCoreComponents = (container, configManager) => {
    // Register config manager first
    componentRegistry.registerValue('configManager', configManager);
    container.registerValue('configManager', configManager);

    // Register all core components
    Object.values(CoreComponents).forEach(component => {
        if (component.name !== 'configManager') { // Skip configManager as it's already registered as a value
            componentRegistry.register(component.name, getComponentClass(component.name), component.dependencies, {
                category: component.category,
                lifetime: component.lifetime
            });

            // Register with the actual container
            const ComponentClass = getComponentClass(component.name);
            if (component.name === 'configManager') {
                container.registerValue(component.name, configManager);
            } else {
                container.register(component.name, ComponentClass, component.dependencies, {
                    lifetime: component.lifetime
                });
            }
        }
    });
};

// Helper function to get the actual component class by name
// This maps component names to their actual implementations
const getComponentClass = (name) => {
    // This is a simplified mapping - in a real implementation, you'd import each component
    const componentClasses = {
        // Foundational
        'eventBus': () => import('./EventBus.js').then(m => m.default),
        'commandBus': () => import('./CommandBus.js').then(m => m.default),
        'metricsService': () => import('./MetricsService.js').then(m => m.default),

        // Core
        'memory': () => import('../memory/Memory.js').then(m => m.default),
        'truthValueManager': () => import('../reasoner/TruthValueManager.js').then(m => m.default),
        'strategyRegistry': () => import('../reasoner/StrategyRegistry.js').then(m => m.default),
        'lm': () => import('../lm/LM.js').then(m => m.default),

        // Advanced
        'taskFactory': () => import('../core/TaskFactory.js').then(m => m.default),
        'temporalReasoner': () => import('../reasoner/TemporalReasoner.js').then(m => m.default),
        'actionExecutor': () => import('./ActionExecutor.js').then(m => m.default),
        'perception': () => import('./Perception.js').then(m => m.default),
        'planner': () => import('./Planner.js').then(m => m.default),
        'priorityManager': () => import('../reasoner/PriorityManager.js').then(m => m.default),
        'contradictionAnalyzer': () => import('../reasoner/ContradictionAnalyzer.js').then(m => m.default),
        'resolutionStrategy': () => import('../reasoner/strategies/ResolutionStrategy.js').then(m => m.default),

        // Higher-level
        'reasoner': () => import('../reasoner/Reasoner.js').then(m => m.default),
        'metaCognition': () => import('./MetaCognition.js').then(m => m.default),

        // Top-level
        'cycle': () => import('./Cycle.js').then(m => m.default),
        'system': () => import('./System.js').then(m => m.default),
    };

    if (componentClasses[name]) {
        return componentClasses[name]();
    } else {
        throw new Error(`Component class not found for: ${name}`);
    }
};

// Export the registry and registration functions
export {
    componentRegistry,
    registerCoreComponents,
    COMPONENT_CATEGORIES,
    CoreComponents
};

// Export for backward compatibility
export default registerCoreComponents;