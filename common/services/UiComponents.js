/**
 * Shared UI components for both Web UI and TUI
 * Provides common UI elements that can be rendered in both interfaces
 */
class UiComponents {
    /**
     * Create a task list component
     * @param {Array} tasks - Array of tasks to display
     * @param {Object} options - Rendering options
     * @returns {string|ReactComponent} - Rendered component
     */
    static createTaskList(tasks = [], options = {}) {
        const { maxItems = 10, showDetails = true } = options;
        const tasksToDisplay = tasks.slice(0, maxItems);
        
        // Return different representations based on context
        const taskItems = tasksToDisplay.map((task, index) => {
            const content = task.toDisplayString?.() || task.toString?.() || task.content || 'No content';
            const type = task.punctuation === '.' ? 'BELIEF' : 
                        task.punctuation === '!' ? 'GOAL' : 
                        task.punctuation === '?' ? 'QUESTION' : 'UNKNOWN';
            
            return {
                index: index + 1,
                content,
                type,
                priority: task.state?.priority ? Math.round(task.state.priority * 100) : 0,
                confidence: task.state?.truthValue?.confidence ? (task.state.truthValue.confidence * 100).toFixed(1) : 0
            };
        });
        
        return {
            type: 'taskList',
            items: taskItems,
            total: tasks.length,
            maxItems,
            showDetails
        };
    }

    /**
     * Create a memory status component
     * @param {Object} memoryState - Memory state object
     * @returns {Object} - Memory status component data
     */
    static createMemoryStatus(memoryState = {}) {
        const { beliefs = [], goals = [], questions = [], tasks = [] } = memoryState;
        
        return {
            type: 'memoryStatus',
            beliefsCount: beliefs.length,
            goalsCount: goals.length,
            questionsCount: questions.length,
            tasksCount: tasks.length,
            totalItems: beliefs.length + goals.length + questions.length + tasks.length
        };
    }

    /**
     * Create a system status component
     * @param {Object} systemState - System state object
     * @returns {Object} - System status component data
     */
    static createSystemStatus(systemState = {}) {
        return {
            type: 'systemStatus',
            isRunning: systemState.isRunning || false,
            cycleCount: systemState.cycleCount || 0,
            uptime: systemState.systemInfo?.uptime || null,
            version: systemState.systemInfo?.version || 'unknown',
            timestamp: systemState.timestamp || new Date().toISOString()
        };
    }

    /**
     * Create a common input handler component
     * @param {string} prompt - Input prompt text
     * @param {Function} handler - Input handler function
     * @returns {Object} - Input handler component data
     */
    static createInputHandler(prompt, handler) {
        return {
            type: 'inputHandler',
            prompt,
            handler,
            id: `input_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        };
    }

    /**
     * Create a common message display component
     * @param {string} message - Message to display
     * @param {string} type - Message type ('info', 'success', 'warning', 'error')
     * @returns {Object} - Message component data
     */
    static createMessage(message, type = 'info') {
        return {
            type: 'message',
            message,
            messageType: type,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Create a common navigation component
     * @param {Array} items - Navigation items
     * @returns {Object} - Navigation component data
     */
    static createNavigation(items = []) {
        return {
            type: 'navigation',
            items: items.map((item, index) => ({
                id: item.id || `nav_${index}`,
                label: item.label || item.text || item.title,
                action: item.action || item.handler || null,
                shortcut: item.shortcut || null,
                description: item.description || ''
            }))
        };
    }

    /**
     * Format data for TUI display
     * @param {Object} component - Component data
     * @returns {string} - Formatted string for TUI
     */
    static formatForTui(component) {
        switch (component.type) {
            case 'taskList':
                let result = `Tasks: (${component.total})\n`;
                component.items.forEach(item => {
                    result += `  ${item.index}. [${item.type}] ${item.content}\n`;
                });
                if (component.total > component.maxItems) {
                    result += `  ... and ${component.total - component.maxItems} more tasks\n`;
                }
                return result;

            case 'memoryStatus':
                return `Memory: Beliefs: ${component.beliefsCount}, Goals: ${component.goalsCount}, Questions: ${component.questionsCount}, Tasks: ${component.tasksCount}\n`;

            case 'systemStatus':
                return `System Status: ${component.isRunning ? 'RUNNING' : 'STOPPED'}, Cycles: ${component.cycleCount}\n`;

            case 'message':
                const prefix = component.messageType === 'error' ? '✗' : 
                              component.messageType === 'success' ? '✓' : 
                              component.messageType === 'warning' ? '⚠' : 'ℹ';
                return `${prefix} ${component.message}\n`;

            default:
                return component.toString?.() || JSON.stringify(component, null, 2);
        }
    }

    /**
     * Format data for Web UI display (React components)
     * @param {Object} component - Component data
     * @returns {ReactComponent} - React component
     */
    static formatForWeb(component) {
        // This would return React components but we'll return the data structure
        // that can be used by the React components
        return component;
    }
}

export default UiComponents;