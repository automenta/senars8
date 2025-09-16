import defaultConfig from './default-config.js';

/**
 * The default, unified configuration for the SeNARS system.
 * This object contains all the tunable parameters for the system's
 * core components, including memory, reasoning, language models, and more.
 *
 * To override these settings, pass a custom configuration object to the
 * `SystemFactory.createSystem(customConfig)` method. The custom object
 * will be deeply merged with this default configuration.
 */
export default defaultConfig;
