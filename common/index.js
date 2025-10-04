// Common module exports for both UI and TUI
import logger from '@senars/core/utils/logger.js';
import log from '@senars/core/utils/logger.js';
import configProvider from './services/ConfigProvider.js';
import eventManager from './services/EventManager.js';
import sharedAPI from './services/SharedAPI.js';
import uiComponents from './services/UiComponents.js';
import { connectionManager } from './services/connection.js';
import {CONNECTION_STATUS, MESSAGE_TYPES, NOTIFICATION_TYPES} from './constants/communication.js';
import {CONFIG} from './constants/config.js';
import {validateNarseseStatement} from '@senars/core/utils/task-utils.js';
import useAgentState from './hooks/useAgentState.js';
import useLogs from './hooks/useLogs.js';

export {
    // Services
    logger,
    configProvider,
    eventManager,
    sharedAPI,
    uiComponents,
    connectionManager,

    // Constants
    CONNECTION_STATUS,
    MESSAGE_TYPES,
    NOTIFICATION_TYPES,
    CONFIG,

    // Utilities
    validateNarseseStatement,
    log,

    // Hooks
    useAgentState,
    useLogs,
};