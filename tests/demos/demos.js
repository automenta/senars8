#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import {URL} from 'url';
import anside from '../../common/anside.js';
import {printBanner} from '../../common/ui.js';

const DEMO_DIR = path.dirname(new URL(import.meta.url).pathname);

function getDemoFiles() {
    const files = fs.readdirSync(DEMO_DIR)
        .filter(file => file.endsWith('-demo.js') && file !== 'run-all.js' && file !== 'demos.js');

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
    const categorized = demos.reduce((acc, demo) => {
        (acc[demo.category] = acc[demo.category] || []).push(demo);
        return acc;
    }, {});

    // Sort demos within each category
    for (const category in categorized) {
        categorized[category].sort((a, b) => a.file.localeCompare(b.file));
    }

    return categorized;
}

async function runDemo(demoFile) {
    try {
        printBanner(`Running: ${demoFile}`, {
            width: 80
        });
        const demoPath = path.join(DEMO_DIR, demoFile);
        const demoModule = await import(demoPath);
        const demoFunction = demoModule.default || (Object.values(demoModule)[0]);
        await demoFunction();
        printBanner(`Finished: ${demoFile}`, {
            width: 80,
            isFooter: true
        });
    } catch (error) {
        console.error(`${anside.fg.red}Error running ${demoFile}:${anside.reset}`, error.message);
    }
}

function displayMenu(categorizedDemos) {
    console.clear();
    printBanner('SeNARS Cognitive System Demo Runner', {
        width: 80
    });

    let demoIndex = 1;
    const demoMap = new Map();
    const categories = Object.keys(categorizedDemos).sort();

    for (const category of categories) {
        console.log(`\n${anside.bright}${anside.fg.magenta}--- ${category} ---${anside.reset}`);
        const demos = categorizedDemos[category];
        demos.forEach(demo => {
            const shortFile = demo.file.replace('-demo.js', '');
            const description = demo.description.length > 50 ? demo.description.substring(0, 47) + '...' : demo.description;
            console.log(`${anside.fg.yellow}${String(demoIndex).padEnd(2)}:${anside.reset} ${anside.bright}${shortFile.padEnd(35)}${anside.reset} ${anside.fg.cyan}${description}${anside.reset}`);
            demoMap.set(demoIndex, {action: 'run', file: demo.file});
            demoIndex++;
        });
        console.log(`${anside.fg.yellow}${String(demoIndex).padEnd(2)}:${anside.reset} ${anside.bright}Run all in this category${anside.reset}`);
        demoMap.set(demoIndex, {action: 'run_category', category: category});
        demoIndex++;
    }

    console.log(`\n${anside.bright}${anside.fg.magenta}--------------------------------------------------------------------------------${anside.reset}`);
    console.log(`${anside.fg.yellow} a:${anside.reset} ${anside.bright}Run all demos${anside.reset}`);
    console.log(`${anside.fg.yellow} q:${anside.reset} ${anside.bright}Exit${anside.reset}`);

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
        const demoMap = displayMenu(categorizedDemos);

        const answer = await new Promise(resolve => {
            rl.question(`\n${anside.fg.green}Enter your choice: ${anside.reset}`, resolve);
        });

        if (answer.toLowerCase() === 'q') {
            keepRunning = false;
            continue;
        }

        if (answer.toLowerCase() === 'a') {
            for (const demo of demoFiles) {
                await runDemo(demo.file);
            }
            await new Promise(resolve => {
                rl.question(`\n${anside.fg.green}Press Enter to continue...${anside.reset}`, resolve);
            });
            continue;
        }

        const choice = parseInt(answer, 10);

        if (isNaN(choice) || !demoMap.has(choice)) {
            console.log(anside.fg.red + "Invalid choice. Please try again." + anside.reset);
            await new Promise(resolve => setTimeout(resolve, 1500));
            continue;
        }

        const selected = demoMap.get(choice);
        if (selected.action === 'run') {
            await runDemo(selected.file);
        } else if (selected.action === 'run_category') {
            const demosToRun = categorizedDemos[selected.category];
            for (const demo of demosToRun) {
                await runDemo(demo.file);
            }
        }

        await new Promise(resolve => {
            rl.question(`\n${anside.fg.green}Press Enter to continue...${anside.reset}`, resolve);
        });
    }

    rl.close();
    console.log(`\n${anside.fg.cyan}Exiting Demo Runner. Goodbye!${anside.reset}`);
}

if (import.meta.url.startsWith('file:') && path.basename(process.argv[1]) === path.basename(new URL(import.meta.url).pathname)) {
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
