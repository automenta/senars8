// Use the more sophisticated ConfigManager from core instead of duplicating functionality
import {default as ConfigManager} from '../core/config/ConfigManager.js';

export {ConfigManager};
const Config = ConfigManager;
export default Config;