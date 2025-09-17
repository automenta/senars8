/**
 * Configuration schema definition and validation utilities
 */
import {warn} from '../utils/logger.js';

/**
 * @typedef {Object} ConfigSchema
 * @property {string} type - The expected type of the configuration value
 * @property {*} [default] - The default value if not provided
 * @property {number} [min] - Minimum value for numbers
 * @property {number} [max] - Maximum value for numbers
 * @property {string[]} [enum] - Allowed values for string enums
 * @property {RegExp} [pattern] - Pattern for string validation
 * @property {boolean} [required] - Whether the value is required
 * @property {Object} [properties] - Schema for object properties
 */

/**
 * Core configuration schema
 */
const configSchema = {
    // Core settings
    FOCUS_SET_SIZE: {
        type: 'number',
        min: 1,
        max: 1000,
        default: 20
    },
    META_TASK_PRIORITY: {
        type: 'number',
        min: 0,
        max: 1,
        default: 0.9
    },
    ACTIONABLE_GOAL_PRIORITY_THRESHOLD: {
        type: 'number',
        min: 0,
        max: 1,
        default: 0.1
    },
    MAX_GOALS_TO_EXECUTE: {
        type: 'number',
        min: 1,
        max: 100,
        default: 3
    },
    RECENCY_DECAY_FACTOR: {
        type: 'number',
        min: 1,
        default: 10000
    },
    SIMILARITY_OFFSET: {
        type: 'number',
        min: 0,
        max: 1,
        default: 0.1
    },
    SIMILARITY_SCALE: {
        type: 'number',
        min: 0,
        default: 1.1
    },
    DEFAULT_TRUTH_VALUE: {
        type: 'object',
        properties: {
            frequency: {
                type: 'number',
                min: 0,
                max: 1,
                default: 1.0
            },
            confidence: {
                type: 'number',
                min: 0,
                max: 1,
                default: 0.9
            }
        },
        default: {
            frequency: 1.0,
            confidence: 0.9
        }
    },
    LM_HYPOTHESIS_CONFIGS: {
        type: 'array',
        default: [{
            type: 'general',
            num: 2
        }, {
            type: 'creative',
            num: 1
        }, {
            type: 'sophisticated',
            num: 1
        }]
    },

    // System settings
    system: {
        type: 'object',
        properties: {
            BATCH_SIZE: {
                type: 'number',
                min: 1,
                max: 1000,
                default: 10
            },
            CONFIDENCE_REDUCTION_FACTOR: {
                type: 'number',
                min: 0,
                max: 1,
                default: 0.1
            }
        },
        default: {
            BATCH_SIZE: 10,
            CONFIDENCE_REDUCTION_FACTOR: 0.1
        }
    },

    // Language Model (LM) settings
    LM: {
        type: 'object',
        properties: {
            LLM_PROVIDER: {
                type: 'string',
                enum: ['xenova', 'ollama'],
                default: 'ollama'
            },
            OLLAMA_BASE_URL: {
                type: 'string',
                pattern: /^https?:\/\/.+/,
                default: 'http://127.0.0.1:11434'
            },
            FEATURE_EXTRACTION_MODEL: {
                type: 'string',
                default: 'Xenova/all-MiniLM-L6-v2'
            },
            TEXT_GENERATION_MODEL: {
                type: 'string',
                default: 'Xenova/distilgpt2'
            },
            QA_MODEL: {
                type: 'string',
                default: 'Xenova/distilbert-base-uncased-distilled-squad'
            },
            EMBEDDING_BATCH_SIZE: {
                type: 'number',
                min: 1,
                max: 100,
                default: 10
            },
            EMBEDDING_BATCH_DELAY_MS: {
                type: 'number',
                min: 0,
                max: 10000,
                default: 100
            }
        },
        default: {
            LLM_PROVIDER: 'ollama',
            OLLAMA_BASE_URL: 'http://127.0.0.1:11434',
            FEATURE_EXTRACTION_MODEL: 'Xenova/all-MiniLM-L6-v2',
            TEXT_GENERATION_MODEL: 'Xenova/distilgpt2',
            QA_MODEL: 'Xenova/distilbert-base-uncased-distilled-squad',
            EMBEDDING_BATCH_SIZE: 10,
            EMBEDDING_BATCH_DELAY_MS: 100
        }
    },

    // Memory settings
    memory: {
        type: 'object',
        properties: {
            FORGETTING_STRATEGY_NAME: {
                type: 'string',
                enum: ['TimeBased'],
                default: 'TimeBased'
            },
            FORGETTING_STRATEGY_OPTIONS: {
                type: 'object'
            },
            MAINTENANCE_CYCLE_FREQUENCY: {
                type: 'number',
                min: 1,
                default: 10
            },
            CONSOLIDATION_PRIORITY_THRESHOLD: {
                type: 'number',
                min: 0,
                max: 1,
                default: 0.8
            },
            CONSOLIDATION_CONFIDENCE_THRESHOLD: {
                type: 'number',
                min: 0,
                max: 1,
                default: 0.9
            }
        },
        default: {
            FORGETTING_STRATEGY_NAME: 'TimeBased',
            FORGETTING_STRATEGY_OPTIONS: {
                shortTerm: {
                    expirationThreshold: BigInt(24) * BigInt(3600 * 1000),
                    importanceThresholds: {
                        priority: 0.7,
                        confidence: 0.7
                    }
                },
                longTerm: {
                    expirationThreshold: BigInt(30) * BigInt(24) * BigInt(3600 * 1000),
                    importanceThresholds: {
                        priority: 0.8,
                        confidence: 0.8
                    }
                }
            },
            MAINTENANCE_CYCLE_FREQUENCY: 10,
            CONSOLIDATION_PRIORITY_THRESHOLD: 0.8,
            CONSOLIDATION_CONFIDENCE_THRESHOLD: 0.9
        }
    },

    // Reasoner settings
    reasoner: {
        type: 'object',
        properties: {
            strategy: {
                type: 'string',
                enum: ['BagSampling', 'BruteForce'],
                default: 'BagSampling'
            }
        },
        default: {
            strategy: 'BagSampling'
        }
    },

    // Planner settings
    planner: {
        type: 'object',
        properties: {
            strategy: {
                type: 'string',
                enum: ['HTN', 'AStar'],
                default: 'HTN'
            },
            maxDepth: {
                type: 'number',
                min: 1,
                max: 100,
                default: 10
            },
            plannerConfig: {
                type: 'object'
            }
        },
        default: {
            strategy: 'HTN',
            maxDepth: 10,
            plannerConfig: {
                heuristicWeights: {
                    complexity: 0.4,
                    confidence: 0.3,
                    semantic: 0.3
                }
            }
        }
    },

    // Temporal reasoning settings
    temporal: {
        type: 'object',
        properties: {
            REGULARITY_BOOST: {
                type: 'number',
                min: 0,
                max: 1,
                default: 0.7
            },
            STRUCTURAL_SIMILARITY_WEIGHT: {
                type: 'number',
                min: 0,
                max: 1,
                default: 0.3
            },
            TEMPORAL_CONFIDENCE: {
                type: 'number',
                min: 0,
                max: 1,
                default: 0.9
            },
            TEMPORAL_RELATIONSHIP_FREQUENCY: {
                type: 'number',
                min: 0,
                max: 1,
                default: 0.8
            },
            TEMPORAL_RELATIONSHIP_CONFIDENCE: {
                type: 'number',
                min: 0,
                max: 1,
                default: 0.7
            },
            MEETS_IMPLICATION_FREQUENCY: {
                type: 'number',
                min: 0,
                max: 1,
                default: 0.9
            },
            MEETS_IMPLICATION_CONFIDENCE: {
                type: 'number',
                min: 0,
                max: 1,
                default: 0.8
            },
            OVERLAP_IMPLICATION_FREQUENCY: {
                type: 'number',
                min: 0,
                max: 1,
                default: 0.8
            },
            OVERLAP_IMPLICATION_CONFIDENCE: {
                type: 'number',
                min: 0,
                max: 1,
                default: 0.7
            },
            SEQUENCE_CONFIDENCE_DECAY: {
                type: 'number',
                min: 0,
                max: 1,
                default: 0.9
            },
            PERIODIC_CONFIDENCE: {
                type: 'number',
                min: 0,
                max: 1,
                default: 0.8
            },
            TEMPORAL_SUMMARY_CONFIDENCE: {
                type: 'number',
                min: 0,
                max: 1,
                default: 0.9
            },
            PREDICTION_CONFIDENCE: {
                type: 'number',
                min: 0,
                max: 1,
                default: 0.5
            },
            MAX_COMPARISONS: {
                type: 'number',
                min: 1,
                default: 1000
            }
        },
        default: {
            REGULARITY_BOOST: 0.7,
            STRUCTURAL_SIMILARITY_WEIGHT: 0.3,
            TEMPORAL_CONFIDENCE: 0.9,
            TEMPORAL_RELATIONSHIP_FREQUENCY: 0.8,
            TEMPORAL_RELATIONSHIP_CONFIDENCE: 0.7,
            MEETS_IMPLICATION_FREQUENCY: 0.9,
            MEETS_IMPLICATION_CONFIDENCE: 0.8,
            OVERLAP_IMPLICATION_FREQUENCY: 0.8,
            OVERLAP_IMPLICATION_CONFIDENCE: 0.7,
            SEQUENCE_CONFIDENCE_DECAY: 0.9,
            PERIODIC_CONFIDENCE: 0.8,
            TEMPORAL_SUMMARY_CONFIDENCE: 0.9,
            PREDICTION_CONFIDENCE: 0.5,
            MAX_COMPARISONS: 1000
        }
    },

    // Action Executor settings
    ACTION_EXECUTOR: {
        type: 'object',
        properties: {
            RESOURCES: {
                type: 'array'
            },
            CONSTRAINTS: {
                type: 'object'
            }
        },
        default: {
            RESOURCES: [{
                name: 'cpu',
                total: 100,
                unit: 'percent'
            }, {
                name: 'memory',
                total: 8192,
                unit: 'MB'
            }, {
                name: 'network',
                total: 1000,
                unit: 'Mbps'
            }],
            CONSTRAINTS: {
                resource_limit: {
                    type: 'function'
                },
                safety: {
                    type: 'function'
                }
            }
        }
    }
};

