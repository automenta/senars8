// Common module exports for both UI and TUI
import AgentCommunicationService from './services/AgentCommunicationService.js';
import logger from './services/Logger.js';
import configProvider from './services/ConfigProvider.js';
import eventManager from './services/EventManager.js';
import sharedAPI from './services/SharedAPI.js';
import uiComponents from './services/UiComponents.js';
import {CONNECTION_STATUS, MESSAGE_TYPES, NOTIFICATION_TYPES} from './constants/communication.js';
import {CONFIG} from './constants/config.js';
import {validateNarseseStatement} from './utils/coreUtils.js';
import log from './utils/logger.js';

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