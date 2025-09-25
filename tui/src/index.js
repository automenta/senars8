#!/usr/bin/env node

import blessed from 'blessed';
import AgentCommunicationService from './services/AgentCommunicationService.js';

// Store for tasks and other state
const appState = {
  tasks: [],
  beliefs: [],
  goals: [],
  questions: [],
  config: null,
  stats: null,
  commandHistory: [],
  currentHistoryIndex: -1, // -1 means not browsing history
  taskFilter: 'all',
  searchQuery: '',
  statusUpdates: 0,
  newBeliefs: 0,
  newGoals: 0,
  reasoningSteps: 0,
  dashboardMode: false,
  notifications: [] // Store for notifications
};

// Create a blessed screen object
const screen = blessed.screen({
  smartCSR: true,
  title: 'SeNARS TUI - Self-Evolving Neuromorphic-Adaptive Reasoning System',
  fullUnicode: true
});

// Add a box for the header
const header = blessed.box({
  top: '0',
  left: '0',
  width: '100%',
  height: 'shrink',
  content: '{center}SeNARS TUI - Self-Evolving Neuromorphic-Adaptive Reasoning System{/center}',
  tags: true,
  border: {
    type: 'line'
  },
  style: {
    fg: 'white',
    bg: 'blue',
    border: {
      fg: '#f0f0f0'
    }
  }
});

// Add a box for status information
const statusBox = blessed.box({
  top: 1,
  left: '0',
  width: '100%',
  height: 'shrink',
  content: 'Disconnected from agent',
  tags: true,
  border: {
    type: 'line'
  },
  style: {
    fg: 'white',
    bg: 'red',
    border: {
      fg: '#f0f0f0'
    }
  }
});

// Add a box for task display
const taskBox = blessed.box({
  top: 2,
  left: 0,
  width: '70%',
  height: '70%-2',
  content: '{bold}Tasks and Events{/bold}\nTasks will appear here',
  tags: true,
  border: {
    type: 'line'
  },
  style: {
    fg: 'cyan',
    bg: 'black',
    border: {
      fg: 'green'
    }
  },
  scrollable: true,
  alwaysScroll: true,
  mouse: true,
  keys: true,
  vi: true
});

// Add a box for log messages
const logBox = blessed.box({
  top: '70%',
  left: 0,
  width: '70%',
  height: '30%',
  content: '{bold}Log Messages{/bold}\nLog messages will appear here',
  tags: true,
  border: {
    type: 'line'
  },
  style: {
    fg: 'white',
    bg: 'black',
    border: {
      fg: 'yellow'
    }
  },
  scrollable: true,
  alwaysScroll: true,
  mouse: true,
  keys: true,
  vi: true
});

// Add an input field for commands
const inputField = blessed.textarea({  top: 2,
  right: 0,
  width: '30%',
  height: '30%-2',
  content: '{bold}Available Commands:{/bold}\n\n{green}!start{/green} | Start agent\n{red}!stop{/red} | Stop agent\n{magenta}!reset{/magenta} | Reset agent\n{green}!add <task>{/green} | Add a task\n{yellow}!query <text>{/yellow} | Query the agent\n{cyan}!view [type]{/cyan} | View tasks (beliefs/goals/questions)\n{cyan}!filter [type]{/cyan} | Filter tasks\n{blue}!search <query>{/blue} | Search tasks\n{magenta}!stats{/magenta} | System stats\n{yellow}!config{/yellow} | Configuration\n{green}!read <path>{/green} | Read a file\n{green}!write <path> <content>{/green} | Write to a file\n{green}!ls [path]{/green} | List directory\n{green}!mkdir <path>{/green} | Create directory\n{green}!create <path>{/green} | Create file\n{green}!run <cmd>{/green} | Run command\n{green}!execute <id>{/green} | Execute task\n{green}!pause <id>{/green} | Pause task\n{green}!delete <id>{/green} | Delete task\n{green}!list{/green} | List tasks\n{green}!prioritize <id> <p>{/green} | Set task priority\n{green}!sort [type]{/green} | Sort tasks\n{green}!dashboard{/green} | Real-time dashboard\n{green}!reasoning{/green} | Show reasoning trace\n{green}!cleartrace{/green} | Clear reasoning traces\n{green}!refresh{/green} | Refresh view\n{red}!clear{/red} | Clear displays\n!help | Show help',
  tags: true,
  border: {
    type: 'line'
  },
  style: {
    fg: 'green',
    bg: 'black',
    border: {
      fg: 'green'
    },
    focus: {
      border: {
        fg: 'yellow'
      }
    }
  },
  mouse: true,
  inputOnFocus: true,
  scrollable: true,
  alwaysScroll: true
});

