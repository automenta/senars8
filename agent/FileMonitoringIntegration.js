import FileMonitoringAgent from './FileMonitoringAgent.js';
import FileMonitoringConfig from './FileMonitoringConfig.js';
import { info, debug, warn } from '../core/utils/logger.js';

/**
 * Integration module to connect File Monitoring Agent with the main Agent system
 */
class FileMonitoringIntegration {
  constructor(agent, options = {}) {
    this.agent = agent;
    this.options = options;
    this.fileMonitoringAgent = null;
    this.config = null;
  }

  /**
   * Initialize the file monitoring integration
   */
  async initialize() {
    try {
      // Create configuration
      this.config = new FileMonitoringConfig({
        ...this.options,
        watchDir: this.options.watchDir || process.cwd()
      });

      // Create file monitoring agent
      this.fileMonitoringAgent = new FileMonitoringAgent(
        this.agent.system, // Pass the main system instance
        this.config.getConfig()
      );

      info('File Monitoring Integration initialized');
      return true;
    } catch (error) {
      warn('Failed to initialize File Monitoring Integration:', error.message);
      return false;
    }
  }

  /**
   * Start the file monitoring agent with the main agent system
   */
  async start() {
    if (!this.fileMonitoringAgent) {
      await this.initialize();
    }

    if (this.agent.system?.eventBus) {
      // Set up event handlers to connect with the main system
      this.setupSystemEventHandlers();
    }

    // Start the file monitoring agent
    const success = await this.fileMonitoringAgent.start();
    
    if (success) {
      info('File Monitoring Agent started successfully');
    }
    
    return success;
  }

  /**
   * Set up event handlers to connect file monitoring with the main system
   */
  setupSystemEventHandlers() {
    // Listen for file processing events from the file monitoring agent
    this.agent.system.eventBus.on('file-processed', (data) => {
      debug(`File processed: ${data.filePath}, Goals: ${data.goalsCount}, Tasks: ${data.tasksCount}`);
      
      // Additional processing can be done here
      if (this.config.getConfig().onFileChanged) {
        this.config.getConfig().onFileChanged(data);
      }
    });

    // Listen for goal extraction events
    this.agent.system.eventBus.on('goal-extracted', (goal) => {
      debug(`Goal extracted: ${goal.content}`);
      
      // Process the extracted goal in the main system context
      this.processExtractedGoal(goal);
    });
  }

  /**
   * Process an extracted goal in the context of the main system
   */
  processExtractedGoal(goal) {
    // Add any domain-specific processing here
    if (this.agent.system?.eventBus) {
      this.agent.system.eventBus.emit('agent-goal-updated', {
        source: 'file-monitoring',
        goal: goal,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Stop the file monitoring agent
   */
  async stop() {
    if (this.fileMonitoringAgent) {
      await this.fileMonitoringAgent.stop();
      info('File Monitoring Agent stopped');
    }
  }

  /**
   * Add additional file patterns to monitor
   */
  async addPatterns(patterns) {
    if (!this.fileMonitoringAgent) {
      await this.initialize();
    }
    return this.fileMonitoringAgent.addPatterns(patterns);
  }

  /**
   * Remove file patterns from monitoring
   */
  removePatterns(patterns) {
    if (this.fileMonitoringAgent) {
      this.fileMonitoringAgent.removePatterns(patterns);
    }
  }

  /**
   * Process specific files immediately
   */
  async processFilesNow(filePaths) {
    if (!this.fileMonitoringAgent) {
      await this.initialize();
    }
    return this.fileMonitoringAgent.processFilesNow(filePaths);
  }

  /**
   * Get integration statistics
   */
  getStatistics() {
    if (!this.fileMonitoringAgent) {
      return { initialized: false };
    }
    
    return {
      initialized: true,
      agentStats: this.fileMonitoringAgent.getStatistics(),
      config: this.config.getConfig()
    };
  }

  /**
   * Update configuration dynamically
   */
  updateConfig(newConfig) {
    if (this.config) {
      this.config.updateConfig(newConfig);
      
      // If file monitoring agent exists, update its options too
      if (this.fileMonitoringAgent) {
        Object.assign(this.fileMonitoringAgent.options, newConfig);
      }
    }
  }

  /**
   * Get the underlying file monitoring agent
   */
  getFileMonitoringAgent() {
    return this.fileMonitoringAgent;
  }

  /**
   * Get the configuration
   */
  getConfig() {
    return this.config;
  }
}

export default FileMonitoringIntegration;