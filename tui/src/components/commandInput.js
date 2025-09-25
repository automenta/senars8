import blessed from 'blessed';

/**
 * Creates the command input component.
 * @returns {blessed.textbox} The command input component.
 */
export function createCommandInput() {
  return blessed.textbox({
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
}