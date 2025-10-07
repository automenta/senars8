import {createSystem, System} from './System.js';
import {createCore} from './createCore.js';
import createCoreInstance from './Core.js';
import Component from './Component.js';
import {ConfigManager as Config} from './Config.js';
import Memory from './Memory.js';
import Reasoning from './Reasoning.js';
import Cycle from './Cycle.js';
import Rules from './Rules.js';
import {Messages} from './Messages.js';
import Plugins from './Plugins.js';
import Self from './Self.js';

import {
    createTask,
    createBelief,
    createGoal,
    createQuestion,
    generateId,
    validateTask,
    deepClone,
    measureTime,
    benchmarkFunction,
    debounce,
    throttle,
    createTaskFilter,
    calculateTaskSimilarity,
    sortByPriority,
    limitTasks
} from './utils.js';

import applicationConfig from './applicationConfig.js';
import logger from './utils/logger.js';
import {handleUncaughtError, setupGracefulShutdown} from './utils/system.js';
import resourceManager from './utils/ResourceManager.js';

export {
    System,
    createSystem,
    createCore,
    createCoreInstance as Core,
    Component,
    Config,
    Memory,
    Reasoning,
    Cycle,
    Rules,
    Messages,
    Plugins,
    Self,
    createTask,
    createBelief,
    createGoal,
    createQuestion,
    generateId,
    validateTask,
    deepClone,
    measureTime,
    benchmarkFunction,
    debounce,
    throttle,
    createTaskFilter,
    calculateTaskSimilarity,
    sortByPriority,
    limitTasks,
    applicationConfig,
    logger,
    handleUncaughtError,
    setupGracefulShutdown,
    resourceManager
};

export default System;