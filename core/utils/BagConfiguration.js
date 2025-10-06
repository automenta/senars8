/**
 * Configuration management for Bag data structures
 * Provides centralized configuration for Bag-related settings
 */
class BagConfiguration {
    constructor(configManager) {
        this.config = configManager;
        this.defaultSettings = {
            // Core Bag settings
            BAG_DEFAULT_CAPACITY: 100,
            BAG_MAX_CAPACITY: 10000,
            BAG_MIN_CAPACITY: 1,

            // Memory system integration
            FOCUS_SET_SIZE: 20,
            RECENT_TASKS_CACHE_SIZE: 50,
            PRIORITY_TASKS_BAG_SIZE: 100,

            // Buffer management
            MAX_MESSAGE_QUEUE_SIZE: 100,
            MAX_TOOL_QUEUE_SIZE: 50,
            MAX_ADJACENCY_COLLECTION_SIZE: 200,

            // Sampling behavior
            SAMPLING_MIN_PRIORITY: 0.001,
            SAMPLING_MAX_ATTEMPTS: 50
        };
    }

    /**
     * Get Bag configuration value with fallback to defaults
     * @param {string} key - Configuration key
     * @param {*} defaultValue - Default value if not found
     * @returns {*} - Configuration value
     */
    get(key, defaultValue = null) {
        // First check explicit configuration
        const configValue = this.config?.get(`bag.${key.toLowerCase()}`);

        if (configValue !== undefined && configValue !== null) {
            return configValue;
        }

        // Fall back to default settings
        if (this.defaultSettings.hasOwnProperty(key)) {
            return this.defaultSettings[key];
        }

        return defaultValue;
    }

    /**
     * Get Bag capacity for specific use case
     * @param {string} useCase - Use case identifier
     * @returns {number} - Recommended capacity
     */
    getCapacityForUseCase(useCase) {
        const capacityMap = {
            'memory-focus-set': this.get('FOCUS_SET_SIZE'),
            'memory-recent-tasks': this.get('RECENT_TASKS_CACHE_SIZE'),
            'memory-priority-tasks': this.get('PRIORITY_TASKS_BAG_SIZE'),
            'buffer-messages': this.get('MAX_MESSAGE_QUEUE_SIZE'),
            'buffer-tools': this.get('MAX_TOOL_QUEUE_SIZE'),
            'buffer-adjacencies': this.get('MAX_ADJACENCY_COLLECTION_SIZE'),
            'default': this.get('BAG_DEFAULT_CAPACITY')
        };

        return capacityMap[useCase] || capacityMap.default;
    }

    /**
     * Validate Bag configuration settings
     * @returns {Object} - Validation results
     */
    validateConfiguration() {
        const issues = [];

        // Validate capacity settings
        const maxCapacity = this.get('BAG_MAX_CAPACITY');
        const minCapacity = this.get('BAG_MIN_CAPACITY');
        const defaultCapacity = this.get('BAG_DEFAULT_CAPACITY');

        if (defaultCapacity < minCapacity || defaultCapacity > maxCapacity) {
            issues.push(`Default capacity ${defaultCapacity} is outside valid range [${minCapacity}, ${maxCapacity}]`);
        }

        // Validate use case capacities
        const useCases = [
            'FOCUS_SET_SIZE',
            'RECENT_TASKS_CACHE_SIZE',
            'PRIORITY_TASKS_BAG_SIZE',
            'MAX_MESSAGE_QUEUE_SIZE',
            'MAX_TOOL_QUEUE_SIZE'
        ];

        useCases.forEach(useCase => {
            const capacity = this.get(useCase);
            if (capacity < 1) {
                issues.push(`${useCase} must be at least 1, got ${capacity}`);
            }
        });

        // Validate sampling settings
        const minPriority = this.get('SAMPLING_MIN_PRIORITY');
        if (minPriority <= 0) {
            issues.push(`Sampling minimum priority must be positive, got ${minPriority}`);
        }

        return {
            isValid: issues.length === 0,
            issues
        };
    }
}

export default BagConfiguration;