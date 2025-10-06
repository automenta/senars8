import Bag from './bag.js';

/**
 * Bag-based buffer manager for capacity-limited prioritized collections
 * Used for message queues, tool execution queues, and other capacity-limited collections
 */
class BagBufferManager {
    constructor(config = {}) {
        this.config = {
            maxMessageQueueSize: config.maxMessageQueueSize || 100,
            maxToolQueueSize: config.maxToolQueueSize || 50,
            maxAdjacencyCollectionSize: config.maxAdjacencyCollectionSize || 200,
            ...config
        };

        // Initialize Bag-based buffers
        this._messageQueue = new Bag(this.config.maxMessageQueueSize);
        this._toolExecutionQueue = new Bag(this.config.maxToolQueueSize);
        this._adjacencyCollection = new Bag(this.config.maxAdjacencyCollectionSize);
        this._priorityBuffer = new Bag(this.config.maxMessageQueueSize);

        // Statistics tracking
        this._stats = {
            messagesProcessed: 0,
            toolsExecuted: 0,
            adjacencyOperations: 0,
            bufferOverflows: 0
        };
    }

    // Message Queue Management

    /**
     * Add message to priority-based message queue
     * @param {Object} message - Message object
     * @param {number} priority - Message priority (higher = more important)
     * @param {string} type - Message type for categorization
     */
    addMessage(message, priority = 0.5, type = 'general') {
        if (!message) return false;

        const enrichedMessage = {
            ...message,
            priority,
            type,
            timestamp: Date.now(),
            id: message.id || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        };

        // Check if buffer is full
        if (this._messageQueue.size() >= this.config.maxMessageQueueSize) {
            // Remove lowest priority message to make room
            const lowestPriorityMessage = this._findLowestPriorityMessage();
            if (lowestPriorityMessage && lowestPriorityMessage.priority < priority) {
                this._messageQueue.removeByPredicate(item => item.id === lowestPriorityMessage.id);
                this._stats.bufferOverflows++;
            } else {
                return false; // Cannot add message, priority too low
            }
        }

        this._messageQueue.put(enrichedMessage, priority);
        return true;
    }

    /**
     * Get next message from queue using priority sampling
     * @returns {Object|null} - Next message or null if queue empty
     */
    getNextMessage() {
        if (this._messageQueue.isEmpty()) return null;

        const message = this._messageQueue.sample();
        this._stats.messagesProcessed++;
        return message;
    }

    /**
     * Get multiple messages with priority-based sampling
     * @param {number} count - Number of messages to retrieve
     * @returns {Array} - Array of messages
     */
    getMessages(count = 1) {
        if (count <= 0 || this._messageQueue.isEmpty()) return [];

        const messages = this._messageQueue.sampleMultipleUnique(count);
        this._stats.messagesProcessed += messages.length;
        return messages;
    }

    /**
     * Get messages by type with priority sampling
     * @param {string} type - Message type to filter by
     * @param {number} count - Number of messages to retrieve
     * @returns {Array} - Array of messages of specified type
     */
    getMessagesByType(type, count = 1) {
        const typeMessages = this._messageQueue.filterToNewBag((item) => item.type === type);
        return typeMessages.sampleMultipleUnique(count);
    }

    // Tool Execution Queue Management

