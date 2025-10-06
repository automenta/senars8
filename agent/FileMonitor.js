import chokidar from 'chokidar';
import {globSync} from 'glob';
import {createUnifiedErrorHandler} from '../core/utils/errorHandler.js';
import {debug, info, warn} from '../core/utils/logger.js';
import PlanProcessor from '../core/utils/PlanProcessor.js';
import FileMonitoringConfig from './fileMonitoringConfig.js';
import {SystemCommands} from '../core/system/SystemCommands.js';

class FileMonitor {
    constructor(system, options = {}) {
        this.system = system;
        this.config = new FileMonitoringConfig(options);
        this.options = this.config.getConfig();
        this.errorHandler = createUnifiedErrorHandler('FileMonitoring');
        this.planProcessor = null;
        this.watcher = null;
        this.isWatching = false;
        this.processedFiles = new Set();
        this.debounceTimers = new Map();
    }

    initialize() {
        this.planProcessor = new PlanProcessor(this.system, this.options);
        this.planProcessor.initialize();
        if (this.system.eventBus) {
            this.setupSystemEventHandlers();
        }
    }

    async start() {
        if (this.isWatching) {
            info('File monitoring is already running.');
            return true;
        }

        try {
            info(`Starting file monitoring with patterns: ${this.options.patterns.join(', ')}`);
            await this.processExistingFiles();

            this.watcher = chokidar.watch(this.options.patterns, {
                ...this.options.chokidar,
                cwd: this.options.watchDir,
            });

            // Ensure the watcher object is valid before setting up event handlers
            if (!this.watcher || typeof this.watcher.on !== 'function') {
                throw new Error('Chokidar watcher not created properly');
            }

            this.setupWatcherEventHandlers();
            this.isWatching = true;
            info('File monitoring started successfully.');
            return true;
        } catch (error) {
            this.errorHandler.handleWithDefault(error, 'startFileMonitoring', false);
            warn('Failed to start file monitoring:', error.message);
            return false;
        }
    }

    setupWatcherEventHandlers() {
        if (!this.watcher) {
            warn('Watcher not initialized, skipping event handler setup');
            return;
        }

        // Check if the watcher object has the expected methods before using them
        if (typeof this.watcher.on !== 'function') {
            warn('Watcher object does not have expected event methods, skipping event handler setup');
            return;
        }

        // Add event listeners one by one instead of chaining to be safer
        this.watcher.on('add', (filePath) => this.handleFileChange(filePath));
        this.watcher.on('change', (filePath) => this.handleFileChange(filePath));
        this.watcher.on('unlink', (filePath) => this.handleFileRemoval(filePath));
        this.watcher.on('error', (error) => warn('File monitoring error:', error));
        this.watcher.on('ready', () => info('File monitoring is ready and watching for changes.'));
    }

    setupSystemEventHandlers() {
        this.system.eventBus.on('file-processed', (data) => {
            debug(`File processed: ${data.filePath}, Goals: ${data.goalsCount}, Tasks: ${data.tasksCount}`);
            this.options.onFileChanged?.(data);
        });

        this.system.eventBus.on('goal-extracted', (goal) => {
            debug(`Goal extracted: ${goal.content}`);
            this.processExtractedGoal(goal);
        });
    }

    processExtractedGoal(goal) {
        this.system.eventBus.emit('agent-goal-updated', {
            source: 'file-monitoring',
            goal: goal,
            timestamp: new Date().toISOString()
        });
    }

    async processExistingFiles() {
        for (const pattern of this.options.patterns) {
            const files = globSync(pattern, {cwd: this.options.watchDir, absolute: true});
            for (const file of files) {
                await this.processFile(file, {initial: true});
            }
        }
    }

    handleFileChange(filePath) {
        if (this.debounceTimers.has(filePath)) {
            clearTimeout(this.debounceTimers.get(filePath));
        }
        const timer = setTimeout(() => {
            this.processFile(filePath).catch(error => warn(`Error processing file ${filePath}:`, error.message));
            this.debounceTimers.delete(filePath);
        }, this.options.debounce);
        this.debounceTimers.set(filePath, timer);
    }

    handleFileRemoval(filePath) {
        this.processedFiles.delete(filePath);
        debug(`Removed file ${filePath} from monitoring.`);
    }

    async processFile(filePath, options = {}) {
        return this.errorHandler.runAsync(async () => {
            const goals = await this.planProcessor.processFile(filePath, options);
            if (goals.length === 0) return [];

            const tasks = this.planProcessor.convertGoalsToTasks(goals);
            if (tasks.length > 0) {
                // Use command bus to add tasks to ensure proper system handling
                const fileProcessedData = {
                    filePath,
                    goalsCount: goals.length,
                    tasksCount: tasks.length,
                    goals: goals,
                    initial: options.initial || false
                };

                try {
                    await this.system.commandBus.request(SystemCommands.SYSTEM_ADD_TASKS, tasks);
                    this.system.eventBus.emit('file-processed', fileProcessedData);
                    info(`Added ${tasks.length} tasks from ${filePath}`);
                } catch (error) {
                    // Fallback: try direct method if command bus fails
                    if (typeof this.system.addTasks === 'function') {
                        await this.system.addTasks(tasks);
                        this.system.eventBus.emit('file-processed', fileProcessedData);
                        info(`Added ${tasks.length} tasks from ${filePath} using direct method`);
                    } else {
                        warn(`Could not add ${tasks.length} tasks from ${filePath}: neither commandBus nor addTasks method available`);
                    }
                }
            }
            this.processedFiles.add(filePath);
            return tasks;
        }, 'processFile', {rethrow: true});
    }

    async stop() {
        if (!this.isWatching) return;
        for (const timer of this.debounceTimers.values()) {
            clearTimeout(timer);
        }
        this.debounceTimers.clear();
        if (this.watcher) {
            await this.watcher.close();
        }
        this.isWatching = false;
        info('File monitoring stopped.');
    }
}

export default FileMonitor;