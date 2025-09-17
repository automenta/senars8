import ConfigManager from '../../src/config/ConfigManager.js';
import {validateConfig, validateConfigValue} from '../../src/config/configSchema.js';
import defaultConfig from '../../src/config/default-config.js';
import * as logger from '../../src/utils/logger.js';

jest.mock('../../src/utils/logger.js', () => ({
    ...jest.requireActual('../../src/utils/logger.js'),
    warn: jest.fn(),
}));

const createConfigManager = (config) => new ConfigManager(config);

describe('Configuration System', () => {
    beforeEach(() => {
        logger.warn.mockClear();
    });

    describe('ConfigManager', () => {
        it.each([null, undefined, {}])('should handle %p user config gracefully', (userConfig) => {
            const cm = createConfigManager(userConfig);
            expect(cm).toBeDefined();
            expect(cm.getAll()).toEqual(defaultConfig);
        });

        it('should replace invalid values with defaults and log a warning', () => {
            const cm = createConfigManager({
                LM: {
                    LLM_PROVIDER: 'invalid_provider'
                }
            });
            expect(cm.get('LM.LLM_PROVIDER')).toBe(defaultConfig.LM.LLM_PROVIDER);
            expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("[Config] Invalid value for 'LM.LLM_PROVIDER'"));
        });

        it('should strip unknown properties and log warnings', () => {
            const cm = createConfigManager({
                INVALID_SECTION: {
                    some: 'value'
                }
            });
            expect(cm.get('INVALID_SECTION')).toBeUndefined();
            expect(logger.warn).toHaveBeenCalledWith("[Config] Unknown configuration key 'INVALID_SECTION' found and will be ignored.");
        });

        it('should throw error for wrong type accessors', () => {
            const cm = createConfigManager();
            expect(() => cm.getString('FOCUS_SET_SIZE')).toThrow("Configuration value 'FOCUS_SET_SIZE' must be a string, got number");
        });
    });

    describe('Config Validation', () => {
        it.each([null, undefined])('should throw for %p config', (config) => {
            expect(() => validateConfig(config)).toThrow('Configuration must be an object.');
        });

        it('should return default config for empty config', () => {
            const result = validateConfig({});
            const expectedConfig = {
                ...defaultConfig
            };
            delete expectedConfig.ACTION_EXECUTOR.CONSTRAINTS;
            const resultConstraints = result.ACTION_EXECUTOR.CONSTRAINTS;
            delete result.ACTION_EXECUTOR.CONSTRAINTS;

            expect(result).toEqual(expectedConfig);
            expect(typeof resultConstraints.resource_limit).toBe('object');
            expect(typeof resultConstraints.safety).toBe('object');
        });

        it('should use default for required value', () => {
            expect(() => validateConfigValue(null, {
                required: true
            }, 'test')).toThrow("Configuration value 'test' is required");
        });

        it('should warn about invalid types and use defaults', () => {
            const validated = validateConfig({
                FOCUS_SET_SIZE: 'not a number'
            });
            expect(validated.FOCUS_SET_SIZE).toBe(defaultConfig.FOCUS_SET_SIZE);
            expect(logger.warn).toHaveBeenCalledWith("[Config] Invalid type for 'FOCUS_SET_SIZE'. Expected 'number', got 'string'. Using default.");
        });
    });
});
