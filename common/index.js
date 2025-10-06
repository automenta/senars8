// Common exports - services & core functionality
import logger from '@senars/core/utils/logger.js';
import configProvider from './services/ConfigProvider.js';
import eventManager from './services/EventManager.js';
import sharedAPI from './services/SharedAPI.js';
import uiComponents from './services/UiComponents.js';
import {connectionManager} from './services/connection.js';
import BaseUiAgentService from './services/BaseUiAgentService.js';

// Constants
import {CONNECTION_STATUS, MESSAGE_TYPES, NOTIFICATION_TYPES} from './constants/communication.js';
import {CONFIG} from './constants/config.js';

// Utilities
import {validateNarseseStatement} from '@senars/core/utils/task-utils.js';
import * as DocumentationUtils from './utils/DocumentationUtils.js';
import * as TestUtils from './utils/TestUtils.js';

// Hooks
import useAgentState from './hooks/useAgentState.js';
import useLogs from './hooks/useLogs.js';

// Backward compatibility alias
const log = logger;

export {
    // Core services
    logger, configProvider, eventManager, sharedAPI, uiComponents,
    connectionManager, BaseUiAgentService,

    // Constants
    CONNECTION_STATUS, MESSAGE_TYPES, NOTIFICATION_TYPES, CONFIG,

    // Utilities
    validateNarseseStatement, DocumentationUtils, TestUtils,

    // Hooks
    useAgentState, useLogs,

    // Legacy support
    log,
};