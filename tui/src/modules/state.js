// Application state
export const appState = {
  tasks: [],
  beliefs: [],
  goals: [],
  questions: [],
  config: null,
  stats: null,
  commandHistory: [],
  currentHistoryIndex: -1,
  taskFilter: 'all',
  searchQuery: '',
  statusUpdates: 0,
  newBeliefs: 0,
  newGoals: 0,
  reasoningSteps: 0,
  dashboardMode: false,
  notifications: [],
  reasoningTraces: [],
};

/**
 * Update the task list in the app state.
 * @param {object} task - The task to add.
 * @param {string} type - The type of the task (belief, goal, question).
 */
export function updateTaskList(task, type) {
  appState.tasks.push(task);

  if (type === 'belief' && task.punctuation === '.') {
    appState.beliefs.push(task);
  } else if (type === 'goal' && task.punctuation === '!') {
    appState.goals.push(task);
  } else if (type === 'question' && task.punctuation === '?') {
    appState.questions.push(task);
  }

  // Limit array sizes to prevent memory issues
  if (appState.tasks.length > 100) appState.tasks = appState.tasks.slice(-100);
  if (appState.beliefs.length > 100) appState.beliefs = appState.beliefs.slice(-100);
  if (appState.goals.length > 100) appState.goals = appState.goals.slice(-100);
  if (appState.questions.length > 100) appState.questions = appState.questions.slice(-100);
}

/**
 * Add a notification to the app state.
 * @param {string} message - The notification message.
 * @param {string} type - The type of notification (info, success, warning, error).
 * @returns {object} The created notification.
 */
export function addNotification(message, type = 'info') {
  const notification = createNotification(message, type);
  appState.notifications.push(notification);

  if (appState.notifications.length > 100) {
    appState.notifications = appState.notifications.slice(-100);
  }

  return notification;
}

/**
 * Create a notification object.
 * @param {string} message - The notification message.
 * @param {string} type - The type of notification.
 * @param {Date} timestamp - The timestamp of the notification.
 * @returns {object} The notification object.
 */
function createNotification(message, type = 'info', timestamp = new Date()) {
  const id = Date.now() + Math.random().toString(36).substr(2, 9);
  return {
    id,
    message,
    type,
    timestamp: timestamp instanceof Date ? timestamp : new Date(timestamp),
    read: false
  };
}