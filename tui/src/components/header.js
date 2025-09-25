import blessed from 'blessed';

/**
 * Creates the header component.
 * @returns {blessed.box} The header component.
 */
export function createHeader() {
  return blessed.box({
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
}