    /**
     * Add tool execution request to priority queue
     * @param {Object} toolRequest - Tool execution request
     * @param {number} priority - Execution priority
     * @param {string} toolType - Type of tool
     */
    addToolRequest(toolRequest, priority = 0.5, toolType = 'general') {
        if (!toolRequest) return false;

        const enrichedRequest = {
            ...toolRequest,
            priority,
            toolType,
            timestamp: Date.now(),
            id: toolRequest.id || `tool_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        };

        if (this._toolExecutionQueue.size() >= this.config.maxToolQueueSize) {
            const lowestPriorityRequest = this._findLowestPriorityToolRequest();
            if (lowestPriorityRequest && lowestPriorityRequest.priority < priority) {
                this._toolExecutionQueue.removeByPredicate(item => item.id === lowestPriorityRequest.id);
            } else {
                return false;
            }
        }

        this._toolExecutionQueue.put(enrichedRequest, priority);
        return true;
    }

    /**
     * Get next tool execution request
     * @returns {Object|null} - Next tool request or null if queue empty
     */
    getNextToolRequest() {
        if (this._toolExecutionQueue.isEmpty()) return null;

        const request = this._toolExecutionQueue.sample();
        this._stats.toolsExecuted++;
        return request;
    }

    // Adjacency Collection Management (for graph-based reasoning)

    /**
     * Add adjacency relationship with priority
     * @param {Object} adjacency - Adjacency relationship data
     * @param {number} priority - Relationship priority/strength
     * @param {string} relationshipType - Type of relationship
     */
    addAdjacency(adjacency, priority = 0.5, relationshipType = 'general') {
        if (!adjacency) return false;

        const enrichedAdjacency = {
            ...adjacency,
            priority,
            relationshipType,
            timestamp: Date.now(),
            id: adjacency.id || `adj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        };

        if (this._adjacencyCollection.size() >= this.config.maxAdjacencyCollectionSize) {
            const lowestPriorityAdjacency = this._findLowestPriorityAdjacency();
            if (lowestPriorityAdjacency && lowestPriorityAdjacency.priority < priority) {
                this._adjacencyCollection.removeByPredicate(item => item.id === lowestPriorityAdjacency.id);
            } else {
                return false;
            }
        }

        this._adjacencyCollection.put(enrichedAdjacency, priority);
        this._stats.adjacencyOperations++;
        return true;
    }

    /**
     * Get adjacency relationships using priority sampling
     * @param {number} count - Number of relationships to retrieve
     * @returns {Array} - Array of adjacency relationships
     */
    getAdjacencies(count = 1) {
        if (count <= 0 || this._adjacencyCollection.isEmpty()) return [];
        return this._adjacencyCollection.sampleMultipleUnique(count);
    }

    // Utility Methods

    _findLowestPriorityMessage() {
        return this._messageQueue.toArrayWithPriorities()
            .sort((a, b) => a.priority - b.priority)[0];
    }

    _findLowestPriorityToolRequest() {
        return this._toolExecutionQueue.toArrayWithPriorities()
            .sort((a, b) => a.priority - b.priority)[0];
    }

    _findLowestPriorityAdjacency() {
        return this._adjacencyCollection.toArrayWithPriorities()
            .sort((a, b) => a.priority - b.priority)[0];
    }

    /**
     * Get buffer statistics
     * @returns {Object} - Buffer statistics
     */
    getStats() {
        return {
            ...this._stats,
            messageQueueSize: this._messageQueue.size(),
            toolQueueSize: this._toolExecutionQueue.size(),
            adjacencyCollectionSize: this._adjacencyCollection.size(),
            priorityBufferSize: this._priorityBuffer.size()
        };
    }

    /**
     * Clear all buffers
     */
    clearAll() {
        this._messageQueue.clear();
        this._toolExecutionQueue.clear();
        this._adjacencyCollection.clear();
        this._priorityBuffer.clear();

        // Reset stats
        this._stats = {
            messagesProcessed: 0,
            toolsExecuted: 0,
            adjacencyOperations: 0,
            bufferOverflows: 0
        };
    }

    /**
     * Resize buffers
     * @param {Object} newSizes - New size configuration
     */
    resizeBuffers(newSizes) {
        Object.assign(this.config, newSizes);

        // Recreate bags with new sizes
        this._messageQueue = new Bag(this.config.maxMessageQueueSize);
        this._toolExecutionQueue = new Bag(this.config.maxToolQueueSize);
        this._adjacencyCollection = new Bag(this.config.maxAdjacencyCollectionSize);
        this._priorityBuffer = new Bag(this.config.maxMessageQueueSize);
    }
}

export default BagBufferManager;