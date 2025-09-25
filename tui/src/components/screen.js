import blessed from 'blessed';

export const createScreen = () => {
  return blessed.screen({
    smartCSR: true,
    title: 'SeNARS TUI',
  });
};