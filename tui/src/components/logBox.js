import blessed from 'blessed';

export const createLogBox = () => {
  return blessed.log({
    top: 5,
    left: 0,
    width: '100%',
    height: '100%-8',
    label: 'Log',
    border: {
      type: 'line',
    },
    style: {
      fg: 'white',
      border: {
        fg: '#f0f0f0',
      },
    },
    scrollable: true,
    alwaysScroll: true,
    scrollbar: {
      ch: ' ',
      track: {
        bg: 'yellow',
      },
      style: {
        inverse: true,
      },
    },
  });
};