// Add a command input box
const commandInput = blessed.textbox({
  top: '50%',
  right: 0,
  width: '30%',
  height: '3',
  border: {
    type: 'line'
  },
  style: {
    fg: 'white',
    bg: 'black',
    border: {
      fg: 'cyan'
    },
    focus: {
      border: {
        fg: 'yellow'
      }
    }
  },
  inputOnFocus: true,
  tags: true
});

// Add a help box
const helpBox = blessed.box({  top: '50%+3',\n  right: 0,\n  width: '30%',\n  height: '50%-5',\n  content: '{bold}Command Help:{/bold}\\n\\n' +\n            '{underline}Agent Control:{/underline}\\n' +\n            '{green}!start{/green} - Start the agent cycling\\n' +\n            '{red}!stop{/red} - Stop the agent cycling\\n' +\n            '{magenta}!reset{/magenta} - Reset the agent\\n\\n' +\n            '{underline}Task Management:{/underline}\\n' +\n            '{green}!add <task>{/green} - Add a new task\\n' +\n            '{yellow}!query <text>{/yellow} - Query the agent\\n' +\n            '{cyan}!view [type]{/cyan} - View tasks (beliefs/goals/questions)\\n' +\n            '{cyan}!filter [type]{/cyan} - Filter tasks\\n' +\n            '{blue}!search <query>{/blue} - Search tasks\\n' +\n            '{green}!execute <id>{/green} - Execute a specific task\\n' +\n            '{green}!pause <id>{/green} - Pause a specific task\\n' +\n            '{green}!delete <id>{/green} - Delete a specific task\\n' +\n            '{green}!list{/green} - List all tasks in current filter\\n' +\n            '{green}!prioritize <id> <p>{/green} - Set task priority\\n' +\n            '{green}!sort [type]{/green} - Sort tasks by criteria\\n\\n' +\n            '{underline}System:{/underline}\\n' +\n            '{magenta}!stats{/magenta} - Show system stats\\n' +\n            '{yellow}!config{/yellow} - Show agent config\\n' +\n            '{green}!dashboard{/green} - Real-time monitoring dashboard\\n' +\n            '{green}!reasoning{/green} - Show reasoning trace\\n' +\n            '{green}!export [type] [file]{/green} - Export data (tasks, beliefs, goals, etc.)\\n' +\n            '{green}!import <file>{/green} - Import data from file\\n' +\n            '{green}!cleartrace{/green} - Clear reasoning traces\\n' +\n            '{green}!refresh{/green} - Refresh current view\\n' +\n            '{green}!history{/green} - Show command history\\n\\n' +\n            '{underline}File Operations:{/underline}\\n' +\n            '{green}!read <path>{/green} - Read a file\\n' +\n            '{green}!write <path> <content>{/green} - Write to a file\\n' +\n            '{green}!ls [path]{/green} - List directory contents\\n' +\n            '{green}!mkdir <path>{/green} - Create directory\\n' +\n            '{green}!create <path>{/green} - Create an empty file\\n' +\n            '{green}!run <cmd>{/green} - Execute a shell command\\n\\n' +\n            '{underline}Utilities:{/underline}\\n' +\n            '{red}!clear{/red} - Clear displays\\n\\n' +\n            '{underline}Examples:{/underline}\\n' +\n            '<cat> -> [animal].\\n' +\n            '<(animal & bird) --> [cat]!.\\n' +\n            'What is a cat?',\n  tags: true,\n  border: {\n    type: 'line'\n  },\n  style: {\n    fg: 'white',\n    bg: 'black',\n    border: {\n      fg: 'blue'\n    }\n  },\n  scrollable: true,\n  alwaysScroll: true,\n  mouse: true,\n  keys: true,\n  vi: true\n});

// Append elements to screen
screen.append(header);
screen.append(statusBox);
screen.append(taskBox);
screen.append(logBox);
screen.append(inputField);
screen.append(commandInput);
screen.append(helpBox);

// Focus on the command input box
commandInput.focus();

// Helper function to update status display
function updateStatus(text, color = 'yellow') {
  statusBox.setContent(text);
  statusBox.style.bg = color;
  screen.render();
}

// Helper function to update task display
function updateTaskDisplay(title, content) {
  taskBox.setContent(`${title}:\n${content}`);
  screen.render();
}

// Helper function to add log messages
function logMessage(message) {
  const timestamp = new Date().toISOString().slice(11, 19);
  logBox.pushLine(`[${timestamp}] ${message}`);
  logBox.setScrollPerc(100); // Auto-scroll to bottom
  screen.render();
}

