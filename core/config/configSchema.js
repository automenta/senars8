import {warn} from '../utils/logger.js';
import coreSchema from './schemas/coreSchema.js';
import systemSchema from './schemas/systemSchema.js';
import memorySchema from './schemas/memorySchema.js';
import plannerSchema from './schemas/plannerSchema.js';
import actionSchema from './schemas/actionSchema.js';
import performanceSchema from './schemas/performanceSchema.js';

// Combine all schemas into one
const configSchema = {
    ...coreSchema,
    ...systemSchema,
    ...memorySchema,
    ...plannerSchema,
    ...actionSchema,
    ...performanceSchema
};

function validateConfigValue(value, schema, path) {
    if (value === undefined || value === null) {
        if (schema.required) throw new Error(`Configuration value '${path}' is required`);
        if ('default' in schema) {
            const defaultValue = schema.default;
            if (typeof defaultValue === 'object' && defaultValue !== null && schema.properties) {
                return validateConfigValue(structuredClone(defaultValue), schema, path);
            }
            return defaultValue;
        }
        return value;
    }

    const valueType = Array.isArray(value) ? 'array' : typeof value;
    if (schema.type && valueType !== schema.type) {
        warn(`[Config] Invalid type for '${path}'. Expected '${schema.type}', got '${valueType}'. Using default.`);
        return schema.default;
    }

    if (schema.enum && !schema.enum.includes(value)) {
        warn(`[Config] Invalid value for '${path}'. '${value}' is not in [${schema.enum.join(', ')}]. Using default.`);
        return schema.default;
    }

    if (valueType === 'number' && (('min' in schema && value < schema.min) || ('max' in schema && value > schema.max))) {
        warn(`[Config] Invalid value for '${path}'. ${value} is outside the range [${schema.min}-${schema.max}]. Using default.`);
        return schema.default;
    }

    if (valueType === 'string' && schema.pattern && !schema.pattern.test(value)) {
        warn(`[Config] Invalid format for '${path}'. Value does not match pattern. Using default.`);
        return schema.default;
    }

    if (schema.type === 'object' && schema.properties) {
        const validatedObject = {};
        for (const propName in value) {
            if (!Object.hasOwn(schema.properties, propName)) {
                warn(`[Config] Unknown property '${path}.${propName}' found and will be ignored.`);
            }
        }
        for (const [propName, propSchema] of Object.entries(schema.properties)) {
            const propValue = Object.hasOwn(value, propName) ? value[propName] : undefined;
            validatedObject[propName] = validateConfigValue(propValue, propSchema, `${path}.${propName}`);
        }
        return validatedObject;
    }

    return value;
}

function validateConfig(config) {
    if (typeof config !== 'object' || config === null) {
        throw new Error('Configuration must be an object.');
    }

    const validatedConfig = {};
    for (const key in config) {
        if (!Object.hasOwn(configSchema, key)) {
            warn(`[Config] Unknown configuration key '${key}' found and will be ignored.`);
        }
    }

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