import {debug, info, warn} from '../utils/logger.js';

/**
 * AgentMessageBus handles communication between agents in the multi-agent system
 */
class AgentMessageBus {
  constructor(multiAgentSystem, eventBus) {
    this.multiAgentSystem = multiAgentSystem;
    this.eventBus = eventBus;
    this.isRunning = false;
    this.messageHistory = [];
    this.subscribers = new Map(); // Maps agent IDs to their message handlers
    this.messageQueue = []; // Queue for messages when system is not running
    
    // Register system-level message handlers
    this._registerSystemHandlers();
    
    info('AgentMessageBus initialized');
  }

  /**
   * Register system-level message handlers
   */
  _registerSystemHandlers() {
    // Listen for system events that might trigger message routing
    this.eventBus.on('system_message', (message) => {
      this._handleSystemMessage(message);
    });
    
    this.eventBus.on('task_distributed', (data) => {
      this._handleTaskDistribution(data);
    });
  }

  /**
   * Start the message bus
   */
  start() {
    if (this.isRunning) {
      warn('AgentMessageBus is already running');
      return;
    }
    
    this.isRunning = true;
    info('AgentMessageBus started');
    
    // Process any queued messages
    this._processQueuedMessages();
  }

  /**
   * Stop the message bus
   */
  stop() {
    if (!this.isRunning) {
      warn('AgentMessageBus is not running');
      return;
    }
    
    this.isRunning = false;
    info('AgentMessageBus stopped');
  }

  /**
   * Subscribe an agent to receive messages
   * @param {string} agentId - ID of the agent
   * @param {Function} handler - Message handler function
   */
  subscribe(agentId, handler) {
    if (typeof handler !== 'function') {
      throw new Error('Message handler must be a function');
    }
    
    if (!this.subscribers.has(agentId)) {
      this.subscribers.set(agentId, []);
    }
    
    this.subscribers.get(agentId).push(handler);
    info(`Agent ${agentId} subscribed to message bus`);
  }

  /**
   * Unsubscribe an agent from receiving messages
   * @param {string} agentId - ID of the agent
   * @param {Function} handler - Message handler function (optional, if not provided, all handlers for agent are removed)
   */
  unsubscribe(agentId, handler = null) {
    if (!this.subscribers.has(agentId)) {
      return;
    }

    if (handler) {
      const handlers = this.subscribers.get(agentId);
      const index = handlers.indexOf(handler);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    } else {
      this.subscribers.delete(agentId);
    }
    
    info(`Agent ${agentId} unsubscribed from message bus`);
  }

  /**
   * Send a message to one or more agents
   * @param {Object} message - The message to send
   * @param {Array|string} toAgents - Agent ID(s) to send to ('all' for all agents)
   * @returns {Array} - Array of delivery results
   */
  async send(message, toAgents) {
    const timestamp = new Date().toISOString();
    const messageId = `${Date.now()}-${Math.random()}`;
    
    // Create the message object
    const messageObj = {
      id: messageId,
      timestamp,
      from: message.from,
      to: Array.isArray(toAgents) ? toAgents : [toAgents],
      type: message.type || 'general',
      content: message.content,
      metadata: message.metadata || {}
    };

    // Add to history
    this.messageHistory.push(messageObj);

    // If not running, queue the message
    if (!this.isRunning) {
      this.messageQueue.push(messageObj);
      warn(`Message bus not running, queued message: ${messageId}`);
      return [{ success: false, message: 'Message queued', messageId }];
    }

    // Deliver to specified agents
    const deliveryResults = [];
    
    for (const agentId of messageObj.to) {
      if (agentId === 'all') {
        // Send to all agents
        for (const [id] of this.multiAgentSystem.agents) {
          const result = await this._deliverToAgent(id, messageObj);
          deliveryResults.push(result);
        }
        break; // Don't process individual agents if 'all' is specified
      } else {
        const result = await this._deliverToAgent(agentId, messageObj);
        deliveryResults.push(result);
      }
    }

    return deliveryResults;
  }