// Helper function to parse search arguments
function parseSearchArgs(args) {
  const params = {
    query: '',
    scope: 'all',
    limit: 50,
    filters: {}
  };
  
  // Split args and process filters
  const tokens = args.split(' ');
  const queryParts = [];
  
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i].toLowerCase();
    
    if (token.startsWith('type:')) {
      const type = token.substring(5); // Remove 'type:' prefix
      if (['belief', 'goal', 'question', 'all'].includes(type)) {
        params.scope = type;
      }
    } else if (token.startsWith('priority:')) {
      const priority = token.substring(9); // Remove 'priority:' prefix
      if (['high', 'medium', 'low', 'all'].includes(priority)) {
        params.filters.priority = priority;
      }
    } else if (token.startsWith('limit:')) {
      const limit = parseInt(token.substring(6)); // Remove 'limit:' prefix
      if (!isNaN(limit) && limit > 0) {
        params.limit = Math.min(limit, 1000); // Cap at 1000 to prevent too much data
      }
    } else {
      // This is part of the query
      queryParts.push(tokens[i]);
    }
  }
  
  params.query = queryParts.join(' ').trim();
  return params;
}

// Helper function to format tasks for display
function formatTasks(tasks, title = 'Tasks') {
  if (!tasks || tasks.length === 0) {
    return `${title}: No items found`;
  }
  
  return `${title} (${tasks.length}):\n` + 
    tasks.slice(0, 50).map((task, index) => { // Limit to 50 items to avoid overwhelming the display
      const termKey = task.termKey || task.statement || task.id || 'Unknown';
      const priority = (task.priority || task.state?.priority || 0).toFixed(2);
      const punctuation = task.punctuation || (task.statement?.endsWith('!') ? '!' : task.statement?.endsWith('?') ? '?' : '.');
      const tv = task.state?.truthValue;
      const truthValue = tv ? `TV(${tv.frequency.toFixed(2)}, ${tv.confidence.toFixed(2)})` : '';
      return `  [${index}] ${termKey} ${punctuation} | P: ${priority} ${truthValue}`;
    }).join('\n');
}

// Helper function to update task list in appState
function updateTaskList(task, type) {
  // Add to general tasks list
  appState.tasks.push(task);
  
  // Add to specific type list
  if (type === 'belief' && task.punctuation === '.') {
    appState.beliefs.push(task);
  } else if (type === 'goal' && task.punctuation === '!') {
    appState.goals.push(task);
  } else if (type === 'question' && task.punctuation === '?') {
    appState.questions.push(task);
  }
  
  // Limit to last 100 items to prevent memory issues
  if (appState.tasks.length > 100) appState.tasks = appState.tasks.slice(-100);
  if (appState.beliefs.length > 100) appState.beliefs = appState.beliefs.slice(-100);
  if (appState.goals.length > 100) appState.goals = appState.goals.slice(-100);
  if (appState.questions.length > 100) appState.questions = appState.questions.slice(-100);
}

