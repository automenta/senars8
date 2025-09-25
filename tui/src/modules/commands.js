import { appState } from './state.js';
import { updateTaskDisplay, logMessage } from './ui.js';
import { formatTasks, formatReasoningTrace, formatNotifications, createDashboardContent } from '../utils/formatters.js';
import agentService from '../services/AgentCommunicationService.js';
import { applyTheme, getAvailableThemes } from './theme.js';

/**
 * Parses and executes a command.
 * @param {string} data - The command string.
 * @param {object} components - The UI components.
 */
export function handleCommand(data, components) {
  if (!data.trim()) {
    return;
  }

  if (!validateInput(data)) {
    logMessage('Error: Input too long (max 1000 characters)');
    return;
  }

  logMessage(`> ${data}`);

  appState.commandHistory.push(data);
  if (appState.commandHistory.length > 100) {
    appState.commandHistory = appState.commandHistory.slice(-100);
  }
  appState.currentHistoryIndex = -1;

  if (data.startsWith('!')) {
    const parts = data.slice(1).split(' ');
    const command = parts[0].toLowerCase();
    const args = parts.slice(1).join(' ');

    executeCommand(command, args, components);
  } else {
    try {
      if (data.length < 3) {
        logMessage('Error: Narsese statement too short');
        return;
      }
      agentService.sendNarsese(data);
      logMessage(`Sent narsese: ${data}`);
    } catch (error) {
      logMessage(`Error sending narsese: ${error.message}`);
    }
  }
}

/**
 * Executes a command based on the command name and arguments.
 * @param {string} command - The command name.
 * @param {string} args - The command arguments.
 * @param {object} components - The UI components.
 */
