import blessed from 'blessed';

export const createCommandInput = () => {
  return blessed.textbox({
    bottom: 0,
    left: 0,
    width: '100%',
    height: 3,
    label: 'Command',
    border: {
      type: 'line',
    },
    style: {
      fg: 'white',
      bg: 'black',
      border: {
        fg: 'cyan',
      },
    },
    inputOnFocus: true,
  });
};