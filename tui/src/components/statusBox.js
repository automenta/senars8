import blessed from 'blessed';

/**
 * Creates the status box component.
 * @returns {blessed.box} The status box component.
 */
export function createStatusBox() {
  return blessed.box({
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
}