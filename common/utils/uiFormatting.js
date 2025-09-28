/**
 * Shared UI formatting utilities for both Web UI and TUI
 * Contains functions that format data consistently across both interfaces
 */

import {getTaskDisplayData} from './formatUtils.js';

/**
 * Formats core data from the agent for UI display
 * @param {object|Array} data - The data to format
 * @returns {object|Array} - Formatted data suitable for UI
 */
export const formatCoreDataForUI = (data) => {
    if (!data) return null;
    if (Array.isArray(data)) {
        return data.map(item => formatCoreDataForUI(item));
    }
    if (typeof data === 'object') {
        if (data.term || data.punctuation) { // Check for Task-like objects
            return {
                id: data.id || data.termKey,
                term: data.term?.toString() || data.termKey,
                punctuation: data.punctuation,
                priority: data.priority,
                creationTime: data.creationTime,
                truthValue: data.state?.truthValue || data.truthValue,
                occurrenceTime: data.occurrenceTime,
                type: 'task'
            };
        }
        if (data.key) { // Check for Term-like objects
            return {
                key: data.key,
                type: data.type,
                terms: Array.isArray(data.terms) ? data.terms.map(formatCoreDataForUI) : data.terms,
                toString: data.toString?.() || data.key,
                type: 'term'
            };
        }
    }
    return data;
};

/**
 * Formats a date for display in the UI
 * @param {string|Date|number} dateString - The date to format
 * @returns {string} - Formatted date string
 */
export const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    
    return date.toLocaleString();
};

/**
 * Formats time duration in seconds to human readable format
 * @param {number} seconds - Time in seconds
 * @returns {string} - Formatted time string
 */
export const formatDuration = (seconds) => {
    if (seconds < 0) return '0s';
    if (seconds < 60) return `${Math.floor(seconds)}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.floor(seconds % 60)}s`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
    
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    return `${days}d ${hours}h`;
};

/**
 * Formats a duration in seconds to a human-readable format (hours, minutes, seconds)
 * @param {number} seconds - Time in seconds
 * @returns {string} - Formatted time string
 */
export const formatUptime = (seconds) => {
    if (!seconds) return '0s';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
        return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
        return `${minutes}m ${secs}s`;
    } else {
        return `${secs}s`;
    }
};

/**
 * Formats bytes to human-readable format (KB, MB, GB, etc.)
 * @param {number} bytes - Number of bytes
 * @returns {string} - Formatted size string
 */
export const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Formats a timestamp for relative display (e.g., "2 minutes ago")
 * @param {Date|number} timestamp - The timestamp to format
 * @returns {string} - Formatted relative time string
 */
export const formatRelativeTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 60) return 'just now';
    if (seconds < 3600) {
        const minutes = Math.floor(seconds / 60);
        return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    }
    if (seconds < 86400) {
        const hours = Math.floor(seconds / 3600);
        return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    }
    
    return formatDate(timestamp);
};

/**
 * Formats system stats for display
 * @param {object} stats - The system stats
 * @returns {string} - Formatted system stats string
 */
export const formatSystemStats = (stats) => {
    if (!stats) return 'System stats not available';

    return `System Statistics:
    
Agent Status:
  Cycles: ${stats.cycleCount || 0}
  Running: ${stats.isRunning ? 'Yes' : 'No'}

Memory Usage:
  Total Usage: ${stats.memoryUsage || 0}
  Beliefs: ${stats.beliefs || 0}
  Goals: ${stats.goals || 0}
  Questions: ${stats.questions || 0}
  Tasks: ${stats.tasks || 0}

System Info:
  CPU Usage: ${stats.cpuUsage || 0}%
  Memory: ${stats.memoryUsage || 0}
  Temperature: ${stats.temperature || 0}`;
};

/**
 * Formats tasks for display
 * @param {Array} tasks - The tasks to format
 * @param {string} title - The title for the task list
 * @param {number} maxItems - Maximum number of items to display
 * @returns {string} - Formatted task list string
 */
export const formatTasks = (tasks, title = 'Tasks', maxItems = 50) => {
    if (!tasks || tasks.length === 0) {
        return `${title}: No items found`;
    }

    return `${title} (${tasks.length}):
` + tasks.slice(0, maxItems).map((task, index) => {
        const {termKey, priority, punctuation, truthValue} = getTaskDisplayData(task);
        return `  [${index}] ${termKey}${punctuation} | P: ${priority} ${truthValue}`;
    }).join('\n');
};

/**
 * Creates dashboard content for display
 * @param {object} appState - The application state
 * @returns {string} - Dashboard content string
 */
