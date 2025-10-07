#!/usr/bin/env node
/**
 * SeNARS Debugging Utility
 * Provides helpful debugging functions for development
 */

import {execa} from 'execa';
import chalk from 'chalk';
import config from './config.js';
import logger from './coreagent/utils/logger.js';

const log = logger.create('debug-util');

const commands = {
    ports: async () => {
        console.log(chalk.blue('Checking port availability...'));
        console.log(chalk.green(`UI Port (${config.uiPort}):`), `http://localhost:${config.uiPort}`);
        console.log(chalk.green(`WebSocket Port (${config.wsPort}):`), `ws://localhost:${config.wsPort}`);

        // Check if ports are in use
        try {
            const {stdout} = await execa('lsof', [`-i:${config.uiPort}`]);
            if (stdout) {
                console.log(chalk.red(`⚠ Port ${config.uiPort} is in use`));
                console.log(stdout);
            } else {
                console.log(chalk.green(`✓ Port ${config.uiPort} is available`));
            }
        } catch (e) {
            console.log(chalk.green(`✓ Port ${config.uiPort} is available`));
        }

        try {
            const {stdout} = await execa('lsof', [`-i:${config.wsPort}`]);
            if (stdout) {
                console.log(chalk.red(`⚠ Port ${config.wsPort} is in use`));
                console.log(stdout);
            } else {
                console.log(chalk.green(`✓ Port ${config.wsPort} is available`));
            }
        } catch (e) {
            console.log(chalk.green(`✓ Port ${config.wsPort} is available`));
        }
    },

    env: async () => {
        console.log(chalk.blue('Environment Configuration:'));
        console.log(chalk.green('UI Port:'), config.uiPort);
        console.log(chalk.green('WebSocket Port:'), config.wsPort);
        console.log(chalk.green('Development Mode:'), config.devMode);
        console.log(chalk.green('Log Level:'), config.logLevel);
        console.log(chalk.green('Hot Reload:'), config.hotReload);
        console.log(chalk.green('Debug Mode:'), config.debugMode);
        console.log(chalk.green('Verbose Logging:'), config.verboseLogging);
    },

    processes: async () => {
        console.log(chalk.blue('Running SeNARS Processes:'));
        try {
            const {stdout} = await execa('ps', ['aux']);
            const senarsProcesses = stdout.split('\n').filter(line =>
                line.includes('senars') || line.includes('node') &&
                (line.includes('main.js') || line.includes('integrated-web-runner.js') ||
                    line.includes('tui') || line.includes('agent'))
            );

            if (senarsProcesses.length > 0) {
                console.log(chalk.yellow('Active processes:'));
                senarsProcesses.forEach(process => {
                    console.log(chalk.yellow(`  ${process}`));
                });
            } else {
                console.log(chalk.green('No active SeNARS processes found'));
            }
        } catch (e) {
            console.log(chalk.red('Error checking processes:', e.message));
        }
    },

    help: () => {
        console.log(chalk.blue('SeNARS Debugging Utility'));
        console.log(chalk.green('Usage:'));
        console.log('  node debug-util.js ports    - Check port availability');
        console.log('  node debug-util.js env      - Show environment configuration');
        console.log('  node debug-util.js processes - Show running processes');
        console.log('  node debug-util.js all      - Run all checks');
    }
};

const runCommand = async (cmd) => {
    if (commands[cmd]) {
        await commands[cmd]();
    } else if (cmd === 'all') {
        for (const [name, fn] of Object.entries(commands)) {
            if (name !== 'help') {
                console.log(chalk.blue(`\n=== ${name.toUpperCase()} ===`));
                await fn();
            }
        }
    } else {
        commands.help();
    }
};

// Run the command based on arguments
const cmd = process.argv[2] || 'help';
runCommand(cmd).catch(error => {
    log.error('Debug utility error:', error);
    process.exit(1);
});