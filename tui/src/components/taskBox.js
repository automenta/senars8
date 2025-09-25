import blessed from 'blessed';

/**
 * Creates the task box component.
 * @returns {blessed.box} The task box component.
 */
export function createTaskBox() {
  return blessed.box({
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
}