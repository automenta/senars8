import blessed from 'blessed';

export const createStatusBox = () => {
  return blessed.box({
    top: 1,
    left: 0,
    width: '50%',
    height: 4,
    label: 'Status',
    border: {
      type: 'line',
    },
    style: {
      fg: 'white',
      border: {
        fg: '#f0f0f0',
      },
    },
  });
};