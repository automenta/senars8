export default {
    name: 'Simple Tool Use',
    async run({ agent, metrics, assert }) {
        const tool = {
            name: 'greet',
            description: 'Generates a greeting for a given name.',
            parameters: {
                type: 'object',
                properties: {
                    name: { type: 'string', description: 'The name of the person to greet.' },
                },
                required: ['name'],
            },
            handler: async ({ name }) => {
                metrics.steps.push({ name: 'greet', name });
                return `Hello, ${name}!`;
            },
        };

        agent.addTool(tool);

        const goal = '(*, greet, "World")';
        await agent.mcp.start('Greet the world.');

        const plan = await agent.createPlan(goal);
        assert.ok(plan, 'Agent should be able to create a plan.');
        assert.strictEqual(plan.steps.length, 1, 'Plan should have one step.');
        metrics.agentInternal.reasoningCycles++;

        const step = plan.steps[0];
        assert.strictEqual(step.tool, 'greet', 'The tool in the plan should be "greet".');

        const result = await agent.executeAction(step);
        assert.strictEqual(result, 'Hello, World!', 'The result of the greeting should be correct.');

        metrics.performance.taskCompletionRate = 1;
        metrics.agentInternal.knowledgeBaseSize = agent.system.memory.getAllTasks().length;
        metrics.tokenomics.inputTokens = 5; // Placeholder
        metrics.tokenomics.outputTokens = 10; // Placeholder
        metrics.tokenomics.totalTokens = 15; // Placeholder

        await agent.mcp.end('Benchmark finished.');
    },
};
