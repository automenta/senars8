import { createUnifiedErrorHandler } from './errorHandler.js';

// Pre-configured error handlers for common components
export const agentErrorHandler = createUnifiedErrorHandler('Agent');
export const systemErrorHandler = createUnifiedErrorHandler('System');
export const plannerErrorHandler = createUnifiedErrorHandler('Planner');
export const perceptionErrorHandler = createUnifiedErrorHandler('Perception');
export const metaCognitionErrorHandler = createUnifiedErrorHandler('MetaCognition');
export const eventBusErrorHandler = createUnifiedErrorHandler('EventBus');
export const diContainerErrorHandler = createUnifiedErrorHandler('DIContainer');

// Add more as needed based on your components