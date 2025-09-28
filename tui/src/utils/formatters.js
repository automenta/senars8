import {getTaskDisplayData} from '@common/utils/formatUtils.js';
import {uiFormatting} from '@common/index.js';
import {appState} from '../modules/state.js';

/**
 * Formats tasks for display in the TUI.
 * It uses the shared `getTaskDisplayData` utility to get normalized data,
 * and then applies TUI-specific formatting.
 * @param {Array} tasks - The tasks to format.
 * @param {string} title - The title for the task list.
 * @returns {string} The formatted task list.
 */
export function formatTasks(tasks, title = 'Tasks') {
    // Use the shared function as base and adapt for TUI formatting
    if (!tasks || tasks.length === 0) {
        return `${title}: No items found`;
    }

    return `${title} (${tasks.length}):\n` +
        tasks.slice(0, 50).map((task, index) => {
            const {termKey, priority, punctuation, truthValue} = getTaskDisplayData(task);
            return `  [${index}] ${termKey}${punctuation} | P: ${priority} ${truthValue}`;
        }).join('\n');
}

/**
 * Formats system stats for display.
 * @param {object} stats - The system stats.
 * @returns {string} The formatted system stats.
 */
export function formatSystemStats(stats) {
    if (!stats) return 'System stats not available';

    // Use shared function as base and add TUI-specific formatting
    const baseStats = uiFormatting.formatSystemStats(stats);
    // Replace plain text formatting with TUI-specific formatting
    return `System Statistics:

{bold}Agent Status:{/bold}
  Cycles: ${stats.cycleCount || 0}
  Running: ${stats.isRunning ? 'Yes' : 'No'}

{bold}Memory Usage:{/bold}
  Total Usage: ${stats.memoryUsage || 0}
  Beliefs: ${stats.beliefs || 0}
  Goals: ${stats.goals || 0}
  Questions: ${stats.questions || 0}
  Tasks: ${stats.tasks || 0}

{bold}System Info:{/bold}
  CPU Usage: ${stats.cpuUsage || 0}%
  Memory: ${stats.memoryUsage || 0}
  Temperature: ${stats.temperature || 0}`;
}

/**
 * Creates the content for the dashboard.
 * @returns {string} The dashboard content.
 */
export function createDashboardContent() {
    const stats = appState.stats || {};
    const beliefsCount = appState.beliefs.length;
    const goalsCount = appState.goals.length;
    const questionsCount = appState.questions.length;
    const tasksCount = appState.tasks.length;
    const notificationCount = appState.notifications.length;
    
    // Use shared function as base and add TUI-specific formatting
    const baseContent = uiFormatting.createDashboardContent({
        stats,
        beliefs: appState.beliefs,
        goals: appState.goals,
        questions: appState.questions,
        tasks: appState.tasks,
        notifications: appState.notifications,
        statusUpdates: appState.statusUpdates,
        newBeliefs: appState.newBeliefs,
        newGoals: appState.newGoals,
        reasoningSteps: appState.reasoningSteps
    });
    
    // Convert plain text to TUI-specific formatting
    return `{bold}SeNARS Real-Time Dashboard{/bold}

{bold}System Status{/bold}
  Agent Running: {green}${stats.isRunning ? 'YES' : 'NO'}{/green}
  Cycles: {cyan}${stats.cycleCount || 0}{/cyan}
  Last Update: {yellow}${new Date().toLocaleTimeString()}{/yellow}

{bold}Memory Status{/bold}
  Total Tasks: {magenta}${tasksCount}{/magenta}
  Beliefs: {green}${beliefsCount}{/green}
  Goals: {red}${goalsCount}{/red}
  Questions: {blue}${questionsCount}{/blue}

{bold}Activity{/bold}
  Status Updates: {cyan}${appState.statusUpdates || 0}{/cyan}
  New Beliefs: {green}${appState.newBeliefs || 0}{/green}
  New Goals: {red}${appState.newGoals || 0}{/red}
  Reasoning Steps: {blue}${appState.reasoningSteps || 0}{/blue}

{bold}Notifications{/bold}
  Count: {yellow}${notificationCount}{/yellow}

{bold}Performance{/bold}
  CPU Usage: {yellow}${stats.cpuUsage || 0}%{/yellow}
  Memory: {magenta}${stats.memoryUsage || 0}{/magenta}
  Temperature: {cyan}${stats.temperature || 0}°{/cyan}

{bold}Quick Commands{/bold}
  Press 'S' for stats | 'C' for config | 'R' for reset
  Type !view [type] | Type !filter [type] | Type !search <query>`;
}

