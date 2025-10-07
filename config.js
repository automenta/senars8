/**
 * Legacy Configuration Export for backward compatibility
 * Uses centralized ApplicationConfig instead of duplicate values
 */
import {applicationConfig} from './core/config/index.js';

export const config = {
  uiPort: applicationConfig.getUiPort(),
  wsPort: applicationConfig.getWsPort(),
  devMode: applicationConfig.getBoolean('app.devMode', true),
  logLevel: applicationConfig.getString('app.logLevel', 'info'),
  hotReload: applicationConfig.getBoolean('app.hotReload', true),
  debugMode: applicationConfig.getBoolean('app.debugMode', true),
  verboseLogging: applicationConfig.getBoolean('app.verboseLogging', true),
  componentReload: applicationConfig.getBoolean('app.componentReload', true),
};

export default config;