export const createDashboardContent = (appState) => {
    if (!appState) return 'Application state not available';
    
    const stats = appState.stats || {};
    const beliefsCount = appState.beliefs?.length || 0;
    const goalsCount = appState.goals?.length || 0;
    const questionsCount = appState.questions?.length || 0;
    const tasksCount = appState.tasks?.length || 0;
    const notificationCount = appState.notifications?.length || 0;

    return `SeNARS Real-Time Dashboard

System Status
  Agent Running: ${stats.isRunning ? 'YES' : 'NO'}
  Cycles: ${stats.cycleCount || 0}
  Last Update: ${new Date().toLocaleTimeString()}

Memory Status
  Total Tasks: ${tasksCount}
  Beliefs: ${beliefsCount}
  Goals: ${goalsCount}
  Questions: ${questionsCount}

Activity
  Status Updates: ${appState.statusUpdates || 0}
  New Beliefs: ${appState.newBeliefs || 0}
  New Goals: ${appState.newGoals || 0}
  Reasoning Steps: ${appState.reasoningSteps || 0}

Notifications
  Count: ${notificationCount}

Performance
  CPU Usage: ${stats.cpuUsage || 0}%
  Memory: ${stats.memoryUsage || 0}
  Temperature: ${stats.temperature || 0}°

Quick Commands
  Press 'S' for stats | 'C' for config | 'R' for reset
  Type !view [type] | Type !filter [type] | Type !search <query>`;
};

/**
 * Formats notifications for display
 * @param {Array} notifications - The notifications to format
 * @param {string} title - The title for the notification list
 * @returns {string} - Formatted notification list string
 */
export const formatNotifications = (notifications, title = 'Notifications') => {
    if (!notifications || notifications.length === 0) {
        return `${title}: No notifications`;
    }

    return `${title} (${notifications.length}):
` + notifications.slice(-20).reverse().map((notif) => {
        const time = new Date(notif.timestamp).toLocaleTimeString();
        const typeSymbol = notif.type === 'error' ? '✗' :
            notif.type === 'warning' ? '⚠' :
                notif.type === 'success' ? '✓' : 'ℹ';
        return `  [${typeSymbol}] ${time} - ${notif.message}`;
    }).join('\n');
};

/**
 * Formats a reasoning step for display
 * @param {object} step - The reasoning step
 * @returns {string} - Formatted reasoning step string
 */
export const formatReasoningStep = (step) => {
    if (!step) return 'No reasoning step data';

    let output = 'Reasoning Step\n';
    if (step.description) output += `Description: ${step.description}\n`;
    if (step.type) output += `Type: ${step.type}\n`;
    if (step.input) output += `Input: ${typeof step.input === 'string' ? step.input : JSON.stringify(step.input)}\n`;
    if (step.output) output += `Output: ${typeof step.output === 'string' ? step.output : JSON.stringify(step.output)}\n`;
    if (step.derivedTasks && step.derivedTasks.length > 0) {
        output += `Derived Tasks (${step.derivedTasks.length}):\n`;
        step.derivedTasks.slice(0, 5).forEach((task, idx) => {
            output += `  ${idx + 1}. ${typeof task === 'string' ? task : JSON.stringify(task)}\n`;
        });
        if (step.derivedTasks.length > 5) {
            output += `  ... and ${step.derivedTasks.length - 5} more\n`;
        }
    }
    if (step.timestamp) output += `Timestamp: ${step.timestamp}\n`;
    return output;
};

/**
 * Formats a reasoning trace for display
 * @param {Array} trace - The reasoning trace
 * @returns {string} - Formatted reasoning trace string
 */
export const formatReasoningTrace = (trace) => {
    if (!trace || !Array.isArray(trace)) return 'No reasoning trace available';

    let output = `Reasoning Trace (${trace.length} steps)\n\n`;

    trace.slice(-10).forEach((step, index) => {
        output += `Step ${index + 1}:\n`;
        if (step.description) output += `  ${step.description}\n`;
        if (step.type) output += `  Type: ${step.type}\n`;
        if (step.input) output += `  Input: ${typeof step.input === 'string' ? step.input : JSON.stringify(step.input).substring(0, 100)}\n`;
        if (step.output) output += `  Output: ${typeof step.output === 'string' ? step.output : JSON.stringify(step.output).substring(0, 100)}\n`;
        output += '\n';
    });

    return output;
};

/**
 * Formats memory status for display
 * @param {object} memoryState - The memory state
 * @param {string} title - The title for the memory status
 * @returns {string} - Formatted memory status string
 */
export const formatMemoryStatus = (memoryState, title = 'Memory Status') => {
    const beliefsCount = memoryState.beliefs?.length || 0;
    const goalsCount = memoryState.goals?.length || 0;
    const questionsCount = memoryState.questions?.length || 0;
    const tasksCount = memoryState.tasks?.length || 0;

    return `${title}:
  Beliefs: ${beliefsCount}
  Goals:   ${goalsCount}
  Quests:  ${questionsCount}
  Tasks:   ${tasksCount}`;
};