/**
 * Formats notifications for display.
 * @param {Array} notifications - The notifications to format.
 * @param {string} title - The title for the notification list.
 * @returns {string} The formatted notification list.
 */
export function formatNotifications(notifications, title = 'Notifications') {
    if (!notifications || notifications.length === 0) {
        return `${title}: No notifications`;
    }

    return `${title} (${notifications.length}):\n` +
        notifications.slice(-20).reverse().map((notif) => {
            const time = new Date(notif.timestamp).toLocaleTimeString();
            const typeSymbol = notif.type === 'error' ? '✗' :
                notif.type === 'warning' ? '⚠' :
                    notif.type === 'success' ? '✓' : 'ℹ';
            const typeColor = notif.type === 'error' ? 'red' :
                notif.type === 'warning' ? 'yellow' :
                    notif.type === 'success' ? 'green' : 'cyan';
            return `  {${typeColor}}[${typeSymbol}] {/}${time} - ${notif.message}`;
        }).join('\n');
}

/**
 * Formats a reasoning step for display.
 * @param {object} step - The reasoning step.
 * @returns {string} The formatted reasoning step.
 */
export function formatReasoningStep(step) {
    if (!step) return 'No reasoning step data';

    let output = '{bold}Reasoning Step{/bold}
';
    if (step.description) output += `Description: ${step.description}
`;
    if (step.type) output += `Type: ${step.type}
`;
    if (step.input) output += `Input: ${typeof step.input === 'string' ? step.input : JSON.stringify(step.input)}
`;
    if (step.output) output += `Output: ${typeof step.output === 'string' ? step.output : JSON.stringify(step.output)}
`;
    if (step.derivedTasks && step.derivedTasks.length > 0) {
        output += `Derived Tasks (${step.derivedTasks.length}):
`;
        step.derivedTasks.slice(0, 5).forEach((task, idx) => {
            output += `  ${idx + 1}. ${typeof task === 'string' ? task : JSON.stringify(task)}
`;
        });
        if (step.derivedTasks.length > 5) {
            output += `  ... and ${step.derivedTasks.length - 5} more
`;
        }
    }
    if (step.timestamp) output += `Timestamp: ${step.timestamp}
`;
    return output;
}

/**
 * Formats a reasoning trace for display.
 * @param {Array} trace - The reasoning trace.
 * @returns {string} The formatted reasoning trace.
 */
export function formatReasoningTrace(trace) {
    if (!trace || !Array.isArray(trace)) return 'No reasoning trace available';

    let output = `{bold}Reasoning Trace (${trace.length} steps){/bold}\n\n`;

    trace.slice(-10).forEach((step, index) => {
        output += `{underline}Step ${index + 1}:{/underline}\n`;
        if (step.description) output += `  ${step.description}\n`;
        if (step.type) output += `  Type: ${step.type}\n`;
        if (step.input) output += `  Input: ${typeof step.input === 'string' ? step.input : JSON.stringify(step.input).substring(0, 100)}\n`;
        if (step.output) output += `  Output: ${typeof step.output === 'string' ? step.output : JSON.stringify(step.output).substring(0, 100)}\n`;
        output += '\n';
    });

    return output;
}