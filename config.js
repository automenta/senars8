/**
 * Legacy Configuration Export for backward compatibility
 * Uses centralized ApplicationConfig instead of duplicate values
 */
import {applicationConfig} from './core/config/index.js';

export const config = {
    uiPort: applicationConfig.getUiPort(),
    wsPort: applicationConfig.getWsPort(),
    devMode: applicationConfig.appSettings.devMode,
    logLevel: applicationConfig.appSettings.logLevel,
    hotReload: applicationConfig.appSettings.hotReload,
    debugMode: applicationConfig.appSettings.debugMode,
    verboseLogging: applicationConfig.appSettings.verboseLogging,
    componentReload: applicationConfig.appSettings.componentReload,
};

export default config;