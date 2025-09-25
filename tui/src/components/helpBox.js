import blessed from 'blessed';

export const createHelpBox = () => {
  const helpText = `
  SeNARS TUI Commands:
  - !help: Show/hide this help message
  - !connect: Connect to the agent service
  - !disconnect: Disconnect from the agent service
  - Any other input is sent to the NARS agent.

  Global Keys:
  - q, Q, C-c: Quit the TUI
  - escape: Focus command input
  `;

  return blessed.box({
    top: 'center',
    left: 'center',
    width: '50%',
    height: '50%',
    label: 'Help',
    content: helpText,
    border: {
      type: 'line',
    },
    style: {
      fg: 'white',
      border: {
        fg: 'green',
      },
    },
    hidden: true,
  });
};