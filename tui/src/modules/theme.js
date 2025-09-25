const themes = {
  default: {
    header: { fg: 'white', bg: 'blue' },
    status: { fg: 'white', bg: 'red' },
    task: { fg: 'cyan', bg: 'black', border: { fg: 'green' } },
    log: { fg: 'white', bg: 'black', border: { fg: 'yellow' } },
    input: { fg: 'green', bg: 'black', border: { fg: 'green' }, focus: { border: { fg: 'yellow' } } },
    command: { fg: 'white', bg: 'black', border: { fg: 'cyan' }, focus: { border: { fg: 'yellow' } } },
    help: { fg: 'white', bg: 'black', border: { fg: 'blue' } },
  },
  light: {
    header: { fg: 'black', bg: 'white' },
    status: { fg: 'black', bg: 'yellow' },
    task: { fg: 'blue', bg: 'white', border: { fg: 'blue' } },
    log: { fg: 'black', bg: 'white', border: { fg: 'green' } },
    input: { fg: 'blue', bg: 'white', border: { fg: 'blue' }, focus: { border: { fg: 'green' } } },
    command: { fg: 'black', bg: 'white', border: { fg: 'blue' }, focus: { border: { fg: 'green' } } },
    help: { fg: 'black', bg: 'white', border: { fg: 'blue' } },
  },
  dark: {
    header: { fg: 'white', bg: 'black' },
    status: { fg: 'white', bg: 'red' },
    task: { fg: 'green', bg: 'black', border: { fg: 'green' } },
    log: { fg: 'yellow', bg: 'black', border: { fg: 'yellow' } },
    input: { fg: 'cyan', bg: 'black', border: { fg: 'cyan' }, focus: { border: { fg: 'yellow' } } },
    command: { fg: 'white', bg: 'black', border: { fg: 'cyan' }, focus: { border: { fg: 'yellow' } } },
    help: { fg: 'green', bg: 'black', border: { fg: 'green' } },
  }
};

let currentTheme = 'default';

export function applyTheme(components, themeName) {
  const theme = themes[themeName];
  if (!theme) {
    return `Theme "${themeName}" not found.`;
  }

  const { header, statusBox, taskBox, logBox, inputField, commandInput, helpBox, screen } = components;

  header.style = { ...header.style, ...theme.header };
  statusBox.style = { ...statusBox.style, ...theme.status };
  taskBox.style = { ...taskBox.style, ...theme.task };
  logBox.style = { ...logBox.style, ...theme.log };
  inputField.style = { ...inputField.style, ...theme.input };
  commandInput.style = { ...commandInput.style, ...theme.command };
  helpBox.style = { ...helpBox.style, ...theme.help };

  currentTheme = themeName;
  screen.render();
  return `Theme set to "${themeName}".`;
}

export function getCurrentTheme() {
  return currentTheme;
}

export function getTheme(themeName) {
  return themes[themeName];
}

export function getAvailableThemes() {
  return Object.keys(themes);
}