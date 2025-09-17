import fs from 'fs/promises';

const inputFile = 'input.txt';
const outputFile = 'output.txt';
const initialContent = 'Hello, SeNARS!';
const modifiedContent = `${initialContent} This is a test.`;

export default {
    name: 'Read, Modify, and Write File',
    async run({agent, metrics, assert}) {
        // Setup: Create the input file
        await fs.writeFile(inputFile, initialContent);

        // Register tools for this benchmark
        agent.addTool({
            name: 'readFile',
            description: 'Reads the content of a file.',
            parameters: {
                type: 'object',
                properties: {
                    path: {type: 'string', description: 'The path to the file.'},
                },
                required: ['path'],
            },
            handler: async ({path}) => {
                metrics.steps.push({name: 'readFile', path});
                return await fs.readFile(path, 'utf-8');
            },
        });

        agent.addTool({
            name: 'writeFile',
            description: 'Writes content to a file.',
            parameters: {
                type: 'object',
                properties: {
                    path: {type: 'string', description: 'The path to the file.'},
                    content: {type: 'string', description: 'The content to write.'},
                },
                required: ['path', 'content'],
            },
            handler: async ({path, content}) => {
                metrics.steps.push({name: 'writeFile', path, content});
                await fs.writeFile(path, content);
                return {success: true};
            },
        });

        try {
            // Start the MCP interaction
            await agent.mcp.start('Read the file "input.txt", modify its content, and write to "output.txt"');

            // Step 1: Read the file
            const readGoal = `(*, readFile, "${inputFile}")`;
            const readAction = await agent.decideNextAction(readGoal);
            assert.ok(readAction, 'Agent should decide to read the file.');
            metrics.agentInternal.reasoningCycles++;
            const readResult = await agent.executeAction(readAction);
            assert.strictEqual(readResult, initialContent, 'Read content should match initial content');

            // Step 2: Write the modified file
            const writeGoal = `(*, writeFile, "${outputFile}", "${modifiedContent}")`;
            const writeAction = await agent.decideNextAction(writeGoal);
            assert.ok(writeAction, 'Agent should decide to write the file.');
            metrics.agentInternal.reasoningCycles++;
            await agent.executeAction(writeAction);

            // Verify the final output
            const finalContent = await fs.readFile(outputFile, 'utf-8');
            assert.strictEqual(finalContent, modifiedContent, 'Final content should match modified content');

            metrics.performance.taskCompletionRate = 1;
            metrics.agentInternal.knowledgeBaseSize = agent.system.memory.getAllTasks().length;
            metrics.tokenomics.inputTokens = 10; // Placeholder
            metrics.tokenomics.outputTokens = 20; // Placeholder
            metrics.tokenomics.totalTokens = 30; // Placeholder

        } finally {
            // Cleanup
            await agent.mcp.end('Benchmark finished.');
            try {
                await fs.unlink(inputFile);
            } catch (e) { /* ignore */
            }
            try {
                await fs.unlink(outputFile);
            } catch (e) { /* ignore */
            }
        }
    },
};