function executeCommand(command, args, components) {
  try {
    switch (command) {
      case 'start':
        agentService.startAgent();
        logMessage('Sent command to start agent');
        break;
      case 'stop':
        agentService.stopAgent();
        logMessage('Sent command to stop agent');
        break;
      case 'reset':
        agentService.resetAgent();
        logMessage('Sent command to reset agent');
        break;
      case 'add':
        if (args) {
          if (args.length < 3) {
            logMessage('Error: Task statement too short');
            break;
          }
          agentService.addTask({
            statement: args,
            punctuation: args.endsWith('!') ? '!' : args.endsWith('?') ? '?' : '.',
            priority: 0.5
          });
          logMessage(`Added task: ${args}`);
        } else {
          logMessage('Usage: !add <task_statement>');
        }
        break;
      case 'query':
        if (args) {
          agentService.sendNarsese(args);
          logMessage(`Querying: ${args}`);
        } else {
          logMessage('Usage: !query <narsese_or_text>');
        }
        break;
      case 'stats':
        agentService.getSystemStats();
        logMessage('Fetching system statistics...');
        break;
      case 'config':
        agentService.getConfig();
        logMessage('Fetching agent configuration...');
        break;
      case 'search':
        if (args) {
          const searchParams = parseSearchArgs(args);
          agentService.search(searchParams.query, {
            scope: searchParams.scope,
            limit: searchParams.limit,
            filters: searchParams.filters
          });
          logMessage(`Searching for: "${searchParams.query}" with filters`);
        } else {
          logMessage('Usage: !search <query> [type:belief|goal|question] [priority:high|medium|low] [limit:n]');
        }
        break;
      case 'view':
        viewTasks(args);
        break;
      case 'filter':
        filterTasks(args);
        break;
      case 'clear':
        clearDisplays();
        break;
      case 'history':
        showHistory();
        break;
      case 'read':
        if (args) {
          agentService.sendMessage('readFile', { filePath: args });
          logMessage(`Reading file: ${args}`);
        } else {
          logMessage('Usage: !read <file_path>');
        }
        break;
      case 'write':
        const writeArgs = args.split(' ');
        if (writeArgs.length >= 2) {
          const filePath = writeArgs[0];
          const content = writeArgs.slice(1).join(' ');
          agentService.sendMessage('writeFile', { filePath, content });
          logMessage(`Writing to file: ${filePath}`);
        } else {
          logMessage('Usage: !write <file_path> <content>');
        }
        break;
      case 'ls':
      case 'dir':
        const dirPath = args || '.';
        agentService.sendMessage('readDirectory', { directoryPath: dirPath });
        logMessage(`Listing directory: ${dirPath}`);
        break;
      case 'mkdir':
        if (args) {
          agentService.sendMessage('createDirectory', { directoryPath: args });
          logMessage(`Creating directory: ${args}`);
        } else {
          logMessage('Usage: !mkdir <directory_path>');
        }
        break;
      case 'create':
        if (args) {
          agentService.sendMessage('createFile', { filePath: args });
          logMessage(`Creating file: ${args}`);
        } else {
          logMessage('Usage: !create <file_path>');
        }
        break;
      case 'export':
        exportData(args);
        break;
      case 'import':
        if (args) {
          agentService.sendMessage('readFile', { filePath: args });
          logMessage(`Importing from: ${args}`);
        } else {
          logMessage('Usage: !import <file_path>');
        }
        break;
      case 'run':
        if (args) {
          agentService.sendMessage('runCommand', { command: args });
          logMessage(`Running command: ${args}`);
        } else {
          logMessage('Usage: !run <command>');
        }
        break;
      case 'execute':
        if (args) {
          agentService.sendMessage('task_action', { action: 'execute', taskId: args });
          logMessage(`Attempting to execute task ID: ${args}`);
        } else {
          logMessage('Usage: !execute <task_id>');
        }
        break;
      case 'pause':
        if (args) {
          agentService.sendMessage('task_action', { action: 'pause', taskId: args });
          logMessage(`Attempting to pause task ID: ${args}`);
        } else {
          logMessage('Usage: !pause <task_id>');
        }
        break;
      case 'delete':
      case 'del':
        if (args) {
          agentService.sendMessage('delete_task', { taskId: args });
          logMessage(`Attempting to delete task ID: ${args}`);
        } else {
          logMessage('Usage: !delete <task_id>');
        }
        break;
      case 'list':
      case 'tasks':
        listTasks();
        break;
      case 'prioritize':
      case 'priority':
        prioritizeTask(args);
        break;
      case 'sort':
        sortTasks(args);
        break;
      case 'dashboard':
      case 'dash':
        showDashboard();
        break;
      case 'refresh':
        refreshView();
        break;
      case 'reasoning':
      case 'trace':
        showReasoningTrace();
        break;
      case 'cleartrace':
      case 'ctrace':
        appState.reasoningTraces = [];
        logMessage('Cleared reasoning traces');
        break;
      case 'notify':
      case 'notifications':
        showNotifications();
        break;
      case 'notifyclear':
      case 'clearnotify':
        appState.notifications = [];
        logMessage('Cleared all notifications');
        break;
      case 'theme':
        if (args) {
          const result = applyTheme(components, args);
          logMessage(result);
        } else {
          const themes = getAvailableThemes().join(', ');
          logMessage(`Available themes: ${themes}. Usage: !theme <theme_name>`);
        }
        break;
      case 'help':
        logMessage('Available commands: !start, !stop, !reset, !add, !query, !view, !filter, !search, !stats, !config, !history, !read, !write, !ls, !mkdir, !create, !run, !execute, !pause, !delete, !list, !prioritize, !sort, !dashboard, !reasoning, !export, !import, !notify, !clearnotify, !cleartrace, !refresh, !clear, !help, !theme');
        break;
      default:
        logMessage(`Unknown command: ${command}. Type !help for available commands.`);
    }
  } catch (error) {
    logMessage(`Error processing command: ${error.message}`);
  }
}

function validateInput(input) {
  return input.length <= 1000;
}

