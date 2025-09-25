import blessed from 'blessed';

let screen, header, statusBox, taskBox, logBox, inputField, commandInput, helpBox;

export function setScreen(s) { screen = s; }
export function setHeader(h) { header = h; }
export function setStatusBox(s) { statusBox = s; }
export function setTaskBox(t) { taskBox = t; }
export function setLogBox(l) { logBox = l; }
export function setInputField(i) { inputField = i; }
export function setCommandInput(c) { commandInput = c; }
export function setHelpBox(h) { helpBox = h; }

/**
 * Update the status display.
 * @param {string} text - The text to display.
 * @param {string} color - The background color.
 */
export function updateStatus(text, color = 'yellow') {
  if (statusBox) {
    statusBox.setContent(text);
    statusBox.style.bg = color;
    screen.render();
  }
}

/**
 * Update the task display.
 * @param {string} title - The title of the box.
 * @param {string} content - The content to display.
 */
export function updateTaskDisplay(title, content) {
  if (taskBox) {
    taskBox.setContent(`${title}:\n${content}`);
    screen.render();
  }
}

/**
 * Add a message to the log box.
 * @param {string} message - The message to log.
 */
export function logMessage(message) {
  if (logBox) {
    const timestamp = new Date().toISOString().slice(11, 19);
    logBox.pushLine(`[${timestamp}] ${message}`);
    logBox.setScrollPerc(100);
    screen.render();
  }
}

/**
 * Clears the command input field.
 */
export function clearCommandInput() {
    if (commandInput) {
        commandInput.clearValue();
    }
}