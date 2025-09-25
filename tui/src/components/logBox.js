import blessed from 'blessed';

/**
 * Creates the log box component.
 * @returns {blessed.box} The log box component.
 */
export function createLogBox() {
  return blessed.box({
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
}