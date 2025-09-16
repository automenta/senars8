import ConfigManager from '../../src/config/ConfigManager.js';
import {validateConfig, validateConfigValue} from '../../src/config/configSchema.js';

describe('Configuration - Edge Cases', () => {
    test('should handle null and undefined user config', () => {
        // Should not throw with null config
        expect(() => new ConfigManager(null)).not.toThrow();

        // Should not throw with undefined config
        expect(() => new ConfigManager(undefined)).not.toThrow();

        // Should work with empty object
        const configManager = new ConfigManager({});
        expect(configManager).toBeDefined();
    });

    test('should handle invalid config values', () => {
        // Test with invalid LM provider
        const configManager1 = new ConfigManager({
            LM: {
                LLM_PROVIDER: 'invalid_provider'
            }
        });
        // Should still allow getting the value, validation happens elsewhere
        expect(configManager1.get('LM.LLM_PROVIDER')).toBe('invalid_provider');

        // Test with invalid number values
        const configManager2 = new ConfigManager({
            FOCUS_SET_SIZE: -5
        });
        expect(configManager2.get('FOCUS_SET_SIZE')).toBe(-5);
    });

    test('should handle extreme numeric values', () => {
        // Test with very large numbers
        const configManager1 = new ConfigManager({
            FOCUS_SET_SIZE: Number.MAX_SAFE_INTEGER
        });
        expect(configManager1.getNumber('FOCUS_SET_SIZE')).toBe(Number.MAX_SAFE_INTEGER);

        // Test with very small numbers
        const configManager2 = new ConfigManager({
            FOCUS_SET_SIZE: Number.MIN_SAFE_INTEGER
        });
        expect(configManager2.getNumber('FOCUS_SET_SIZE')).toBe(Number.MIN_SAFE_INTEGER);

        // Test with zero
        const configManager3 = new ConfigManager({
            FOCUS_SET_SIZE: 0
        });
        expect(configManager3.getNumber('FOCUS_SET_SIZE')).toBe(0);
    });

    test('should handle boundary string values', () => {
        // Test with empty string
        const configManager1 = new ConfigManager({
            LM: {
                LLM_PROVIDER: ''
            }
        });
        expect(configManager1.getString('LM.LLM_PROVIDER')).toBe('');

        // Test with very long string
        const longString = 'a'.repeat(10000);
        const configManager2 = new ConfigManager({
            LM: {
                LLM_PROVIDER: longString
            }
        });
        expect(configManager2.getString('LM.LLM_PROVIDER')).toBe(longString);
    });

    test('should handle boundary array values', () => {
        // Test with empty array
        const configManager1 = new ConfigManager({
            LM_HYPOTHESIS_CONFIGS: []
        });
        expect(configManager1.getArray('LM_HYPOTHESIS_CONFIGS')).toEqual([]);

        // Test with very large array
        const largeArray = new Array(1000).fill({type: 'test', num: 1});
        const configManager2 = new ConfigManager({
            LM_HYPOTHESIS_CONFIGS: largeArray
        });
        expect(configManager2.getArray('LM_HYPOTHESIS_CONFIGS')).toEqual(largeArray);
    });

    test('should handle boundary object values', () => {
        // Test with null object
        const configManager1 = new ConfigManager({
            LM: null
        });
        expect(configManager1.get('LM')).toBeNull();

        // Test with empty object
        const configManager2 = new ConfigManager({
            LM: {}
        });
        expect(configManager2.getObject('LM')).toEqual({});

        // Test with very nested object
        const nestedObject = {a: {b: {c: {d: {e: 'deep'}}}}};
        const configManager3 = new ConfigManager({
            test: nestedObject
        });
        expect(configManager3.getObject('test')).toEqual(nestedObject);
    });

    test('should handle mixed valid and invalid config sections', () => {
        const configManager = new ConfigManager({
            FOCUS_SET_SIZE: 50, // Valid
            LM: {
                LLM_PROVIDER: 'invalid', // Invalid but accepted
                INVALID_FIELD: 'test' // Extra field
            },
            INVALID_SECTION: {
                some: 'value'
            }
        });

        // Valid values should work
        expect(configManager.getNumber('FOCUS_SET_SIZE')).toBe(50);

        // Invalid values should still be accessible
        expect(configManager.getString('LM.LLM_PROVIDER')).toBe('invalid');
        expect(configManager.get('LM.INVALID_FIELD')).toBe('test');
        expect(configManager.get('INVALID_SECTION.some')).toBe('value');
    });

    test('should handle config updates with edge cases', () => {
        const configManager = new ConfigManager({
            FOCUS_SET_SIZE: 20
        });

        expect(configManager.getNumber('FOCUS_SET_SIZE')).toBe(20);

        // Update with null
        configManager.update(null);
        expect(configManager.getNumber('FOCUS_SET_SIZE')).toBe(20); // Should not change

        // Update with undefined
        configManager.update(undefined);
        expect(configManager.getNumber('FOCUS_SET_SIZE')).toBe(20); // Should not change

        // Update with empty object
        configManager.update({});
        expect(configManager.getNumber('FOCUS_SET_SIZE')).toBe(20); // Should not change

        // Update with new value
        configManager.update({
            FOCUS_SET_SIZE: 30
        });
        expect(configManager.getNumber('FOCUS_SET_SIZE')).toBe(30); // Should change
    });

    test('should handle typed accessors with wrong types', () => {
        const configManager = new ConfigManager({
            FOCUS_SET_SIZE: 'not_a_number',
            LM: {
                LLM_PROVIDER: 123
            }
        });

        // Should throw when getting number but value is string
        expect(() => configManager.getNumber('FOCUS_SET_SIZE'))
            .toThrow('Configuration value \'FOCUS_SET_SIZE\' must be a number, got string');

        // Should throw when getting string but value is number
        expect(() => configManager.getString('LM.LLM_PROVIDER'))
            .toThrow('Configuration value \'LM.LLM_PROVIDER\' must be a string, got number');
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

        // Should return complete configuration
        expect(allConfig.FOCUS_SET_SIZE).toBe(25);
        expect(allConfig.LM.LLM_PROVIDER).toBe('ollama');
        expect(allConfig.memory.MAINTENANCE_CYCLE_FREQUENCY).toBe(15);
    });

    test('should handle config validation edge cases', () => {
        // Test validateConfig with null
        expect(() => validateConfig(null)).toThrow();

        // Test validateConfig with undefined
        expect(() => validateConfig(undefined)).toThrow();

        // Test validateConfig with empty object
        const result = validateConfig({});
        expect(result).toBeDefined();

        // Test validateConfigValue with various edge cases
        expect(() => validateConfigValue(null, {required: true}, 'test'))
            .toThrow('Configuration value \'test\' is required');

        expect(validateConfigValue(undefined, {default: 'default'}, 'test'))
            .toBe('default');
    });
});