import chalk from 'chalk';

const log = (level, color, message, ...args) => {
    const timestamp = new Date().toISOString();
    console.log(`${chalk.gray(timestamp)} ${color(level.padEnd(5))} ${message}`, ...args);
};

export const info = (message, ...args) => log('INFO', chalk.blue, message, ...args);
export const warn = (message, ...args) => log('WARN', chalk.yellow, message, ...args);
export const error = (message, ...args) => log('ERROR', chalk.red, message, ...args);
export const debug = (message, ...args) => {
    if (process.env.DEBUG) {
        log('DEBUG', chalk.magenta, message, ...args);
    }
};