import blessed from 'blessed';

export const createTaskBox = () => {
  return blessed.box({
    top: 1,
    left: '50%',
    width: '50%',
    height: 4,
    label: 'Tasks',
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