import chokidar from 'chokidar';
import { globSync } from 'glob';
import { createUnifiedErrorHandler } from '../core/utils/errorHandler.js';
import { info, warn, debug } from '../core/utils/logger.js';
import PlanProcessor from '../core/utils/PlanProcessor.js';
import FileMonitoringConfig from './fileMonitoringConfig.js';

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
        this.watcher
            .on('add', (filePath) => this.handleFileChange(filePath))
            .on('change', (filePath) => this.handleFileChange(filePath))
            .on('unlink', (filePath) => this.handleFileRemoval(filePath))
            .on('error', (error) => warn('File monitoring error:', error))
            .on('ready', () => info('File monitoring is ready and watching for changes.'));
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
            const files = globSync(pattern, { cwd: this.options.watchDir, absolute: true });
            for (const file of files) {
                await this.processFile(file, { initial: true });
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
                await this.system.addTasks(tasks);
                this.system.eventBus.emit('file-processed', {
                    filePath,
                    goalsCount: goals.length,
                    tasksCount: tasks.length,
                    goals: goals,
                    initial: options.initial || false
                });
                info(`Added ${tasks.length} tasks from ${filePath}`);
            }
            this.processedFiles.add(filePath);
            return tasks;
        }, 'processFile', { rethrow: true });
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