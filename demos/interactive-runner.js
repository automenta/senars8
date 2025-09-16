#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import readline from 'readline';

const DEMO_DIR = path.dirname(new URL(import.meta.url).pathname);

function getDemoFiles() {
    const files = fs.readdirSync(DEMO_DIR)
        .filter(file => file.endsWith('-demo.js') && file !== 'run-all.js' && file !== 'interactive-runner.js');

    return files.map(file => {
        const content = fs.readFileSync(path.join(DEMO_DIR, file), 'utf-8');
        const match = content.match(/\/\/\s*Description:\s*(.*)/);
        const description = match ? match[1].trim() : 'No description available.';
        return {
            file,
            description
        };
    });
}

async function runDemo(demoFile) {
    try {
        console.log(`\n=== Running ${demoFile} ===`);
        const demoModule = await import(path.join(DEMO_DIR, demoFile));
        const demo = demoModule.default || demoModule;
        await demo();
        console.log(`\n=== Finished ${demoFile} ===`);
    } catch (error) {
        console.error(`Error running ${demoFile}:`, error.message);
    }
}

const anside = {
    reset: "\x1b[0m",
    bright: "\x1b[1m",
    dim: "\x1b[2m",
    underscore: "\x1b[4m",
    blink: "\x1b[5m",
    reverse: "\x1b[7m",
    hidden: "\x1b[8m",

    fg: {
        black: "\x1b[30m",
        red: "\x1b[31m",
        green: "\x1b[32m",
        yellow: "\x1b[33m",
        blue: "\x1b[34m",
        magenta: "\x1b[35m",
        cyan: "\x1b[36m",
        white: "\x1b[37m",
    },
    bg: {
        black: "\x1b[40m",
        red: "\x1b[41m",
        green: "\x1b[42m",
        yellow: "\x1b[43m",
        blue: "\x1b[44m",
        magenta: "\x1b[45m",
        cyan: "\x1b[46m",
        white: "\x1b[47m",
    }
};

function displayMenu(demoFiles) {
    console.clear();
    console.log(anside.bright + anside.fg.cyan + "=== SeNARS Cognitive System Demo Runner ===" + anside.reset);
    console.log(anside.dim + "Select a demo to run:" + anside.reset);

    demoFiles.forEach((demo, index) => {
        console.log(`${anside.fg.yellow}${index + 1}:${anside.reset} ${anside.bright}${demo.file}${anside.reset} - ${anside.dim}${demo.description}${anside.reset}`);
    });

    console.log(`${anside.fg.yellow}0:${anside.reset} ${anside.bright}Run all demos${anside.reset}`);
    console.log(`${anside.fg.red}q:${anside.reset} ${anside.bright}Exit${anside.reset}`);
}

async function main() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    let keepRunning = true;
    while (keepRunning) {
        const demoFiles = getDemoFiles();
        if (demoFiles.length === 0) {
            console.log("No demos found.");
            keepRunning = false;
            break;
        }

        displayMenu(demoFiles);

        const answer = await new Promise(resolve => {
            rl.question(`\n${anside.fg.green}Enter your choice: ${anside.reset}`, resolve);
        });

        if (answer.toLowerCase() === 'q') {
            keepRunning = false;
            break;
        }

        const choice = parseInt(answer, 10);

        if (isNaN(choice) || choice < 0 || choice > demoFiles.length) {
            console.log(anside.fg.red + "Invalid choice. Please try again." + anside.reset);
            await new Promise(resolve => setTimeout(resolve, 1500));
            continue;
        }

        if (choice === 0) {
            for (const demo of demoFiles) {
                await runDemo(demo.file);
            }
        } else {
            await runDemo(demoFiles[choice - 1].file);
        }

        await new Promise(resolve => {
            rl.question(`\n${anside.fg.green}Press Enter to continue...${anside.reset}`, resolve);
        });
    }

    rl.close();
    console.log(anside.fg.cyan + "Exiting Demo Runner. Goodbye!" + anside.reset);
}

if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(err => {
        console.error("An unexpected error occurred:", err);
        process.exit(1);
    });
}

export {main, getDemoFiles, runDemo};