  /**
   * Deliver a message to a specific agent
   * @param {string} agentId - ID of the target agent
   * @param {Object} message - Message to deliver
   * @returns {Object} - Delivery result
   */
  async _deliverToAgent(agentId, message) {
    if (!this.multiAgentSystem.agents.has(agentId)) {
      return {
        success: false,
        agentId,
        message: `Agent ${agentId} not found`,
        messageId: message.id
      };
    }

    const handlers = this.subscribers.get(agentId) || [];
    
    if (handlers.length === 0) {
      // If no specific handlers, deliver to system event bus
      this.eventBus.emit(`agent_message_${agentId}`, message);
      return {
        success: true,
        agentId,
        message: 'Message delivered via event bus',
        messageId: message.id
      };
    }

    // Deliver to all registered handlers for this agent
    try {
      for (const handler of handlers) {
        await handler(message);
      }
      
      return {
        success: true,
        agentId,
        message: 'Message delivered to handlers',
        messageId: message.id
      };
    } catch (error) {
      return {
        success: false,
        agentId,
        message: error.message,
        messageId: message.id
      };
    }
  }

  /**
   * Broadcast a message to all agents in the system
   * @param {Object} message - Message to broadcast
   * @returns {Array} - Array of delivery results
   */
  async broadcast(message) {
    return await this.send(message, 'all');
  }

  /**
   * Send a task to an agent for processing
   * @param {Object} task - The task to send
   * @param {string} agentId - ID of the target agent
   * @returns {Object} - Delivery result
   */
  async sendTaskToAgent(task, agentId) {
    const message = {
      type: 'task_assignment',
      content: task,
      from: 'coordinator',
      metadata: {
        taskType: task.punctuation,
        priority: task.state?.priority || 0
      }
    };

    return await this.send(message, [agentId]);
  }

  /**
   * Send a task delegation request
   * @param {Object} task - The task to delegate
   * @param {string} fromAgent - ID of the delegating agent
   * @param {string} toAgent - ID of the target agent
   * @returns {Object} - Result of delegation
   */
  async delegateTask(task, fromAgent, toAgent) {
    const message = {
      type: 'task_delegation',
      content: {
        originalTask: task,
        delegator: fromAgent
      },
      from: fromAgent,
      metadata: {
        delegationTime: new Date().toISOString()
      }
    };

    const result = await this.send(message, [toAgent]);
    
    // Log the delegation in the event system
    this.eventBus.emit('task_delegated', {
      taskId: task.id,
      from: fromAgent,
      to: toAgent,
      timestamp: new Date().toISOString()
    });
    
    return result;
  }

  /**
   * Handle system messages
   * @param {Object} message - The system message
   */
  _handleSystemMessage(message) {
    debug(`Handling system message: ${message.type}`, message.content);
    // In a real implementation, this would route system messages appropriately
  }

  /**
   * Handle task distribution events
   * @param {Object} data - Task distribution data
   */
  _handleTaskDistribution(data) {
    debug(`Handling task distribution for ${data.taskCount} tasks`);
    // In a real implementation, this would handle task distribution logic
  }

  /**
   * Process queued messages when system starts
   */
  _processQueuedMessages() {
    if (this.messageQueue.length === 0) {
      return;
    }

    const queuedMessages = [...this.messageQueue];
    this.messageQueue = [];

    for (const message of queuedMessages) {
      // Re-send each queued message
      this.send(
        { 
          type: message.type, 
          content: message.content, 
          from: message.from,
          metadata: message.metadata
        },
        message.to
      ).catch(err => {
        warn(`Failed to deliver queued message ${message.id}: ${err.message}`);
      });
    }

    info(`Processed ${queuedMessages.length} queued messages`);
  }

  /**
   * Get message history
   * @param {string} agentId - Optional agent ID to filter by
   * @returns {Array} - Array of messages
   */
  getHistory(agentId = null) {
    if (!agentId) {
      return [...this.messageHistory];
    }

    return this.messageHistory.filter(msg => 
      msg.from === agentId || msg.to.includes(agentId)
    );
  }

  /**
   * Clear message history
   */
  clearHistory() {
    this.messageHistory = [];
    debug('Message history cleared');
  }

  /**
   * Get statistics about message bus usage
   * @returns {Object} - Statistics
   */
  getStatistics() {
    return {
      totalMessages: this.messageHistory.length,
      queuedMessages: this.messageQueue.length,
      subscribers: this.subscribers.size,
      running: this.isRunning
    };
  }
}

export default AgentMessageBus;