/**
 * Validates a configuration value against a schema
 * @param {*} value - The value to validate
 * @param {ConfigSchema} schema - The schema to validate against
 * @param {string} path - The configuration path for error messages
 * @returns {*} The validated value, possibly with defaults applied
 * @throws {Error} If the value is invalid according to the schema
 */
function validateConfigValue(value, schema, path) {
    // Handle required values
    if (schema.required && (value === undefined || value === null)) {
        // This is a hard error, as it indicates a programming mistake.
        throw new Error(`Configuration value '${path}' is required`);
    }

    // Handle default values for undefined or null
    if (value === undefined || value === null) {
        if ('default' in schema) {
            // If the default is an object, we need to validate it too
            if (typeof schema.default === 'object' && schema.default !== null && schema.properties) {
                return validateConfigValue(structuredClone(schema.default), schema, path);
            }
            return schema.default;
        }
        return value;
    }

    // Validate type
    if (schema.type) {
        const valueType = typeof value;
        if (schema.type === 'array' && !Array.isArray(value)) {
            warn(`[Config] Invalid type for '${path}'. Expected 'array', got '${valueType}'. Using default.`);
            return schema.default;
        }
        if (schema.type !== 'array' && valueType !== schema.type) {
            warn(`[Config] Invalid type for '${path}'. Expected '${schema.type}', got '${valueType}'. Using default.`);
            return schema.default;
        }
    }

    // Validate enum values
    if (schema.enum && !schema.enum.includes(value)) {
        warn(`[Config] Invalid value for '${path}'. '${value}' is not in [${schema.enum.join(', ')}]. Using default.`);
        return schema.default;
    }

    // Validate number ranges
    if (typeof value === 'number') {
        if (('min' in schema && value < schema.min) || ('max' in schema && value > schema.max)) {
            warn(`[Config] Invalid value for '${path}'. ${value} is outside the range [${schema.min}-${schema.max}]. Using default.`);
            return schema.default;
        }
    }

    // Validate string patterns
    if (typeof value === 'string' && schema.pattern && !schema.pattern.test(value)) {
        warn(`[Config] Invalid format for '${path}'. Value does not match pattern. Using default.`);
        return schema.default;
    }

    // Validate and strip unknown properties from objects
    if (schema.type === 'object' && schema.properties) {
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
            warn(`[Config] Invalid type for '${path}'. Expected 'object', got '${typeof value}'. Using default.`);
            return schema.default;
        }

        const validatedObject = {};

        // Warn about unknown properties
        for (const propName in value) {
            if (!Object.hasOwn(schema.properties, propName)) {
                warn(`[Config] Unknown property '${path}.${propName}' found and will be ignored.`);
            }
        }

        // Validate known properties
        for (const [propName, propSchema] of Object.entries(schema.properties)) {
            const propPath = `${path}.${propName}`;
            const propValue = Object.hasOwn(value, propName) ? value[propName] : undefined;
            validatedObject[propName] = validateConfigValue(propValue, propSchema, propPath);
        }
        return validatedObject;
    }

    return value;
}

/**
 * Validates an entire configuration object against the schema, stripping unknown properties.
 * @param {object} config - The configuration object to validate
 * @returns {object} The validated and cleaned configuration with defaults applied
 * @throws {Error} If the configuration is not an object
 */
function validateConfig(config) {
    if (typeof config !== 'object' || config === null) {
        throw new Error('Configuration must be an object.');
    }

    const validatedConfig = {};

    // Warn about unknown top-level properties
    for (const key in config) {
        if (!Object.hasOwn(configSchema, key)) {
            warn(`[Config] Unknown configuration key '${key}' found and will be ignored.`);
        }
    }

    // Validate all known properties from the schema
    for (const [key, schema] of Object.entries(configSchema)) {
        const value = Object.hasOwn(config, key) ? config[key] : undefined;
        validatedConfig[key] = validateConfigValue(value, schema, key);
    }
    return validatedConfig;
}

export {
    configSchema,
    validateConfigValue,
    validateConfig
};