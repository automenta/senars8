// Common module exports for both UI and TUI
import AgentCommunicationService from './services/AgentCommunicationService.js';
import logger from '@core/utils/logger.js';
import configProvider from './services/ConfigProvider.js';
import eventManager from './services/EventManager.js';
import sharedAPI from './services/SharedAPI.js';
import uiComponents from './services/UiComponents.js';
import {CONNECTION_STATUS, MESSAGE_TYPES, NOTIFICATION_TYPES} from './constants/communication.js';
import {CONFIG} from './constants/config.js';
import {validateNarseseStatement} from '@core/utils/task-utils.js';
import log from '@core/utils/logger.js';

export {
    // Services
    AgentCommunicationService,
    logger,
    configProvider,
    eventManager,
    sharedAPI,
    uiComponents,

    // Constants
    CONNECTION_STATUS,
    MESSAGE_TYPES,
    NOTIFICATION_TYPES,
    CONFIG,

    // Utilities
    validateNarseseStatement,
    log
};