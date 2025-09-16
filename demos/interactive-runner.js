#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import readline from 'readline';

const DEMO_DIR = path.dirname(new URL(import.meta.url).pathname);

const anside = {
    reset: "\x1b[0m",
    bright: "\x1b[1m",
    dim: "\x1b[2m",
    underscore: "\x1b[4m",
    fg: {
        red: "\x1b[31m",
        green: "\x1b[32m",
        yellow: "\x1b[33m",
        blue: "\x1b[34m",
        magenta: "\x1b[35m",
        cyan: "\x1b[36m",
    },
};

function getDemoFiles() {
    const files = fs.readdirSync(DEMO_DIR)
        .filter(file => file.endsWith('-demo.js') && file !== 'run-all.js' && file !== 'interactive-runner.js');

    const demos = files.map(file => {
        const content = fs.readFileSync(path.join(DEMO_DIR, file), 'utf-8');
        const descriptionMatch = content.match(/\/\/\s*Description:\s*(.*)/);
        const categoryMatch = content.match(/\/\/\s*Category:\s*(.*)/);
        return {
            file,
            description: descriptionMatch ? descriptionMatch[1].trim() : 'No description.',
            category: categoryMatch ? categoryMatch[1].trim() : 'Other',
        };
    });

    // Group demos by category
    return demos.reduce((acc, demo) => {
        (acc[demo.category] = acc[demo.category] || []).push(demo);
        return acc;
    }, {});
}

async function runDemo(demoFile) {
    try {
        console.log(`\n${anside.bright}${anside.fg.cyan}=== Running ${demoFile} ===${anside.reset}`);
        const demoPath = path.join(DEMO_DIR, demoFile);
        const demoModule = await import(demoPath);
        const demoFunction = demoModule.default || (Object.values(demoModule)[0]);
        await demoFunction();
        console.log(`\n${anside.bright}${anside.fg.cyan}=== Finished ${demoFile} ===${anside.reset}`);
    } catch (error) {
        console.error(`${anside.fg.red}Error running ${demoFile}:${anside.reset}`, error.message);
    }
}

function displayMenu(categorizedDemos) {
    console.clear();
    console.log(`${anside.bright}${anside.fg.cyan}╔═════════════════════════════════════════╗`);
    console.log(`║ ${anside.bright}${anside.fg.yellow} SeNARS Cognitive System Demo Runner ${anside.fg.cyan}║`);
    console.log(`╚═════════════════════════════════════════╝${anside.reset}`);

    let demoIndex = 1;
    const demoMap = new Map();

    for (const category in categorizedDemos) {
        console.log(`\n${anside.bright}${anside.fg.magenta}--- ${category} ---${anside.reset}`);
        categorizedDemos[category].forEach(demo => {
            console.log(`${anside.fg.yellow}${demoIndex}:${anside.reset} ${anside.bright}${demo.file}${anside.reset}`);
            console.log(`   ${anside.dim}${demo.description}${anside.reset}`);
            demoMap.set(demoIndex, demo.file);
            demoIndex++;
        });
    }

    console.log(`\n${anside.bright}${anside.fg.magenta}--- Other ---${anside.reset}`);
    console.log(`${anside.fg.yellow}0:${anside.reset} ${anside.bright}Run all demos${anside.reset}`);
    console.log(`${anside.fg.red}q:${anside.reset} ${anside.bright}Exit${anside.reset}`);

    return demoMap;
}


async function main() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    let keepRunning = true;
    while (keepRunning) {
        const categorizedDemos = getDemoFiles();
        const demoFiles = Object.values(categorizedDemos).flat();

        if (demoFiles.length === 0) {
            console.log("No demos found.");
            break;
        }

        const demoMap = displayMenu(categorizedDemos);

        const answer = await new Promise(resolve => {
            rl.question(`\n${anside.fg.green}Enter your choice: ${anside.reset}`, resolve);
        });

        if (answer.toLowerCase() === 'q') {
            keepRunning = false;
            continue;
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
            const demoFile = demoMap.get(choice);
            if (demoFile) {
                await runDemo(demoFile);
            } else {
                console.log(anside.fg.red + "Invalid choice. Please try again." + anside.reset);
                await new Promise(resolve => setTimeout(resolve, 1500));
                continue;
            }
        }

        await new Promise(resolve => {
            rl.question(`\n${anside.fg.green}Press Enter to continue...${anside.reset}`, resolve);
        });
    }

    rl.close();
    console.log(`\n${anside.fg.cyan}Exiting Demo Runner. Goodbye!${anside.reset}`);
}

if (import.meta.url.startsWith('file:') && process.argv[1] === path.basename(import.meta.url.pathname)) {
    main().catch(err => {
        console.error("An unexpected error occurred:", err);
        process.exit(1);
    });
}

export {
    main,
    getDemoFiles,
    runDemo
};