function parseSearchArgs(args) {
    const params = {
    query: '',
    scope: 'all',
    limit: 50,
    filters: {}
  };

  const tokens = args.split(' ');
  const queryParts = [];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i].toLowerCase();

    if (token.startsWith('type:')) {
      const type = token.substring(5);
      if (['belief', 'goal', 'question', 'all'].includes(type)) {
        params.scope = type;
      }
    } else if (token.startsWith('priority:')) {
      const priority = token.substring(9);
      if (['high', 'medium', 'low', 'all'].includes(priority)) {
        params.filters.priority = priority;
      }
    } else if (token.startsWith('limit:')) {
      const limit = parseInt(token.substring(6));
      if (!isNaN(limit) && limit > 0) {
        params.limit = Math.min(limit, 1000);
      }
    } else {
      queryParts.push(tokens[i]);
    }
  }

  params.query = queryParts.join(' ').trim();
  return params;
}

function viewTasks(filter) {
  if (filter) {
    const f = filter.toLowerCase();
    let tasksToShow = [];
    let title = 'Tasks';

    if (f === 'beliefs' || f === 'belief') {
      tasksToShow = appState.beliefs;
      title = 'Beliefs';
      appState.taskFilter = 'belief';
    } else if (f === 'goals' || f === 'goal') {
      tasksToShow = appState.goals;
      title = 'Goals';
      appState.taskFilter = 'goal';
    } else if (f === 'questions' || f === 'question') {
      tasksToShow = appState.questions;
      title = 'Questions';
      appState.taskFilter = 'question';
    } else {
      logMessage(`Unknown filter: ${filter}. Use: beliefs, goals, or questions`);
      return;
    }
    updateTaskDisplay(title, formatTasks(tasksToShow, title));
    logMessage(`Displayed ${title.toLowerCase()}`);
  } else {
    updateTaskDisplay('All Tasks', formatTasks(appState.tasks, 'All Tasks'));
    appState.taskFilter = 'all';
    logMessage('Displayed all tasks');
  }
}

function filterTasks(filter) {
    if (filter) {
        const f = filter.toLowerCase();
        if (['all', 'belief', 'goal', 'question'].includes(f)) {
            appState.taskFilter = f;
            logMessage(`Set filter to: ${f}`);
            listTasks();
        } else {
            logMessage('Usage: !filter [all|belief|goal|question]');
        }
    } else {
        logMessage('Usage: !filter [all|belief|goal|question]');
    }
}

function clearDisplays() {
    updateTaskDisplay('Tasks and Events', 'Tasks will appear here');
    logMessage('Cleared displays');
    appState.dashboardMode = false;
}

function showHistory() {
    if (appState.commandHistory.length > 0) {
        const historyDisplay = appState.commandHistory.map((cmd, idx) => `  [${idx}] ${cmd}`).join('\n');
        updateTaskDisplay(`Command History (${appState.commandHistory.length})`, historyDisplay);
        logMessage(`Showing ${appState.commandHistory.length} commands in history`);
    } else {
        logMessage('No command history available');
    }
}

function exportData(args) {
    if (args) {
        const exportArgs = args.split(' ');
        const exportType = exportArgs[0].toLowerCase();
        const filePath = exportArgs[1] || `export_${Date.now()}.json`;
        let exportData = null;

        switch(exportType) {
            case 'tasks':
            case 'all':
                exportData = { type: 'tasks', timestamp: new Date().toISOString(), data: appState.tasks };
                break;
            case 'beliefs':
                exportData = { type: 'beliefs', timestamp: new Date().toISOString(), data: appState.beliefs };
                break;
            case 'goals':
                exportData = { type: 'goals', timestamp: new Date().toISOString(), data: appState.goals };
                break;
            case 'questions':
                exportData = { type: 'questions', timestamp: new Date().toISOString(), data: appState.questions };
                break;
            case 'config':
                exportData = { type: 'config', timestamp: new Date().toISOString(), data: appState.config };
                break;
            case 'trace':
            case 'reasoning':
                exportData = { type: 'reasoning_trace', timestamp: new Date().toISOString(), data: appState.reasoningTraces };
                break;
            default:
                logMessage('Usage: !export [tasks|beliefs|goals|questions|config|trace] [filename]');
                return;
        }
        agentService.sendMessage('writeFile', { filePath: filePath, content: JSON.stringify(exportData, null, 2) });
        logMessage(`Exporting ${exportType} to: ${filePath}`);
    } else {
        logMessage('Usage: !export [tasks|beliefs|goals|questions|config|trace] [filename]');
    }
}

