/**
 * Simplified Configuration for SeNARS
 * Uses environment variables with sensible defaults
 */

const DEFAULTS = {
  UI_PORT: 3000,
  WS_PORT: 8081,
  DEV_MODE: true,
  LOG_LEVEL: 'info',
  // Development-specific settings
  HOT_RELOAD: true,
  DEBUG_MODE: true,
  VERBOSE_LOGGING: true,
  COMPONENT_RELOAD: true,
};

export const config = {
  uiPort: parseInt(process.env.SENARS_UI_PORT || DEFAULTS.UI_PORT),
  wsPort: parseInt(process.env.SENARS_WS_PORT || DEFAULTS.WS_PORT),
  devMode: process.env.SENARS_DEV_MODE !== 'false' && DEFAULTS.DEV_MODE,
  logLevel: process.env.SENARS_LOG_LEVEL || DEFAULTS.LOG_LEVEL,
  hotReload: process.env.SENARS_HOT_RELOAD !== 'false' && DEFAULTS.HOT_RELOAD,
  debugMode: process.env.SENARS_DEBUG_MODE !== 'false' && DEFAULTS.DEBUG_MODE,
  verboseLogging: process.env.SENARS_VERBOSE_LOGGING !== 'false' && DEFAULTS.VERBOSE_LOGGING,
  componentReload: process.env.SENARS_COMPONENT_RELOAD !== 'false' && DEFAULTS.COMPONENT_RELOAD,
};

export default config;