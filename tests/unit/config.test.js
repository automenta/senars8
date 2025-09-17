import ConfigManager from '../../src/config/ConfigManager.js';
import { validateConfig, validateConfigValue } from '../../src/config/configSchema.js';
import defaultConfig from '../../src/config/default-config.js';
import * as logger from '../../src/utils/logger.js';

// Mock the logger to spy on warnings
jest.mock('../../src/utils/logger.js', () => ({
    ...jest.requireActual('../../src/utils/logger.js'),
    warn: jest.fn(),
}));

describe('Configuration System', () => {
    beforeEach(() => {
        // Clear mock calls before each test
        logger.warn.mockClear();
    });

    describe('ConfigManager', () => {
        test('should handle null, undefined, or empty user config gracefully', () => {
            expect(() => new ConfigManager(null)).not.toThrow();
            expect(() => new ConfigManager(undefined)).not.toThrow();
            const cm = new ConfigManager({});
            expect(cm).toBeDefined();
            expect(cm.getAll()).toEqual(defaultConfig);
        });

        test('should replace invalid values with defaults and log a warning', () => {
            const cmInvalidProvider = new ConfigManager({ LM: { LLM_PROVIDER: 'invalid_provider' } });
            expect(cmInvalidProvider.get('LM.LLM_PROVIDER')).toBe(defaultConfig.LM.LLM_PROVIDER);
            expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("[Config] Invalid value for 'LM.LLM_PROVIDER'"));

            const cmInvalidNumber = new ConfigManager({ FOCUS_SET_SIZE: -5 });
            expect(cmInvalidNumber.get('FOCUS_SET_SIZE')).toBe(defaultConfig.FOCUS_SET_SIZE);
            expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("[Config] Invalid value for 'FOCUS_SET_SIZE'"));
        });

        test('should handle extreme numeric values by falling back to defaults and log a warning', () => {
            const cmLarge = new ConfigManager({ FOCUS_SET_SIZE: Number.MAX_SAFE_INTEGER });
            expect(cmLarge.getNumber('FOCUS_SET_SIZE')).toBe(defaultConfig.FOCUS_SET_SIZE);
            expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("[Config] Invalid value for 'FOCUS_SET_SIZE'"));

            logger.warn.mockClear();

            const cmSmall = new ConfigManager({ FOCUS_SET_SIZE: Number.MIN_SAFE_INTEGER });
            expect(cmSmall.getNumber('FOCUS_SET_SIZE')).toBe(defaultConfig.FOCUS_SET_SIZE);
            expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("[Config] Invalid value for 'FOCUS_SET_SIZE'"));
        });

        test('should handle valid boundary numeric values', () => {
            const cmMin = new ConfigManager({ RECENCY_DECAY_FACTOR: 1 });
            expect(cmMin.getNumber('RECENCY_DECAY_FACTOR')).toBe(1);
        });

        test('should handle boundary string values', () => {
            const cmEmptyString = new ConfigManager({ LM: { LLM_PROVIDER: '' } });
            expect(cmEmptyString.getString('LM.LLM_PROVIDER')).toBe(defaultConfig.LM.LLM_PROVIDER);

            const longString = 'a'.repeat(10000);
            const cmLongString = new ConfigManager({ LM: { FEATURE_EXTRACTION_MODEL: longString } });
            expect(cmLongString.getString('LM.FEATURE_EXTRACTION_MODEL')).toBe(longString);
        });

        test('should handle boundary array values', () => {
            const cmEmptyArray = new ConfigManager({ LM_HYPOTHESIS_CONFIGS: [] });
            expect(cmEmptyArray.getArray('LM_HYPOTHESIS_CONFIGS')).toEqual([]);

            const largeArray = new Array(1000).fill({ type: 'test', num: 1 });
            const cmLargeArray = new ConfigManager({ LM_HYPOTHESIS_CONFIGS: largeArray });
            expect(cmLargeArray.getArray('LM_HYPOTHESIS_CONFIGS')).toEqual(largeArray);
        });

        test('should handle boundary object values', () => {
            const cmNullObject = new ConfigManager({ LM: null });
            expect(cmNullObject.get('LM')).toEqual(defaultConfig.LM);

            const cmEmptyObject = new ConfigManager({ LM: {} });
            expect(cmEmptyObject.getObject('LM')).toEqual(defaultConfig.LM);
        });

        test('should strip unknown properties and log warnings', () => {
            const configWithExtras = {
                FOCUS_SET_SIZE: 50, // Valid
                LM: {
                    LLM_PROVIDER: 'xenova', // Valid
                    INVALID_FIELD: 'should be removed' // Invalid extra
                },
                INVALID_SECTION: { // Invalid extra
                    some: 'value'
                }
            };
            const cm = new ConfigManager(configWithExtras);

            // Check that valid values are still set
            expect(cm.getNumber('FOCUS_SET_SIZE')).toBe(50);
            expect(cm.getString('LM.LLM_PROVIDER')).toBe('xenova');

            // Check that unknown properties are stripped
            expect(cm.get('LM.INVALID_FIELD')).toBeUndefined();
            expect(cm.get('INVALID_SECTION')).toBeUndefined();

            // Check that warnings were logged for the unknown properties
            expect(logger.warn).toHaveBeenCalledWith("[Config] Unknown configuration key 'INVALID_SECTION' found and will be ignored.");
            expect(logger.warn).toHaveBeenCalledWith("[Config] Unknown property 'LM.INVALID_FIELD' found and will be ignored.");
        });

        test('should handle config updates with edge cases', () => {
            const configManager = new ConfigManager({ FOCUS_SET_SIZE: 20 });
            expect(configManager.getNumber('FOCUS_SET_SIZE')).toBe(20);

            // Update with null, undefined, or empty object should not change the config
            configManager.update(null);
            expect(configManager.getNumber('FOCUS_SET_SIZE')).toBe(20);
            configManager.update(undefined);
            expect(configManager.getNumber('FOCUS_SET_SIZE')).toBe(20);
            configManager.update({});
            expect(configManager.getNumber('FOCUS_SET_SIZE')).toBe(20);

            // Update with a new valid value
            configManager.update({ FOCUS_SET_SIZE: 30 });
            expect(configManager.getNumber('FOCUS_SET_SIZE')).toBe(30);
        });

        test('should throw error for wrong type accessors on a valid config', () => {
            const cm = new ConfigManager();
            // The default value for FOCUS_SET_SIZE is a number, so getString should throw
            expect(() => cm.getString('FOCUS_SET_SIZE'))
                .toThrow("Configuration value 'FOCUS_SET_SIZE' must be a string, got number");

            // The default value for LM.LLM_PROVIDER is a string, so getNumber should throw
            expect(() => cm.getNumber('LM.LLM_PROVIDER'))
                .toThrow("Configuration value 'LM.LLM_PROVIDER' must be a number, got string");
        });

        test('should handle getAll with complex configurations', () => {
            const complexConfig = {
                FOCUS_SET_SIZE: 25,
                LM: {
                    LLM_PROVIDER: 'ollama',
                    OLLAMA_BASE_URL: 'http://localhost:11434',
                    FEATURE_EXTRACTION_MODEL: 'Xenova/all-MiniLM-L6-v2',
                    EMBEDDING_BATCH_SIZE: 15
                },
                memory: {
                    MAINTENANCE_CYCLE_FREQUENCY: 15,
                    FORGETTING_STRATEGY_OPTIONS: {
                        shortTerm: {
                            expirationThreshold: BigInt(24) * BigInt(3600 * 1000),
                            importanceThresholds: {
                                priority: 0.75,
                                confidence: 0.75
                            }
                        }
                    }
                }
            };

            const configManager = new ConfigManager(complexConfig);
            const allConfig = configManager.getAll();

            const expectedConfig = {
                ...defaultConfig,
                FOCUS_SET_SIZE: 25,
                LM: {
                    ...defaultConfig.LM,
                    ...complexConfig.LM
                },
                memory: {
                    ...defaultConfig.memory,
                    ...complexConfig.memory,
                    FORGETTING_STRATEGY_OPTIONS: {
                        ...defaultConfig.memory.FORGETTING_STRATEGY_OPTIONS,
                        ...complexConfig.memory.FORGETTING_STRATEGY_OPTIONS
                    }
                }
            };

            expect(allConfig).toEqual(expectedConfig);
        });
    });

    describe('Config Validation', () => {
        test('should handle config validation edge cases', () => {
            expect(() => validateConfig(null)).toThrow('Configuration must be an object.');
            expect(() => validateConfig(undefined)).toThrow('Configuration must be an object.');

            const result = validateConfig({});
            const expectedDefaultConfig = { ...defaultConfig };
            // The functions in the default config are not equal to the functions in the schema, so we have to remove them for the deep equal check
            delete expectedDefaultConfig.ACTION_EXECUTOR.CONSTRAINTS;
            const resultConstraints = result.ACTION_EXECUTOR.CONSTRAINTS;
            delete result.ACTION_EXECUTOR.CONSTRAINTS;

            expect(result).toEqual(expectedDefaultConfig);
            // And check the functions separately
            expect(typeof resultConstraints.resource_limit).toBe('object');
            expect(typeof resultConstraints.safety).toBe('object');


            expect(() => validateConfigValue(null, { required: true }, 'test'))
                .toThrow("Configuration value 'test' is required");

            expect(validateConfigValue(undefined, { default: 'default' }, 'test'))
                .toBe('default');
        });

        test('should warn about invalid types and use defaults', () => {
            const config = { FOCUS_SET_SIZE: 'not a number' };
            const validated = validateConfig(config);
            expect(validated.FOCUS_SET_SIZE).toBe(defaultConfig.FOCUS_SET_SIZE);
            expect(logger.warn).toHaveBeenCalledWith("[Config] Invalid type for 'FOCUS_SET_SIZE'. Expected 'number', got 'string'. Using default.");
        });

        test('should warn about out-of-range numbers and use defaults', () => {
            const config = { FOCUS_SET_SIZE: 999999 };
            const validated = validateConfig(config);
            expect(validated.FOCUS_SET_SIZE).toBe(defaultConfig.FOCUS_SET_SIZE);
            expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("[Config] Invalid value for 'FOCUS_SET_SIZE'. 999999 is outside the range"));
        });

        test('should warn about invalid enum values and use defaults', () => {
            const config = { LM: { LLM_PROVIDER: 'not-a-real-provider' } };
            const validated = validateConfig(config);
            expect(validated.LM.LLM_PROVIDER).toBe(defaultConfig.LM.LLM_PROVIDER);
            expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("[Config] Invalid value for 'LM.LLM_PROVIDER'. 'not-a-real-provider' is not in"));
        });

        test('should warn about invalid string patterns and use defaults', () => {
            const config = { LM: { OLLAMA_BASE_URL: 'invalid-url' } };
            const validated = validateConfig(config);
            expect(validated.LM.OLLAMA_BASE_URL).toBe(defaultConfig.LM.OLLAMA_BASE_URL);
            expect(logger.warn).toHaveBeenCalledWith("[Config] Invalid format for 'LM.OLLAMA_BASE_URL'. Value does not match pattern. Using default.");
        });
    });
});