function listTasks() {
    let tasksToShow = [];
    let title = 'Tasks';

    switch(appState.taskFilter) {
        case 'belief':
            tasksToShow = appState.beliefs;
            title = 'Beliefs';
            break;
        case 'goal':
            tasksToShow = appState.goals;
            title = 'Goals';
            break;
        case 'question':
            tasksToShow = appState.questions;
            title = 'Questions';
            break;
        default:
            tasksToShow = appState.tasks;
            title = 'All Tasks';
    }
    updateTaskDisplay(title, formatTasks(tasksToShow, title));
    logMessage(`Displayed ${tasksToShow.length} ${title.toLowerCase()}`);
}

function prioritizeTask(args) {
    const priorityArgs = args.split(' ');
    if (priorityArgs.length >= 2) {
        const taskId = priorityArgs[0];
        const newPriority = parseFloat(priorityArgs[1]);
        if (isNaN(newPriority) || newPriority < 0 || newPriority > 1) {
            logMessage('Error: Priority must be a number between 0 and 1');
            return;
        }
        agentService.sendMessage('update_task', { taskId: taskId, updates: { priority: newPriority } });
        logMessage(`Attempting to set priority of task ${taskId} to ${newPriority}`);
    } else {
        logMessage('Usage: !prioritize <task_id> <priority_0_to_1>');
    }
}

function sortTasks(criteria) {
    if (criteria) {
        const sortCriteria = criteria.toLowerCase();
        let tasksToShow = [];
        let title = 'Tasks';

        switch(appState.taskFilter) {
            case 'belief':
                tasksToShow = [...appState.beliefs];
                title = 'Beliefs';
                break;
            case 'goal':
                tasksToShow = [...appState.goals];
                title = 'Goals';
                break;
            case 'question':
                tasksToShow = [...appState.questions];
                title = 'Questions';
                break;
            default:
                tasksToShow = [...appState.tasks];
                title = 'All Tasks';
        }

        if (sortCriteria === 'priority' || sortCriteria === 'prio') {
            tasksToShow.sort((a, b) => (b.priority || b.state?.priority || 0) - (a.priority || a.state?.priority || 0));
            title += ' (sorted by priority)';
        } else if (sortCriteria === 'time' || sortCriteria === 'date') {
            tasksToShow.sort((a, b) => (b.state?.stamp?.creationTime || 0) - (a.state?.stamp?.creationTime || 0));
            title += ' (sorted by time)';
        } else {
            logMessage('Usage: !sort [priority|time]');
            return;
        }
        updateTaskDisplay(title, formatTasks(tasksToShow, title));
        logMessage(`Sorted ${title}`);
    } else {
        logMessage('Usage: !sort [priority|time]');
    }
}

function showDashboard() {
    const dashboardContent = createDashboardContent();
    updateTaskDisplay('Real-Time Dashboard', dashboardContent);
    logMessage('Dashboard view activated');
    appState.dashboardMode = true;
}

function refreshView() {
    if (appState.dashboardMode) {
        const dashboardContent = createDashboardContent();
        updateTaskDisplay('Real-Time Dashboard', dashboardContent);
    } else {
        listTasks();
    }
    logMessage('View refreshed');
}

function showReasoningTrace() {
    if (appState.reasoningTraces.length > 0) {
        const traceContent = formatReasoningTrace(appState.reasoningTraces);
        updateTaskDisplay(`Reasoning Trace (${appState.reasoningTraces.length} steps)`, traceContent);
        logMessage(`Displayed reasoning trace with ${appState.reasoningTraces.length} steps`);
    } else {
        logMessage('No reasoning traces available yet');
    }
}

function showNotifications() {
    if (appState.notifications.length > 0) {
        updateTaskDisplay('Notifications', formatNotifications(appState.notifications));
        logMessage(`Showing ${appState.notifications.length} notifications`);
    } else {
        logMessage('No notifications available');
    }
}