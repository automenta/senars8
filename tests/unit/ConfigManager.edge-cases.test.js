import ConfigManager from '../../src/config/ConfigManager.js';

describe('ConfigManager - Edge Cases', () => {
    test('should handle null and undefined user config', () => {
        // Should not throw with null config
        expect(() => new ConfigManager(null)).not.toThrow();

        // Should not throw with undefined config
        expect(() => new ConfigManager(undefined)).not.toThrow();

        // Should not throw with empty config
        expect(() => new ConfigManager({})).not.toThrow();
    });

    test('should handle invalid config values', () => {
        const configManager = new ConfigManager({
            FOCUS_SET_SIZE: -5, // Invalid: negative number
            LM: {
                EMBEDDING_BATCH_SIZE: 0, // Invalid: zero
                EMBEDDING_BATCH_DELAY_MS: -100 // Invalid: negative
            }
        });

        // Should apply defaults for invalid values
        expect(configManager.getNumber('FOCUS_SET_SIZE')).toBe(20); // Default
        expect(configManager.getNumber('LM.EMBEDDING_BATCH_SIZE')).toBe(10); // Default clamped
        expect(configManager.getNumber('LM.EMBEDDING_BATCH_DELAY_MS')).toBe(100); // Default clamped
    });

    test('should handle wrong type config values', () => {
        const configManager = new ConfigManager({
            FOCUS_SET_SIZE: 'invalid', // Should be number
            LM: {
                LLM_PROVIDER: 123, // Should be string
                EMBEDDING_BATCH_SIZE: 'not_a_number' // Should be number
            }
        });

        // Should apply defaults for wrong types
        expect(configManager.getNumber('FOCUS_SET_SIZE')).toBe(20); // Default
        expect(configManager.getString('LM.LLM_PROVIDER')).toBe('ollama'); // Default
        expect(configManager.getNumber('LM.EMBEDDING_BATCH_SIZE')).toBe(10); // Default
    });

    test('should handle deeply nested config paths', () => {
        const configManager = new ConfigManager({
            memory: {
                FORGETTING_STRATEGY_OPTIONS: {
                    shortTerm: {
                        expirationThreshold: BigInt(1000),
                        importanceThresholds: {
                            priority: 0.5,
                            confidence: 0.6
                        }
                    }
                }
            }
        });

        // Should correctly retrieve nested values
        expect(configManager.get('memory.FORGETTING_STRATEGY_OPTIONS.shortTerm.expirationThreshold'))
            .toBe(BigInt(1000));
        expect(configManager.getNumber('memory.FORGETTING_STRATEGY_OPTIONS.shortTerm.importanceThresholds.priority'))
            .toBe(0.5);
    });

    test('should handle non-existent config paths', () => {
        const configManager = new ConfigManager({});

        // Should return undefined for non-existent paths
        expect(configManager.get('non.existent.path')).toBeUndefined();

        // Should return default values when provided
        expect(configManager.get('non.existent.path', 'default')).toBe('default');
        expect(configManager.getNumber('non.existent.number', 42)).toBe(42);
        expect(configManager.getString('non.existent.string', 'default')).toBe('default');
        expect(configManager.getBoolean('non.existent.boolean', true)).toBe(true);
        expect(configManager.getObject('non.existent.object', {key: 'value'})).toEqual({key: 'value'});
        expect(configManager.getArray('non.existent.array', [1, 2, 3])).toEqual([1, 2, 3]);
    });

    test('should handle config type validation', () => {
        const configManager = new ConfigManager({
            testNumber: 42,
            testString: 'hello',
            testBoolean: true,
            testObject: {key: 'value'},
            testArray: [1, 2, 3]
        });

        // Should correctly validate types
        expect(configManager.getNumber('testNumber')).toBe(42);
        expect(configManager.getString('testString')).toBe('hello');
        expect(configManager.getBoolean('testBoolean')).toBe(true);
        expect(configManager.getObject('testObject')).toEqual({key: 'value'});
        expect(configManager.getArray('testArray')).toEqual([1, 2, 3]);

        // Should throw for wrong types
        expect(() => configManager.getNumber('testString')).toThrow('must be a number');
        expect(() => configManager.getString('testNumber')).toThrow('must be a string');
        expect(() => configManager.getBoolean('testString')).toThrow('must be a boolean');
        expect(() => configManager.getObject('testArray')).toThrow('must be an object');
        expect(() => configManager.getArray('testObject')).toThrow('must be an array');
    });

    test('should handle config updates', () => {
        const configManager = new ConfigManager({
            FOCUS_SET_SIZE: 10
        });

        expect(configManager.getNumber('FOCUS_SET_SIZE')).toBe(10);

        // Update config
        configManager.update({
            FOCUS_SET_SIZE: 25,
            newProperty: 'newValue'
        });

        expect(configManager.getNumber('FOCUS_SET_SIZE')).toBe(25);
        expect(configManager.getString('newProperty')).toBe('newValue');
    });

    test('should handle config updates with invalid values', () => {
        const configManager = new ConfigManager({
            FOCUS_SET_SIZE: 10
        });

        // Update with invalid value
        configManager.update({
            FOCUS_SET_SIZE: -5 // Invalid: negative
        });

        // Should apply default
        expect(configManager.getNumber('FOCUS_SET_SIZE')).toBe(20);
    });

    test('should handle getAll method', () => {
        const userConfig = {
            FOCUS_SET_SIZE: 15,
            LM: {
                LLM_PROVIDER: 'xenova'
            }
        };

        const configManager = new ConfigManager(userConfig);
        const allConfig = configManager.getAll();

        // Should return complete config object
        expect(allConfig).toHaveProperty('FOCUS_SET_SIZE');
        expect(allConfig).toHaveProperty('LM');
        expect(allConfig.FOCUS_SET_SIZE).toBe(15);
        expect(allConfig.LM.LLM_PROVIDER).toBe('xenova');

        // Should include default values for unspecified properties
        expect(allConfig).toHaveProperty('memory');
        expect(allConfig).toHaveProperty('reasoner');
    });

    test('should handle edge cases in config merging', () => {
        const configManager = new ConfigManager({
            memory: {
                MAINTENANCE_CYCLE_FREQUENCY: 5,
                // Missing FORGETTING_STRATEGY_OPTIONS
            },
            LM: null, // Invalid: should be object
            reasoner: undefined // Invalid: should be object
        });

        // Should merge correctly with defaults
        expect(configManager.getNumber('memory.MAINTENANCE_CYCLE_FREQUENCY')).toBe(5);
        expect(configManager.getObject('memory.FORGETTING_STRATEGY_OPTIONS')).toBeDefined();
        expect(configManager.getObject('LM')).toBeDefined(); // Should use default
        expect(configManager.getObject('reasoner')).toBeDefined(); // Should use default
    });
});