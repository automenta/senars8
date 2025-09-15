import Agent from '../src/agent/Agent.js';
import fs from 'fs/promises';
import assert from 'assert';
import { parseTerm } from '../src/parser/narseseParser.js';
import Task from '../src/core/Task.js';

const agent = new Agent();

/**
 * A generic function to run an evaluation test case.
 * @param {string} description - A description of the test.
 * @param {Function} setup - An async function to set up the test conditions.
 * @param {Function} verify - An async function to verify the outcome.
 */
async function runEvaluation(description, setup, verify) {
    console.log(`\n--- Running Evaluation: ${description} ---`);
    const cleanupCallbacks = [];
    const addCleanup = (callback) => cleanupCallbacks.push(callback);

    try {
        await setup(addCleanup);
        await verify(addCleanup);
        console.log(`--- ✅ SUCCESS: ${description} ---`);
    } catch (error) {
        console.error(`--- ❌ FAILED: ${description} ---`);
        console.error(error);
        process.exit(1); // Exit with error code on failure
    } finally {
        console.log('Running cleanup...');
        for (const callback of cleanupCallbacks.reverse()) {
            try {
                await callback();
            } catch (err) {
                console.error('Error during cleanup:', err);
            }
        }
    }
}

async function main() {
    console.log('Initializing agent...');
    await agent.initialize();
    console.log('Agent initialized.');

    // Setup File I/O capabilities
    agent.addAction('readFile', async (action) => {
        const [filePathTerm] = action.parameters;
        const filePath = filePathTerm.key.replace(/"/g, '');
        console.log(`Agent action: readFile(${filePath})`);
        const content = await fs.readFile(filePath, 'utf-8');
        const belief = new Task(parseTerm(`(${filePathTerm.key} has_content "${content}")`), '.');
        await agent.system.addTasks([belief]);
        return { success: true, content };
    });

    agent.addAction('writeFile', async (action) => {
        const [filePathTerm, contentTerm] = action.parameters;
        const filePath = filePathTerm.key.replace(/"/g, '');
        const content = contentTerm.key.replace(/"/g, '');
        console.log(`Agent action: writeFile(${filePath}, "${content}")`);
        await fs.writeFile(filePath, content);
        return { success: true };
    });
    console.log('Core I/O actions registered.');

    // The harness is now ready to be used.
    await runReadModifyWriteBenchmark();
}

async function runReadModifyWriteBenchmark() {
    const inputFile = 'input.txt';
    const outputFile = 'output.txt';
    const initialContent = 'Hello, SeNARS!';
    const modifiedContent = `${initialContent} This is a test.`;

    await runEvaluation(
        'Read, Modify, and Write File',
        async (addCleanup) => {
            // Setup: Create the input file
            await fs.writeFile(inputFile, initialContent);
            addCleanup(async () => {
                try { await fs.unlink(inputFile); } catch (e) { /* ignore */ }
            });
            addCleanup(async () => {
                try { await fs.unlink(outputFile); } catch (e) { /* ignore */ }
            });
        },
        async () => {
            // Step 1: Read the file
            console.log('Giving agent goal to read file...');
            const readResult = await agent.achieve(`(*, readFile, "${inputFile}")`);
            assert.strictEqual(readResult.success, true, 'Read action should succeed');
            assert.strictEqual(readResult.content, initialContent, 'Read content should match initial content');
            console.log('Agent successfully read the file.');

            // Step 2: Write the modified file
            console.log('Giving agent goal to write modified file...');
            const writeResult = await agent.achieve(`(*, writeFile, "${outputFile}", "${modifiedContent}")`);
            assert.strictEqual(writeResult.success, true, 'Write action should succeed');
            console.log('Agent successfully wrote the file.');

            // Verify the final output
            const finalContent = await fs.readFile(outputFile, 'utf-8');
            assert.strictEqual(finalContent, modifiedContent, 'Final content should match modified content');
        }
    );
}

main().catch(error => {
    console.error('A critical error occurred in the main execution block:', error);
    process.exit(1);
});
