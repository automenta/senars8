import blessed from 'blessed';

export const createHeader = () => {
  return blessed.box({
    top: 0,
    left: 0,
    width: '100%',
    height: 1,
    content: ' SeNARS TUI - v1.0.0',
    style: {
      bg: 'blue',
      fg: 'white',
    },
  });
};