import {CONFIG} from '@common/constants/config.js';
import {
    CONNECTION_STATUS as CORE_CONNECTION_STATUS,
    MESSAGE_TYPES as CORE_MESSAGE_TYPES,
    NOTIFICATION_TYPES as CORE_NOTIFICATION_TYPES
} from '@common/constants/communication.js';

// Re-export shared constants for use within the UI
export const CONNECTION_STATUS = CORE_CONNECTION_STATUS;
export const MESSAGE_TYPES = CORE_MESSAGE_TYPES;
export const NOTIFICATION_TYPES = CORE_NOTIFICATION_TYPES;

// UI-specific constants
export const UI_CONSTANTS = {
    // Merge shared config with UI-specific settings
    CONNECTION: CONFIG.CONNECTION,
    VALIDATION: CONFIG.VALIDATION,

    // UI-only constants
    UI: {
        MAX_MESSAGE_HISTORY: 50,
        MAX_NOTIFICATIONS: 100,
        DEFAULT_NOTIFICATION_DURATION: 5000,
        MAX_NOTIFICATION_HISTORY: 30,
    },

    // Layout constants
    LAYOUT: {
        DEFAULT_PRESET_NAME: 'default',
        LAYOUT_STORAGE_KEY: 'senars-ide-layout',
        PRESET_LAYOUTS_STORAGE_KEY: 'senars-ide-preset-layouts',
    }
};