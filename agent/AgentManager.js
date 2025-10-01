import { Agent } from './index.js';
import { error, info, warn, debug } from '../core/utils/logger.js';
import { formatTaskForBroadcast } from './utils/taskUtils.js';
import { SystemCommands } from '../core/system/SystemCommands.js';
import chokidar from 'chokidar';
import PlanProcessor from '../core/utils/PlanProcessor.js';
import { createUnifiedErrorHandler } from '../core/utils/errorHandler.js';
import FileMonitoringConfig from './fileMonitoringConfig.js';
import { globSync } from 'glob';

class AgentManager {
    constructor(broadcast) {
        this.agent = new Agent();
        this.broadcast = broadcast;
        this.system = null;

        // File monitoring properties
        const fileMonitoringOptions = this.agent.config.fileMonitoring || {};
        this.config = new FileMonitoringConfig(fileMonitoringOptions);
        this.options = this.config.getConfig();
        this.errorHandler = createUnifiedErrorHandler('FileMonitoring');
        this.planProcessor = null;
        this.watcher = null;
        this.isWatching = false;
        this.processedFiles = new Set();
        this.debounceTimers = new Map();
    }

    async initialize() {
        try {
            await this.agent.initialize();
            this.system = this.agent.system;
            this.planProcessor = new PlanProcessor(this.system, this.options);
            this.planProcessor.initialize();

            info('Agent initialized');
            this.broadcast({ type: 'agentStatus', payload: 'initialized' });
            this.setupEventListeners();
            await this.startFileMonitoring();
            return true;
        } catch (err) {
            error('Agent initialization failed:', err);
            this.broadcast({ type: 'agentStatus', payload: 'initialization_failed' });
            return false;
        }
    }

    setupEventListeners() {
        const eventBus = this.agent.system.eventBus;
        if (eventBus) {
            info('Attaching event listeners to EventBus');
            eventBus.on('status_update', (status) => this.broadcast({ type: 'status_update', payload: status }));
            eventBus.on('system_cycle', (cycleCount) => this.broadcast({
                type: 'system_cycle',
                payload: { cycleCount }
            }));
            eventBus.on('add_belief', (belief) => this.broadcast({
                type: 'add_belief',
                payload: formatTaskForBroadcast(belief)
            }));
            eventBus.on('add_goal', (goal) => this.broadcast({
                type: 'add_goal',
                payload: formatTaskForBroadcast(goal)
            }));
            eventBus.on('add_question', (question) => this.broadcast({
                type: 'add_question',
                payload: formatTaskForBroadcast(question)
            }));
            eventBus.on('add_task', (task) => this.broadcast({
                type: 'task_added',
                payload: formatTaskForBroadcast(task)
            }));
            eventBus.on('reasoning_step', (step) => this.broadcast({ type: 'reasoning_step', payload: step }));
            eventBus.on('memory_changed', (changes) => this.broadcast({
                type: 'memory_update',
                payload: changes
            }));
        } else {
            warn('Agent event bus not available. UI will not receive real-time updates.');
        }
    }

    getAgent() {
        return this.agent;
    }

    async start(maxCycles) {
        if (this.agent.system && this.agent.system.commandBus) {
            this.broadcast({ type: 'log', payload: { source: 'system', message: 'Agent command received: start' } });
            await this.agent.system.commandBus.request(SystemCommands.SYSTEM_START_CYCLING, { maxCycles });
        }
    }

    async stop() {
        if (this.agent.system && this.agent.system.commandBus) {
            this.broadcast({ type: 'log', payload: { source: 'system', message: 'Agent command received: stop' } });
            await this.agent.system.commandBus.request(SystemCommands.SYSTEM_STOP_CYCLING);
        }
        await this.stopFileMonitoring();
    }

    async reset() {
        if (this.agent.system && this.agent.system.commandBus) {
            this.broadcast({ type: 'log', payload: { source: 'system', message: 'Agent command received: reset' } });
            await this.agent.system.commandBus.request(SystemCommands.SYSTEM_RESET);
        }
    }

    // --- File Monitoring Methods ---

    async startFileMonitoring() {
        if (this.isWatching) {
            info('File monitoring is already running.');
            return true;
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

            this.setupFileMonitoringEventHandlers();
            if (this.system.eventBus) {
                this.setupSystemEventHandlers();
            }

            this.isWatching = true;
            info('File monitoring started successfully.');
            return true;
        } catch (error) {
            this.errorHandler.handleWithDefault(error, 'startFileMonitoring', false);
            warn('Failed to start file monitoring:', error.message);
            return false;
        }
    }

    setupFileMonitoringEventHandlers() {
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
        return await this.errorHandler.runAsync(async () => {
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
        }, 'processFile', { rethrow: true });
    }

    async stopFileMonitoring() {
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

export default AgentManager;