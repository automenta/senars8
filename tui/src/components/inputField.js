import blessed from 'blessed';

export const createInputField = () => {
  return blessed.textarea({
    bottom: 0,
    left: 0,
    width: '100%',
    height: 3,
    label: 'Input',
    border: {
      type: 'line',
    },
    style: {
      fg: 'white',
      bg: 'black',
      border: {
        fg: '#f0f0f0',
      },
    },
    inputOnFocus: true,
  });
};