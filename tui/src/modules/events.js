import { appState, updateTaskList, addNotification } from './state.js';
import { updateTaskDisplay, logMessage, updateStatus } from './ui.js';
import { formatTasks, formatSystemStats, formatReasoningStep, formatReasoningTrace, createDashboardContent, formatNotifications } from '../utils/formatters.js';

/**
 * Registers all event handlers for the agent service.
 * @param {object} agentService - The agent communication service instance.
 */
export function registerEventHandlers(agentService) {
  agentService.on('status', (status) => {
    if (status === 'connected') {
      updateStatus('Connected to agent service', 'green');
      onImportantEvent('Connected to agent service', 'success');
    } else if (status === 'disconnected') {
      updateStatus('Disconnected from agent service', 'red');
      onImportantEvent('Disconnected from agent service', 'warning');
    } else if (status === 'failed') {
      updateStatus('Failed to connect to agent service', 'red');
      onImportantEvent('Failed to connect to agent service', 'error');
    }
  });

  agentService.on('system_stats', (stats) => {
    appState.stats = stats;
    if (appState.dashboardMode) {
      updateTaskDisplay('Real-Time Dashboard', createDashboardContent());
    } else {
      updateTaskDisplay('System Stats', formatSystemStats(stats));
    }
    if (stats.temperature > 0.8) {
      onImportantEvent(`High temperature detected: ${stats.temperature}`, 'warning');
    }
  });

  agentService.on('status_update', (status) => {
    appState.statusUpdates++;
    if (appState.dashboardMode) {
      updateTaskDisplay('Real-Time Dashboard', createDashboardContent());
    } else {
      updateTaskDisplay('Status Update', JSON.stringify(status, null, 2));
    }
  });

  agentService.on('add_belief', (belief) => {
    updateTaskList(belief, 'belief');
    appState.newBeliefs++;
    if (appState.dashboardMode) {
      updateTaskDisplay('Real-Time Dashboard', createDashboardContent());
    } else {
      updateTaskDisplay('New Belief', formatTasks([belief], 'New Belief'));
    }
  });

  agentService.on('add_goal', (goal) => {
    updateTaskList(goal, 'goal');
    appState.newGoals++;
    if (appState.dashboardMode) {
      updateTaskDisplay('Real-Time Dashboard', createDashboardContent());
    } else {
      updateTaskDisplay('New Goal', formatTasks([goal], 'New Goal'));
    }
  });

  agentService.on('add_question', (question) => {
    updateTaskList(question, 'question');
    updateTaskDisplay('New Question', formatTasks([question], 'New Question'));
  });

  agentService.on('task_added', (task) => {
    updateTaskDisplay('Task Added', JSON.stringify(task, null, 2));
  });

  agentService.on('reasoning_step', (step) => {
    appState.reasoningSteps++;
    appState.reasoningTraces.push({ ...step, timestamp: new Date().toISOString() });
    if (appState.reasoningTraces.length > 100) {
      appState.reasoningTraces = appState.reasoningTraces.slice(-100);
    }
    if (appState.dashboardMode) {
      updateTaskDisplay('Real-Time Dashboard', createDashboardContent());
    } else {
      updateTaskDisplay('Reasoning Step', formatReasoningStep(step));
    }
  });

  agentService.on('logMessage', (logMsg) => {
    logMessage(`${logMsg.level}: ${logMsg.message}`);
  });

  agentService.on('connection_ack', (ack) => {
    logMessage(`Connection acknowledged: ${ack.message}`);
  });

  agentService.on('error', (error) => {
    const errorMsg = `Service error: ${error.message || error}`;
    logMessage(errorMsg);
    onImportantEvent(errorMsg, 'error');
  });

  agentService.on('search_results', (results) => {
    let searchInfo = `Search Results for "${results.query}"`;
    if (results.scope) searchInfo += ` [Scope: ${results.scope}]`;
    if (results.filters?.priority) searchInfo += ` [Priority: ${results.filters.priority}]`;
    if (results.limit) searchInfo += ` [Limit: ${results.limit}]`;
    updateTaskDisplay(searchInfo, formatTasks(results.results, `Search Results (${results.total})`));
    logMessage(`Found ${results.total} results for query: ${results.query}`);
  });

  agentService.on('search_error', (error) => {
    logMessage(`Search error: ${error.message}`);
  });

  agentService.on('config_response', (config) => {
    appState.config = config;
    let configDisplay = 'Agent Configuration:\n\n';
    for (const [category, settings] of Object.entries(config)) {
      configDisplay += `{bold}${category.toUpperCase()}:{/bold}\n`;
      for (const [key, value] of Object.entries(settings)) {
        configDisplay += `  ${key}: ${JSON.stringify(value)}\n`;
      }
      configDisplay += '\n';
    }
    updateTaskDisplay('Configuration', configDisplay);
    logMessage('Configuration loaded');
  });

  agentService.on('config_updated', (result) => {
    logMessage(result.success ? `Configuration updated: ${result.message}` : `Configuration update failed: ${result.message}`);
  });

  agentService.on('readDirectoryResponse', (response) => {
    const { files, directories, directoryPath } = response;
    let content = `Directory: ${directoryPath}\n\n{bold}Directories:{/bold}\n`;
    content += (directories?.length > 0) ? directories.map(dir => `  [DIR] ${dir}`).join('\n') + '\n' : '  No directories\n';
    content += '\n{bold}Files:{/bold}\n';
    content += (files?.length > 0) ? files.map(file => `  [FILE] ${file}`).join('\n') : '  No files';
    updateTaskDisplay('Directory Listing', content);
    logMessage(`Directory listing for ${directoryPath} completed`);
  });

  agentService.on('readFileResponse', (response) => {
    const { filePath, content } = response;
    try {
        const parsedContent = JSON.parse(content);
        if (parsedContent.type && parsedContent.data) {
            logMessage(`Imported ${parsedContent.type} from ${filePath} (${parsedContent.data.length || 1} items)`);
        } else {
            updateTaskDisplay(`Content of ${filePath}`, content.substring(0, 2000) + (content.length > 2000 ? '\\n... (truncated)' : ''));
        }
    } catch (e) {
        updateTaskDisplay(`Content of ${filePath}`, content.substring(0, 2000) + (content.length > 2000 ? '\\n... (truncated)' : ''));
    }
    logMessage(`Read file: ${filePath}`);
  });

  agentService.on('writeFileResponse', ({ filePath, success }) => {
    logMessage(success ? `Successfully wrote to file: ${filePath}` : `Failed to write to file: ${filePath}`);
  });

  agentService.on('createFileResponse', ({ filePath, success }) => {
    logMessage(success ? `Successfully created file: ${filePath}` : `Failed to create file: ${filePath}`);
  });

  agentService.on('createDirectoryResponse', ({ directoryPath, success }) => {
    logMessage(success ? `Successfully created directory: ${directoryPath}` : `Failed to create directory: ${directoryPath}`);
  });

  agentService.on('commandOutput', ({ stdout, stderr }) => {
    if (stdout) updateTaskDisplay('Command Output', stdout);
    if (stderr) logMessage(`Command error: ${stderr}`);
    if (!stdout && !stderr) logMessage('Command executed (no output)');
  });

  agentService.on('task_execution_result', (result) => {
    logMessage(`Task execution result: ${result.status} for task ${result.taskId}`);
  });

  agentService.on('task_status_change', (statusChange) => {
    logMessage(`Task status changed: ${statusChange.status} for task ${statusChange.taskId}`);
  });

  agentService.on('delete_task_response', (response) => {
    logMessage(response.success ? `Successfully deleted task: ${response.path || response.taskId}` : `Failed to delete task: ${response.path || response.taskId}. Error: ${response.message}`);
  });

  agentService.on('tasks_response', ({ tasks, total }) => {
    updateTaskDisplay(`Tasks (${total})`, formatTasks(tasks, `Tasks List (${total})`));
    logMessage(`Received ${total} tasks from agent`);
  });
}

function onImportantEvent(message, type = 'info') {
  addNotification(message, type);
  if (appState.dashboardMode) {
    updateTaskDisplay('Real-Time Dashboard', createDashboardContent());
  }
}