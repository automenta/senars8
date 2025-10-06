// Browser-specific exports - services & core functionality that work in browsers
import logger from '../core/utils/logger.js';

// Constants
import {CONNECTION_STATUS, MESSAGE_TYPES, NOTIFICATION_TYPES} from './constants/communication.js';
import {CONFIG} from './constants/config.js';

// Utilities - only import browser-compatible utilities
import {validateNarseseStatement} from '../core/utils/task-utils.js';
import * as DocumentationUtils from './utils/DocumentationUtils.js';
import * as TestUtils from './utils/TestUtils.js';

// Hooks
import useAgentState from './hooks/useAgentState.js';
import useLogs from './hooks/useLogs.js';

// Browser-compatible services only
import {browserConnectionManager} from './services/BrowserConnectionManager.js';

// Backward compatibility alias
const log = logger;

export {
    // Core services
    logger, 
    browserConnectionManager, // Use browser-specific connection manager
    
    // Constants
    CONNECTION_STATUS, MESSAGE_TYPES, NOTIFICATION_TYPES, CONFIG,

    // Utilities
    validateNarseseStatement, DocumentationUtils, TestUtils,

    // Hooks
    useAgentState, useLogs,

    // Legacy support
    log,
};