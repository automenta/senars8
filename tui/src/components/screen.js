import blessed from 'blessed';

/**
 * Creates the main screen object for the TUI.
 * @returns {blessed.screen} The main screen object.
 */
export function createScreen() {
  const screen = blessed.screen({
    smartCSR: true,
    title: 'SeNARS TUI - Self-Evolving Neuromorphic-Adaptive Reasoning System',
    fullUnicode: true
  });

  return screen;
}