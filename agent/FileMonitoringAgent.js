import fs from 'fs';
import path from 'path';
import chokidar from 'chokidar';
import PlanProcessor from '../core/utils/PlanProcessor.js';
import { debug, info, warn } from '../core/utils/logger.js';
import { createUnifiedErrorHandler } from '../core/utils/errorHandler.js';

/**
 * Generic file monitoring agent that watches files and processes them when changed.
 * Can be used for any type of input files and integrates with the cognitive system.
 */
class FileMonitoringAgent {
  constructor(system, options = {}) {
    this.system = system;
    this.options = {
      patterns: options.patterns || ['**/*.md'],
      watchDir: options.watchDir || process.cwd(),
      debounce: options.debounce || 1000, // Debounce time in ms
      persistent: options.persistent !== false, // Whether to keep process running
      followSymlinks: options.followSymlinks || false,
      ignoreInitial: options.ignoreInitial !== false, // Ignore initial add events
      ...options
    };
    
    this.errorHandler = createUnifiedErrorHandler('FileMonitoringAgent');
    this.planProcessor = new PlanProcessor(system, options);
    this.watcher = null;
    this.isWatching = false;
    this.processedFiles = new Set();
    this.debounceTimers = new Map();
    
    // Initialize the processor
    this.planProcessor.initialize();
  }

  /**
   * Start monitoring files
   */
  async start() {
    if (this.isWatching) {
      info('FileMonitoringAgent is already running');
      return;
    }

    try {
      info(`Starting FileMonitoringAgent with patterns: ${this.options.patterns.join(', ')}`);
      
      // Process existing files on startup
      await this.processExistingFiles();
      
      // Set up file watcher
      this.watcher = chokidar.watch(this.options.patterns, {
        persistent: this.options.persistent,
        ignoreInitial: this.options.ignoreInitial,
        followSymlinks: this.options.followSymlinks,
        cwd: this.options.watchDir,
        ignorePermissionErrors: true,
        usePolling: this.options.usePolling || false,
        interval: this.options.interval || 100,
        binaryInterval: this.options.binaryInterval || 300,
        alwaysStat: false,
        depth: this.options.depth || 99,
        awaitWriteFinish: {
          stabilityThreshold: 2000,
          pollInterval: 100
        },
      });

      // Set up event handlers
      this.setupEventHandlers();
      
      this.isWatching = true;
      info('FileMonitoringAgent started successfully');
      
      return true;
    } catch (error) {
      warn('Failed to start FileMonitoringAgent:', error.message);
      return false;
    }
  }

  /**
   * Set up event handlers for file system events
   */
  setupEventHandlers() {
    this.watcher
      .on('add', (filePath) => {
        debug(`File added: ${filePath}`);
        this.handleFileChange(filePath);
      })
      .on('change', (filePath) => {
        debug(`File changed: ${filePath}`);
        this.handleFileChange(filePath);
      })
      .on('unlink', (filePath) => {
        debug(`File removed: ${filePath}`);
        this.handleFileRemoval(filePath);
      })
      .on('error', (error) => {
        warn('FileMonitoringAgent error:', error);
      })
      .on('ready', () => {
        info('FileMonitoringAgent is ready and watching for changes');
      });
  }

  /**
   * Process all existing files that match patterns
   */
  async processExistingFiles() {
    // For each pattern, expand and process
    for (const pattern of this.options.patterns) {
      const glob = await import('glob');
      const files = glob.glob.sync(pattern, {
        cwd: this.options.watchDir,
        absolute: true
      });
      
      for (const file of files) {
        await this.processFile(file, { initial: true });
      }
    }
  }

  /**
   * Handle file change with debouncing
   */
  handleFileChange(filePath) {
    // Clear any existing debounce timer for this file
    if (this.debounceTimers.has(filePath)) {
      clearTimeout(this.debounceTimers.get(filePath));
    }

    // Set a new timer
    const timer = setTimeout(() => {
      this.processFile(filePath).catch(error => {
        warn(`Error processing file ${filePath}:`, error.message);
      });
      this.debounceTimers.delete(filePath);
    }, this.options.debounce);

    this.debounceTimers.set(filePath, timer);
  }

  /**
   * Handle file removal
   */
  handleFileRemoval(filePath) {
    // Remove from processed files set
    this.processedFiles.delete(filePath);
    
    // If system supports it, remove related tasks from memory
    if (this.system?.memory) {
      // This is a placeholder - actual implementation would depend on how tasks are tracked by source
      // For now, just log the removal
      debug(`Removed file ${filePath} from monitoring`);
    }
  }

  /**
   * Process a single file and convert results to cognitive tasks
   */
  async processFile(filePath, options = {}) {
    try {
      // Process the file to extract goals
      const goals = await this.planProcessor.processFile(filePath, options);
      
      if (goals.length === 0) {
        debug(`No goals found in ${filePath}`);
        return [];
      }

      // Convert goals to cognitive tasks
      const tasks = this.planProcessor.convertGoalsToTasks(goals);
      
      // Add tasks to system if available
      if (this.system && tasks.length > 0) {
        await this.system.addTasks(tasks);
        
        // Emit event for other components to listen to
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

      // Mark as processed
      this.processedFiles.add(filePath);
      
      return tasks;
    } catch (error) {
      warn(`Error processing file ${filePath}:`, error.message);
      throw error;
    }
  }

  /**
   * Add additional file patterns to monitor
   */
  async addPatterns(patterns) {
    if (!Array.isArray(patterns)) {
      patterns = [patterns];
    }
    
    for (const pattern of patterns) {
      this.options.patterns.push(pattern);
    }
    
    if (this.watcher) {
      await this.watcher.add(patterns);
      await this.processExistingFiles();
    }
  }

  /**
   * Remove file patterns from monitoring
   */
  removePatterns(patterns) {
    if (!Array.isArray(patterns)) {
      patterns = [patterns];
    }
    
    for (const pattern of patterns) {
      const index = this.options.patterns.indexOf(pattern);
      if (index > -1) {
        this.options.patterns.splice(index, 1);
      }
    }
    
    if (this.watcher) {
      this.watcher.unwatch(patterns);
    }
  }

  /**
   * Stop monitoring
   */
  async stop() {
    if (!this.isWatching) {
      return;
    }

    // Clear debounce timers
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();

    // Close the watcher
    if (this.watcher) {
      await this.watcher.close();
    }

    this.isWatching = false;
    info('FileMonitoringAgent stopped');
  }

  /**
   * Get monitoring statistics
   */
  getStatistics() {
    return {
      isWatching: this.isWatching,
      patterns: this.options.patterns,
      processedFilesCount: this.processedFiles.size,
      processorStats: this.planProcessor.getStatistics(),
      watchedDirs: this.watcher ? Array.from(this.watcher.getWatched()) : []
    };
  }

  /**
   * Process specific files without waiting for file system events
   */
  async processFilesNow(filePaths) {
    const allTasks = [];
    
    if (typeof filePaths === 'string') {
      filePaths = [filePaths];
    }
    
    for (const filePath of filePaths) {
      const tasks = await this.processFile(filePath, { initial: true });
      allTasks.push(...tasks);
    }
    
    return allTasks;
  }

  /**
   * Get all currently processed files
   */
  getProcessedFiles() {
    return Array.from(this.processedFiles);
  }
}

export default FileMonitoringAgent;