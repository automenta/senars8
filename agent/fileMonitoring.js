import chokidar from 'chokidar';
import PlanProcessor from '../core/utils/PlanProcessor.js';
import {debug, info, warn} from '../core/utils/logger.js';
import {createUnifiedErrorHandler} from '../core/utils/errorHandler.js';
import FileMonitoringConfig from './fileMonitoringConfig.js';

/**
 * A self-contained module for monitoring files, processing them,
 * and integrating the results into the agent's cognitive system.
 */
class FileMonitoring {
    constructor(agent, options = {}) {
        this.agent = agent;
        this.system = agent.system;
        this.config = new FileMonitoringConfig(options);
        this.options = this.config.getConfig();

        this.errorHandler = createUnifiedErrorHandler('FileMonitoring');
        this.planProcessor = new PlanProcessor(this.system, this.options);
        this.watcher = null;
        this.isWatching = false;
        this.processedFiles = new Set();
        this.debounceTimers = new Map();

        this.planProcessor.initialize();
    }

    async start() {
        if (this.isWatching) {
            info('File monitoring is already running.');
            return;
        }

        try {
            info(`Starting file monitoring with patterns: ${this.options.patterns.join(', ')}`);
            await this.processExistingFiles();

            this.watcher = chokidar.watch(this.options.patterns, {
                persistent: this.options.persistent,
                ignoreInitial: this.options.ignoreInitial,
                followSymlinks: this.options.followSymlinks,
                cwd: this.options.watchDir,
                ignorePermissionErrors: true,
                usePolling: this.options.usePolling || false,
                interval: this.options.interval || 100,
                binaryInterval: this.options.binaryInterval || 300,
                awaitWriteFinish: {
                    stabilityThreshold: 2000,
                    pollInterval: 100
                },
            });

            this.setupEventHandlers();
            if (this.system.eventBus) {
                this.setupSystemEventHandlers();
            }

            this.isWatching = true;
            info('File monitoring started successfully.');
            return true;
        } catch (error) {
            warn('Failed to start file monitoring:', error.message);
            return false;
        }
    }

    setupEventHandlers() {
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
            if (this.options.onFileChanged) {
                this.options.onFileChanged(data);
            }
        });

        this.system.eventBus.on('goal-extracted', (goal) => {
            debug(`Goal extracted: ${goal.content}`);
            this.processExtractedGoal(goal);
        });
    }

    processExtractedGoal(goal) {
        if (this.system.eventBus) {
            this.system.eventBus.emit('agent-goal-updated', {
                source: 'file-monitoring',
                goal: goal,
                timestamp: new Date().toISOString()
            });
        }
    }

    async processExistingFiles() {
        for (const pattern of this.options.patterns) {
            const glob = await import('glob');
            const files = glob.glob.sync(pattern, {cwd: this.options.watchDir, absolute: true});
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
        try {
            const goals = await this.planProcessor.processFile(filePath, options);
            if (goals.length === 0) return [];

            const tasks = this.planProcessor.convertGoalsToTasks(goals);
            if (this.system && tasks.length > 0) {
                await this.system.addTasks(tasks);
                if (this.system.eventBus) {
                    this.system.eventBus.emit('file-processed', {
                        filePath,
                        goalsCount: goals.length,
                        tasksCount: tasks.length,
                        goals: goals,
                        initial: options.initial || false
                    });
                }
                info(`Added ${tasks.length} tasks from ${filePath}`);
            }
            this.processedFiles.add(filePath);
            return tasks;
        } catch (error) {
            warn(`Error processing file ${filePath}:`, error.message);
            throw error;
        }
    }

    async addPatterns(patterns) {
        if (!Array.isArray(patterns)) patterns = [patterns];

        const newPatterns = patterns.filter(p => !this.options.patterns.includes(p));
        if (newPatterns.length === 0) return;

        this.options.patterns.push(...newPatterns);

        if (this.watcher) {
            await this.watcher.add(newPatterns);
            await this.processExistingFiles();
        }
    }

    removePatterns(patterns) {
        if (!Array.isArray(patterns)) patterns = [patterns];
        this.options.patterns = this.options.patterns.filter(p => !patterns.includes(p));
        if (this.watcher) {
            this.watcher.unwatch(patterns);
        }
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

    getStatistics() {
        return {
            isWatching: this.isWatching,
            patterns: this.options.patterns,
            processedFilesCount: this.processedFiles.size,
            processorStats: this.planProcessor.getStatistics(),
            watchedDirs: this.watcher ? this.watcher.getWatched() : [],
        };
    }

    async processFilesNow(filePaths) {
        const allTasks = [];
        if (typeof filePaths === 'string') filePaths = [filePaths];
        for (const filePath of filePaths) {
            const tasks = await this.processFile(filePath, {initial: true});
            allTasks.push(...tasks);
        }
        return allTasks;
    }

    updateConfig(newConfig) {
        this.config.updateConfig(newConfig);
        this.options = this.config.getConfig();
        Object.assign(this.planProcessor.options, this.options);
    }
}

export default FileMonitoring;