// Helper function to format system stats
function formatSystemStats(stats) {
  if (!stats) return 'System stats not available';
  
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

// Helper function to create dashboard content
function createDashboardContent() {
  const stats = appState.stats || {};
  const beliefsCount = appState.beliefs.length;
  const goalsCount = appState.goals.length;
  const questionsCount = appState.questions.length;
  const tasksCount = appState.tasks.length;
  const notificationCount = appState.notifications.length;
  
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
  Type !view [type] | Type !filter [type] | Type !search <query}`;
}

// Helper function to create notification
function createNotification(message, type = 'info', timestamp = new Date()) {
  const id = Date.now() + Math.random().toString(36).substr(2, 9);
  return {
    id,
    message,
    type, // info, success, warning, error
    timestamp: timestamp instanceof Date ? timestamp : new Date(timestamp),
    read: false
  };
}

// Helper function to add a notification
function addNotification(message, type = 'info') {
  const notification = createNotification(message, type);
  appState.notifications.push(notification);
  
  // Limit to 100 notifications to prevent memory issues
  if (appState.notifications.length > 100) {
    appState.notifications = appState.notifications.slice(-100);
  }
  
  // Also send to log for immediate visibility
  logMessage(`[${type.toUpperCase()}] ${message}`);
  
  return notification;
}

// Helper function to format notifications for display
function formatNotifications(notifications, title = 'Notifications') {
  if (!notifications || notifications.length === 0) {
    return `${title}: No notifications`;
  }
  
  return `${title} (${notifications.length}):\n` + 
    notifications.slice(-20).reverse().map((notif, index) => { // Show last 20, newest first
      const time = notif.timestamp.toLocaleTimeString();
      const typeSymbol = notif.type === 'error' ? '✗' : 
                        notif.type === 'warning' ? '⚠' : 
                        notif.type === 'success' ? '✓' : 'ℹ';
      const typeColor = notif.type === 'error' ? 'red' : 
                        notif.type === 'warning' ? 'yellow' : 
                        notif.type === 'success' ? 'green' : 'cyan';
      return `  {${typeColor}}[${typeSymbol}] {/}${time} - ${notif.message}`;
    }).join('\n');
}

// Add notification when important events happen
function onImportantEvent(message, type = 'info') {
  addNotification(message, type);
  
  // Update dashboard if in dashboard mode
  if (appState.dashboardMode) {
    updateTaskDisplay('Real-Time Dashboard', createDashboardContent());
  }
}

// Connect to the agent service
const agentService = new AgentCommunicationService('ws://localhost:8080');

// Set up event listeners for agent service
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

// Listen for various agent events
agentService.on('system_stats', (stats) => {
  appState.stats = stats;
  
  // Update dashboard if in dashboard mode
  if (appState.dashboardMode) {
    updateTaskDisplay('Real-Time Dashboard', createDashboardContent());
  } else {
    updateTaskDisplay('System Stats', formatSystemStats(stats));
  }
  
  // Create notification if there are any issues
  if (stats.temperature > 0.8) {
    onImportantEvent(`High temperature detected: ${stats.temperature}`, 'warning');
  }
});

agentService.on('status_update', (status) => {
  appState.statusUpdates = (appState.statusUpdates || 0) + 1;
  
  // Update dashboard if in dashboard mode
  if (appState.dashboardMode) {
    updateTaskDisplay('Real-Time Dashboard', createDashboardContent());
  } else {
    updateTaskDisplay('Status Update', JSON.stringify(status, null, 2));
  }
});

agentService.on('add_belief', (belief) => {
  updateTaskList(belief, 'belief');
  appState.newBeliefs = (appState.newBeliefs || 0) + 1;
  
  // Update dashboard if in dashboard mode
  if (appState.dashboardMode) {
    updateTaskDisplay('Real-Time Dashboard', createDashboardContent());
  } else {
    updateTaskDisplay('New Belief', formatTasks([belief], 'New Belief'));
  }
});

agentService.on('add_goal', (goal) => {
  updateTaskList(goal, 'goal');
  appState.newGoals = (appState.newGoals || 0) + 1;
  
  // Update dashboard if in dashboard mode
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

// Store for reasoning traces
appState.reasoningTraces = [];

agentService.on('reasoning_step', (step) => {
  appState.reasoningSteps = (appState.reasoningSteps || 0) + 1;
  
  // Add reasoning step to traces
  appState.reasoningTraces.push({
    ...step,
    timestamp: new Date().toISOString()
  });
  
  // Limit traces to prevent memory issues
  if (appState.reasoningTraces.length > 100) {
    appState.reasoningTraces = appState.reasoningTraces.slice(-100);
  }
  
  // Update dashboard if in dashboard mode
  if (appState.dashboardMode) {
    updateTaskDisplay('Real-Time Dashboard', createDashboardContent());
  } else {
    updateTaskDisplay('Reasoning Step', formatReasoningStep(step));
  }
});

// Helper function to format reasoning steps
function formatReasoningStep(step) {
  if (!step) return 'No reasoning step data';
  
  let output = '{bold}Reasoning Step{/bold}\n';
  
  if (step.description) {
    output += `Description: ${step.description}\n`;
  }
  
  if (step.type) {
    output += `Type: ${step.type}\n`;
  }
  
  if (step.input) {
    output += `Input: ${typeof step.input === 'string' ? step.input : JSON.stringify(step.input)}\n`;
  }
  
  if (step.output) {
    output += `Output: ${typeof step.output === 'string' ? step.output : JSON.stringify(step.output)}\n`;
  }
  
  if (step.derivedTasks && step.derivedTasks.length > 0) {
    output += `Derived Tasks (${step.derivedTasks.length}):\n`;
    step.derivedTasks.slice(0, 5).forEach((task, idx) => { // Limit to 5 tasks
      output += `  ${idx + 1}. ${typeof task === 'string' ? task : JSON.stringify(task)}\n`;
    });
    if (step.derivedTasks.length > 5) {
      output += `  ... and ${step.derivedTasks.length - 5} more\n`;
    }
  }
  
  if (step.timestamp) {
    output += `Timestamp: ${step.timestamp}\n`;
  }
  
  return output;
}

// Helper function to format reasoning trace
function formatReasoningTrace(trace) {
  if (!trace || !Array.isArray(trace)) return 'No reasoning trace available';
  
  let output = `{bold}Reasoning Trace (${trace.length} steps){/bold}\n\n`;
  
  trace.slice(-10).forEach((step, index) => { // Show last 10 steps
    output += `{underline}Step ${index + 1}:{/underline}\n`;
    if (step.description) output += `  ${step.description}\n`;
    if (step.type) output += `  Type: ${step.type}\n`;
    if (step.input) output += `  Input: ${typeof step.input === 'string' ? step.input : JSON.stringify(step.input).substring(0, 100)}\n`;
    if (step.output) output += `  Output: ${typeof step.output === 'string' ? step.output : JSON.stringify(step.output).substring(0, 100)}\n`;
    output += '\n';
  });
  
  return output;
}

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
  
  if (results.scope) {
    searchInfo += ` [Scope: ${results.scope}]`;
  }
  
  if (results.filters) {
    if (results.filters.priority) {
      searchInfo += ` [Priority: ${results.filters.priority}]`;
    }
  }
  
  if (results.limit) {
    searchInfo += ` [Limit: ${results.limit}]`;
  }
  
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
  if (result.success) {
    logMessage(`Configuration updated: ${result.message}`);
  } else {
    logMessage(`Configuration update failed: ${result.message}`);
  }
});

// File operation event handlers
agentService.on('readDirectoryResponse', (response) => {
  const { files, directories, directoryPath } = response;
  let content = `Directory: ${directoryPath}\n\n{bold}Directories:{/bold}\n`;
  
  if (directories && directories.length > 0) {
    content += directories.map(dir => `  [DIR] ${dir}`).join('\n') + '\n';
  } else {
    content += '  No directories\n';
  }
  
  content += '\n{bold}Files:{/bold}\n';
  if (files && files.length > 0) {
    content += files.map(file => `  [FILE] ${file}`).join('\n');
  } else {
    content += '  No files';
  }
  
  updateTaskDisplay('Directory Listing', content);
  logMessage(`Directory listing for ${directoryPath} completed`);
});

agentService.on('readFileResponse', (response) => {\n  const { filePath, content } = response;\n  \n  // Check if the content is JSON and can be parsed as an export\n  try {\n    const parsedContent = JSON.parse(content);\n    if (parsedContent.type && parsedContent.data) {\n      // This looks like an export file, process accordingly\n      logMessage(`Imported ${parsedContent.type} from ${filePath} (${parsedContent.data.length || 1} items)`);\n      \n      // Add imported data to appropriate appState arrays\n      switch(parsedContent.type) {\n        case 'tasks':\n        case 'beliefs':\n        case 'goals':\n        case 'questions':\n          // For now, just log the import - in a real system we would merge the data\n          logMessage(`Imported ${parsedContent.type} will be processed in the agent`);\n          break;\n        case 'reasoning_trace':\n          logMessage(`Imported reasoning trace with ${parsedContent.data.length} steps`);\n          break;\n        case 'config':\n          logMessage(`Configuration data imported from ${filePath}`);\n          break;\n        default:\n          updateTaskDisplay(`Content of ${filePath}`, content.substring(0, 2000) + (content.length > 2000 ? '\\n... (truncated)' : '')); // Limit content size\n      }\n    } else {\n      // Regular file content\n      updateTaskDisplay(`Content of ${filePath}`, content.substring(0, 2000) + (content.length > 2000 ? '\\n... (truncated)' : '')); // Limit content size\n    }\n  } catch (e) {\n    // Not valid JSON, treat as regular file content\n    updateTaskDisplay(`Content of ${filePath}`, content.substring(0, 2000) + (content.length > 2000 ? '\\n... (truncated)' : '')); // Limit content size\n  }\n  \n  logMessage(`Read file: ${filePath}`);\n});

agentService.on('writeFileResponse', (response) => {
  const { filePath, success } = response;
  if (success) {
    logMessage(`Successfully wrote to file: ${filePath}`);
  } else {
    logMessage(`Failed to write to file: ${filePath}`);
  }
});

agentService.on('createFileResponse', (response) => {
  const { filePath, success } = response;
  if (success) {
    logMessage(`Successfully created file: ${filePath}`);
  } else {
    logMessage(`Failed to create file: ${filePath}`);
  }
});

agentService.on('createDirectoryResponse', (response) => {
  const { directoryPath, success } = response;
  if (success) {
    logMessage(`Successfully created directory: ${directoryPath}`);
  } else {
    logMessage(`Failed to create directory: ${directoryPath}`);
  }
});

agentService.on('commandOutput', (output) => {
  const { stdout, stderr } = output;
  if (stdout) {
    updateTaskDisplay('Command Output', stdout);
  }
  if (stderr) {
    logMessage(`Command error: ${stderr}`);
  }
  if (!stdout && !stderr) {
    logMessage('Command executed (no output)');
  }
});

// Task execution event handlers
agentService.on('task_execution_result', (result) => {
  logMessage(`Task execution result: ${result.status} for task ${result.taskId}`);
});

agentService.on('task_status_change', (statusChange) => {
  logMessage(`Task status changed: ${statusChange.status} for task ${statusChange.taskId}`);
});

agentService.on('delete_task_response', (response) => {
  if (response.success) {
    logMessage(`Successfully deleted task: ${response.path || response.taskId}`);
  } else {
    logMessage(`Failed to delete task: ${response.path || response.taskId}. Error: ${response.message}`);
  }
});

agentService.on('tasks_response', (response) => {
  const { tasks, total } = response;
  updateTaskDisplay(`Tasks (${total})`, formatTasks(tasks, `Tasks List (${total})`));
  logMessage(`Received ${total} tasks from agent`);
});

// Validate input length
function validateInput(input) {
  if (input.length > 1000) {
    logMessage('Error: Input too long (max 1000 characters)');
    return false;
  }
  return true;
}

// Handle command input
commandInput.on('submit', (data) => {
  if (!data.trim()) {
    commandInput.clearValue();
    return;
  }

  // Validate input length
  if (!validateInput(data)) {
    commandInput.clearValue();
    return;
  }

  logMessage(`> ${data}`);

  // Add command to history
  appState.commandHistory.push(data);
  if (appState.commandHistory.length > 100) { // Limit history size
    appState.commandHistory = appState.commandHistory.slice(-100);
  }
  appState.currentHistoryIndex = -1; // Reset history index after submitting

  // Parse command
  if (data.startsWith('!')) {
    const parts = data.slice(1).split(' ');
    const command = parts[0].toLowerCase();
    const args = parts.slice(1).join(' ');

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
            // Validate task statement
            if (args.length < 3) {
              logMessage('Error: Task statement too short');
              break;
            }
            
            // Simple task addition - in a real system, this would be more complex
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
            // Parse advanced search parameters
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
          // Display tasks based on filter
          if (args) {
            const filter = args.toLowerCase();
            let tasksToShow = [];
            let title = 'Tasks';
            
            if (filter === 'beliefs' || filter === 'belief') {
              tasksToShow = appState.beliefs;
              title = 'Beliefs';
              appState.taskFilter = 'belief';
            } else if (filter === 'goals' || filter === 'goal') {
              tasksToShow = appState.goals;
              title = 'Goals';
              appState.taskFilter = 'goal';
            } else if (filter === 'questions' || filter === 'question') {
              tasksToShow = appState.questions;
              title = 'Questions';
              appState.taskFilter = 'question';
            } else {
              logMessage(`Unknown filter: ${filter}. Use: beliefs, goals, or questions`);
              break;
            }
            
            updateTaskDisplay(title, formatTasks(tasksToShow, title));
            logMessage(`Displayed ${title.toLowerCase()}`);
          } else {
            // Show all tasks
            updateTaskDisplay('All Tasks', formatTasks(appState.tasks, 'All Tasks'));
            appState.taskFilter = 'all';
            logMessage('Displayed all tasks');
          }
          break;
        case 'filter':
          if (args) {
            const filter = args.toLowerCase();
            if (['all', 'belief', 'goal', 'question'].includes(filter)) {
              appState.taskFilter = filter;
              logMessage(`Set filter to: ${filter}`);
              
              // Display tasks based on new filter
              let tasksToShow = [];
              let title = 'Tasks';
              
              switch(filter) {
                case 'all':
                  tasksToShow = appState.tasks;
                  title = 'All Tasks';
                  break;
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
              }
              
              updateTaskDisplay(title, formatTasks(tasksToShow, title));
            } else {
              logMessage('Usage: !filter [all|belief|goal|question]');
            }
          } else {
            logMessage('Usage: !filter [all|belief|goal|question]');
          }
          break;
        case 'clear':
          taskBox.setContent('{bold}Tasks and Events{/bold}\nTasks will appear here');
          logBox.setContent('{bold}Log Messages{/bold}\nLog messages will appear here');
          logMessage('Cleared displays');
          appState.dashboardMode = false; // Exit dashboard mode when clearing
          break;
        case 'setconfig':
          logMessage('Configuration setting is not implemented in this version. Use Web UI for config changes.');
          break;
        case 'history':
          // Show command history
          if (appState.commandHistory.length > 0) {
            const historyDisplay = appState.commandHistory.map((cmd, idx) => 
              `  [${idx}] ${cmd}`
            ).join('\n');
            updateTaskDisplay(`Command History (${appState.commandHistory.length})`, historyDisplay);
            logMessage(`Showing ${appState.commandHistory.length} commands in history`);
          } else {
            logMessage('No command history available');
          }
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
          // Parse file path and content from args
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
          // Export tasks or knowledge to a file
          if (args) {
            const exportArgs = args.split(' ');
            const exportType = exportArgs[0].toLowerCase();
            const filePath = exportArgs[1] || `export_${Date.now()}.json`;
            
            let exportData = null;
            
            switch(exportType) {
              case 'tasks':
              case 'all':
                exportData = {
                  type: 'tasks',
                  timestamp: new Date().toISOString(),
                  data: appState.tasks
                };
                break;
              case 'beliefs':
                exportData = {
                  type: 'beliefs',
                  timestamp: new Date().toISOString(),
                  data: appState.beliefs
                };
                break;
              case 'goals':
                exportData = {
                  type: 'goals',
                  timestamp: new Date().toISOString(),
                  data: appState.goals
                };
                break;
              case 'questions':
                exportData = {
                  type: 'questions',
                  timestamp: new Date().toISOString(),
                  data: appState.questions
                };
                break;
              case 'config':
                exportData = {
                  type: 'config',
                  timestamp: new Date().toISOString(),
                  data: appState.config
                };
                break;
              case 'trace':
              case 'reasoning':
                exportData = {
                  type: 'reasoning_trace',
                  timestamp: new Date().toISOString(),
                  data: appState.reasoningTraces
                };
                break;
              default:
                logMessage('Usage: !export [tasks|beliefs|goals|questions|config|trace] [filename]');
                return;
            }
            
            agentService.sendMessage('writeFile', { 
              filePath: filePath, 
              content: JSON.stringify(exportData, null, 2) 
            });
            logMessage(`Exporting ${exportType} to: ${filePath}`);
          } else {
            logMessage('Usage: !export [tasks|beliefs|goals|questions|config|trace] [filename]');
          }
          break;
        case 'import':
          // Import tasks or knowledge from a file
          if (args) {
            agentService.sendMessage('readFile', { filePath: args });
            logMessage(`Importing from: ${args} (results will be shown when file is loaded)`);
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
          // Execute a specific task
          if (args) {
            const taskId = args;
            agentService.sendMessage('task_action', { 
              action: 'execute', 
              taskId: taskId 
            });
            logMessage(`Attempting to execute task ID: ${taskId}`);
          } else {
            logMessage('Usage: !execute <task_id>');
          }
          break;
        case 'pause':
          // Pause a specific task
          if (args) {
            const taskId = args;
            agentService.sendMessage('task_action', { 
              action: 'pause', 
              taskId: taskId 
            });
            logMessage(`Attempting to pause task ID: ${taskId}`);
          } else {
            logMessage('Usage: !pause <task_id>');
          }
          break;
        case 'delete':
        case 'del':
          // Delete a specific task
          if (args) {
            const taskId = args;
            agentService.sendMessage('delete_task', { taskId: taskId });
            logMessage(`Attempting to delete task ID: ${taskId}`);
          } else {
            logMessage('Usage: !delete <task_id>');
          }
          break;
        case 'list':
        case 'tasks':
          // List all tasks in the current filter
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
          break;
        case 'prioritize':
        case 'priority':
          // Update task priority
          const priorityArgs = args.split(' ');
          if (priorityArgs.length >= 2) {
            const taskId = priorityArgs[0];
            const newPriority = parseFloat(priorityArgs[1]);
            
            if (isNaN(newPriority) || newPriority < 0 || newPriority > 1) {
              logMessage('Error: Priority must be a number between 0 and 1');
              break;
            }
            
            agentService.sendMessage('update_task', { 
              taskId: taskId, 
              updates: { priority: newPriority } 
            });
            logMessage(`Attempting to set priority of task ${taskId} to ${newPriority}`);
          } else {
            logMessage('Usage: !prioritize <task_id> <priority_0_to_1>');
          }
          break;
        case 'sort':
          // Sort tasks by priority or other criteria
          if (args) {
            const sortCriteria = args.toLowerCase();
            let tasksToShow = [];
            let title = 'Tasks';
            
            switch(appState.taskFilter) {
              case 'belief':
                tasksToShow = [...appState.beliefs]; // Create a copy to sort
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
              break;
            }
            
            updateTaskDisplay(title, formatTasks(tasksToShow, title));
            logMessage(`Sorted ${title}`);
          } else {
            logMessage('Usage: !sort [priority|time]');
          }
          break;
        case 'dashboard':
        case 'dash':
          // Create a real-time dashboard view
          const dashboardContent = createDashboardContent();
          updateTaskDisplay('Real-Time Dashboard', dashboardContent);
          logMessage('Dashboard view activated');
          
          // Set a flag to enable auto-refresh
          appState.dashboardMode = true;
          break;
        case 'refresh':
          // Refresh the current view
          if (appState.dashboardMode) {
            const dashboardContent = createDashboardContent();
            updateTaskDisplay('Real-Time Dashboard', dashboardContent);
          } else {
            // Refresh the current filtered view
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
          }
          logMessage('View refreshed');
          break;
        case 'reasoning':
        case 'trace':
          // Display reasoning trace
          if (appState.reasoningTraces.length > 0) {
            const traceContent = formatReasoningTrace(appState.reasoningTraces);
            updateTaskDisplay(`Reasoning Trace (${appState.reasoningTraces.length} steps)`, traceContent);
            logMessage(`Displayed reasoning trace with ${appState.reasoningTraces.length} steps`);
          } else {
            logMessage('No reasoning traces available yet');
          }
          break;
        case 'cleartrace':
        case 'ctrace':
          // Clear reasoning traces
          appState.reasoningTraces = [];
          logMessage('Cleared reasoning traces');
          break;
        case 'notify':
        case 'notifications':
          // Display notifications
          if (appState.notifications.length > 0) {
            updateTaskDisplay('Notifications', formatNotifications(appState.notifications));
            logMessage(`Showing ${appState.notifications.length} notifications`);
          } else {
            logMessage('No notifications available');
          }
          break;
        case 'notifyclear':
        case 'clearnotify':
          // Clear notifications
          appState.notifications = [];
          logMessage('Cleared all notifications');
          break;
        case 'help':
          // Help is already displayed in the inputField
          logMessage('Available commands: !start, !stop, !reset, !add, !query, !view, !filter, !search, !stats, !config, !history, !read, !write, !ls, !mkdir, !create, !run, !execute, !pause, !delete, !list, !prioritize, !sort, !dashboard, !reasoning, !export, !import, !notify, !clearnotify, !cleartrace, !refresh, !clear, !help');
          break;
        default:
          logMessage(`Unknown command: ${command}. Type !help for available commands.`);
      }
    } catch (error) {
      logMessage(`Error processing command: ${error.message}`);
    }
  } else {
    // Treat as narsese input
    try {
      if (data.length < 3) {
        logMessage('Error: Narsese statement too short');
        commandInput.clearValue();
        return;
      }
      agentService.sendNarsese(data);
      logMessage(`Sent narsese: ${data}`);
    } catch (error) {
      logMessage(`Error sending narsese: ${error.message}`);
    }
  }

  commandInput.clearValue();
});

// Handle history navigation with up/down arrows
commandInput.key('up', function(ch, key) {
  if (appState.commandHistory.length === 0) return;
  
  if (appState.currentHistoryIndex === -1) {
    // Start from the most recent command
    appState.currentHistoryIndex = appState.commandHistory.length - 1;
  } else if (appState.currentHistoryIndex > 0) {
    // Go to previous command
    appState.currentHistoryIndex--;
  }
  
  if (appState.currentHistoryIndex >= 0) {
    commandInput.setValue(appState.commandHistory[appState.currentHistoryIndex]);
    commandInput.setScrollPerc(100);
  }
});

commandInput.key('down', function(ch, key) {
  if (appState.commandHistory.length === 0) return;
  
  if (appState.currentHistoryIndex < appState.commandHistory.length - 1) {
    // Go to next command
    appState.currentHistoryIndex++;
    
    if (appState.currentHistoryIndex < appState.commandHistory.length) {
      commandInput.setValue(appState.commandHistory[appState.currentHistoryIndex]);
    } else {
      // Clear input if we're beyond the history
      commandInput.clearValue();
      appState.currentHistoryIndex = -1;
    }
  } else {
    // Clear input if we're at the end of history
    commandInput.clearValue();
    appState.currentHistoryIndex = -1;
  }
  commandInput.setScrollPerc(100);
});

// Add keyboard shortcuts
screen.key(['C-c'], function(ch, key) {
  agentService.disconnect();
  return process.exit(0);
});

// Add common shortcuts
screen.key(['S'], function(ch, key) {
  agentService.getSystemStats();
  logMessage('Fetching system statistics...');
});

screen.key(['C'], function(ch, key) {
  agentService.getConfig();
  logMessage('Fetching agent configuration...');
});

screen.key(['R'], function(ch, key) {
  agentService.resetAgent();
  logMessage('Reset command sent');
});

screen.key(['space'], function(ch, key) {
  // Toggle agent status - start if stopped, stop if running
  // For now, just send start command
  agentService.startAgent();
  logMessage('Start command sent');
});

// Add shortcut to focus command input
screen.key(['C-j'], function(ch, key) {
  commandInput.focus();
  logMessage('Focused on command input');
});

// Add shortcut to clear displays
screen.key(['C-l'], function(ch, key) {
  taskBox.setContent('{bold}Tasks and Events{/bold}\nTasks will appear here');
  logBox.setContent('{bold}Log Messages{/bold}\nLog messages will appear here');
  logMessage('Cleared displays (Ctrl+L)');
  appState.dashboardMode = false; // Exit dashboard mode when clearing
});

// Handle quit key
screen.key(['q', 'Q'], () => {
  agentService.disconnect();
  return process.exit(0);
});

// Handle escape key
screen.key(['escape'], () => {
  commandInput.focus();
  logMessage('Returned focus to command input');
});

// Render the screen
screen.render();

logMessage('SeNARS TUI started. Type !help for commands.');
logMessage('Attempting to connect to agent service...');