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
  searchQuery: ''
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
const inputField = blessed.textarea({
  top: 2,
  right: 0,
  width: '30%',
  height: '30%-2',
  content: '{bold}Available Commands:{/bold}\n\n{green}!start{/green} | Start agent\n{red}!stop{/red} | Stop agent\n{magenta}!reset{/magenta} | Reset agent\n{green}!add <task>{/green} | Add a task\n{yellow}!query <text>{/yellow} | Query agent\n{cyan}!view [type]{/cyan} | View tasks (beliefs/goals/questions)\n{cyan}!filter [type]{/cyan} | Filter tasks\n{blue}!search <query>{/blue} | Search tasks\n{magenta}!stats{/magenta} | System stats\n{yellow}!config{/yellow} | Configuration\n{green}!read <path>{/green} | Read a file\n{green}!write <path> <content>{/green} | Write to a file\n{green}!ls [path]{/green} | List directory\n{green}!mkdir <path>{/green} | Create directory\n{green}!create <path>{/green} | Create file\n{green}!run <cmd>{/green} | Run command\n{red}!clear{/red} | Clear displays\n!help | Show help',
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
const helpBox = blessed.box({
  top: '50%+3',
  right: 0,
  width: '30%',
  height: '50%-5',
  content: '{bold}Command Help:{/bold}\n\n' +
            '{underline}Agent Control:{/underline}\n' +
            '{green}!start{/green} - Start the agent cycling\n' +
            '{red}!stop{/red} - Stop the agent cycling\n' +
            '{magenta}!reset{/magenta} - Reset the agent\n\n' +
            '{underline}Task Management:{/underline}\n' +
            '{green}!add <task>{/green} - Add a new task\n' +
            '{yellow}!query <text>{/yellow} - Query the agent\n' +
            '{cyan}!view [type]{/cyan} - View tasks (beliefs/goals/questions)\n' +
            '{cyan}!filter [type]{/cyan} - Filter tasks\n' +
            '{blue}!search <query>{/blue} - Search tasks\n\n' +
            '{underline}System:{/underline}\n' +
            '{magenta}!stats{/magenta} - Show system stats\n' +
            '{yellow}!config{/yellow} - Show agent config\n' +
            '{green}!history{/green} - Show command history\n\n' +
            '{underline}File Operations:{/underline}\n' +
            '{green}!read <path>{/green} - Read a file\n' +
            '{green}!write <path> <content>{/green} - Write to a file\n' +
            '{green}!ls [path]{/green} - List directory contents\n' +
            '{green}!mkdir <path>{/green} - Create directory\n' +
            '{green}!create <path>{/green} - Create an empty file\n' +
            '{green}!run <cmd>{/green} - Execute a shell command\n\n' +
            '{underline}Utilities:{/underline}\n' +
            '{red}!clear{/red} - Clear displays\n\n' +
            '{underline}Examples:{/underline}\n' +
            '<cat> -> [animal].\n' +
            '<(animal & bird) --> [cat]!.\n' +
            'What is a cat?',
  tags: true,
  border: {
    type: 'line'
  },
  style: {
    fg: 'white',
    bg: 'black',
    border: {
      fg: 'blue'
    }
  },
  scrollable: true,
  alwaysScroll: true,
  mouse: true,
  keys: true,
  vi: true
});

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

// Helper function to format tasks for display
function formatTasks(tasks, title = 'Tasks') {
  if (!tasks || tasks.length === 0) {
    return `${title}: No items found`;
  }
  
  return `${title} (${tasks.length}):\n` + 
    tasks.slice(0, 50).map((task, index) => { // Limit to 50 items to avoid overwhelming the display
      const termKey = task.termKey || task.statement || task.id || 'Unknown';
      const priority = (task.priority || task.state?.priority || 0).toFixed(2);
      const tv = task.state?.truthValue;
      const truthValue = tv ? `TV(${tv.frequency.toFixed(2)}, ${tv.confidence.toFixed(2)})` : '';
      return `  [${index}] ${termKey} | P: ${priority} ${truthValue}`;
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

// Connect to the agent service
const agentService = new AgentCommunicationService('ws://localhost:8080');

// Set up event listeners for agent service
agentService.on('status', (status) => {
  if (status === 'connected') {
    updateStatus('Connected to agent service', 'green');
  } else if (status === 'disconnected') {
    updateStatus('Disconnected from agent service', 'red');
  } else if (status === 'failed') {
    updateStatus('Failed to connect to agent service', 'red');
  }
});

// Listen for various agent events
// Listen for various agent events
agentService.on('system_stats', (stats) => {
  appState.stats = stats;
  updateTaskDisplay('System Stats', formatSystemStats(stats));
});

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

agentService.on('status_update', (status) => {
  updateTaskDisplay('Status Update', JSON.stringify(status, null, 2));
});

agentService.on('add_belief', (belief) => {
  updateTaskList(belief, 'belief');
  updateTaskDisplay('New Belief', formatTasks([belief], 'New Belief'));
});

agentService.on('add_goal', (goal) => {
  updateTaskList(goal, 'goal');
  updateTaskDisplay('New Goal', formatTasks([goal], 'New Goal'));
});

agentService.on('add_question', (question) => {
  updateTaskList(question, 'question');
  updateTaskDisplay('New Question', formatTasks([question], 'New Question'));
});

agentService.on('task_added', (task) => {
  updateTaskDisplay('Task Added', JSON.stringify(task, null, 2));
});

agentService.on('reasoning_step', (step) => {
  updateTaskDisplay('Reasoning Step', JSON.stringify(step, null, 2));
});

agentService.on('logMessage', (logMsg) => {
  logMessage(`${logMsg.level}: ${logMsg.message}`);
});

agentService.on('connection_ack', (ack) => {
  logMessage(`Connection acknowledged: ${ack.message}`);
});

agentService.on('error', (error) => {
  logMessage(`Service error: ${error.message || error}`);
});

agentService.on('search_results', (results) => {
  updateTaskDisplay(`Search Results for "${results.query}"`, formatTasks(results.results, `Search Results (${results.total})`));
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

agentService.on('readFileResponse', (response) => {
  const { filePath, content } = response;
  updateTaskDisplay(`Content of ${filePath}`, content.substring(0, 2000) + (content.length > 2000 ? '\n... (truncated)' : '')); // Limit content size
  logMessage(`Read file: ${filePath}`);
});

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
            agentService.search(args);
            logMessage(`Searching for: ${args}`);
          } else {
            logMessage('Usage: !search <query>');
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
        case 'run':
          if (args) {
            agentService.sendMessage('runCommand', { command: args });
            logMessage(`Running command: ${args}`);
          } else {
            logMessage('Usage: !run <command>');
          }
          break;
        case 'help':
          // Help is already displayed in the inputField
          logMessage('Available commands: !start, !stop, !reset, !add, !query, !view, !filter, !search, !stats, !config, !history, !read, !write, !ls, !mkdir, !create, !run, !clear, !help');
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