import {afterEach, beforeEach, describe, it, expect, vi} from 'vitest';
import ConfigManager from '../../core/config/ConfigManager.js';
import defaultConfig from '../../core/config/default-config.js';
import * as logger from '../../core/utils/logger.js';

describe('ConfigManager', () => {
    let warnSpy;

    beforeEach(() => {
        warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
        warnSpy.mockRestore();
    });

    it('should initialize with default configuration', () => {
        const configManager = new ConfigManager();
        // Check that all default config properties are present
        Object.keys(defaultConfig).forEach(key => {
            expect(configManager.get(key)).toEqual(defaultConfig[key]);
        });
    });

    it('should merge user configuration with defaults', () => {
        const userConfig = {
            FOCUS_SET_SIZE: 10,
            system: {
                BATCH_SIZE: 5
            },
        };
        const configManager = new ConfigManager(userConfig);
        expect(configManager.get('FOCUS_SET_SIZE')).toBe(10);
        expect(configManager.get('system.BATCH_SIZE')).toBe(5);
        expect(configManager.get('META_TASK_PRIORITY')).toBe(defaultConfig.META_TASK_PRIORITY);
    });

    it('should get a value by path', () => {
        const configManager = new ConfigManager();
        expect(configManager.get('system.BATCH_SIZE')).toBe(10);
    });

    it('should return a default value if path does not exist', () => {
        const configManager = new ConfigManager();
        expect(configManager.get('nonexistent.path', 'default')).toBe('default');
    });

    it('should handle different data types for getters', () => {
        const configManager = new ConfigManager();
        expect(typeof configManager.getNumber('FOCUS_SET_SIZE')).toBe('number');
        expect(typeof configManager.getString('LM.LLM_PROVIDER')).toBe('string');
        expect(() => configManager.getBoolean('LM.LLM_PROVIDER')).toThrow('Configuration value \'LM.LLM_PROVIDER\' must be a boolean, got string');
        expect(typeof configManager.getObject('system')).toBe('object');
        expect(Array.isArray(configManager.getArray('LM_HYPOTHESIS_CONFIGS'))).toBe(true);
    });

    it('should update configuration', () => {
        const configManager = new ConfigManager();
        expect(configManager.get('FOCUS_SET_SIZE')).toBe(20);
        configManager.update({
            FOCUS_SET_SIZE: 15
        });
        expect(configManager.get('FOCUS_SET_SIZE')).toBe(15);
    });

    it('should strip unknown properties from the configuration', () => {
        const userConfig = {
            unknownProperty: 'should_be_stripped',
            system: {
                unknownNested: true,
            },
        };
        const configManager = new ConfigManager(userConfig);
        expect(configManager.get('unknownProperty')).toBeUndefined();
        expect(configManager.get('system.unknownNested')).toBeUndefined();
    });

    it('should handle null and undefined values in user config', () => {
        const userConfig = {
            FOCUS_SET_SIZE: null,
            system: undefined,
        };
        const configManager = new ConfigManager(userConfig);
        expect(configManager.get('FOCUS_SET_SIZE')).toBe(defaultConfig.FOCUS_SET_SIZE);
        expect(configManager.get('system')).toEqual(defaultConfig.system);
    });
});
