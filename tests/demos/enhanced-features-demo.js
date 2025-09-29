// Category: Advanced Features
// Description: Demonstrates enhanced SeNARS features: LangChain/MCP integration, Multi-Agent coordination, and advanced tool orchestration.

import {runSystem} from '../../utils/runner.js';
import {createSystem, MultiAgentSystem} from '../../core/index.js';
import {parseTerm} from '../../core/parser/parse-utils.js';
import Task from '../../core/core/Task.js';
import {info} from '../../common/services/Logger.js';

/**
 * A unified demo that demonstrates the enhanced SeNARS features:
 * 1. LangChain/MCP Integration
 * 2. Multi-Agent System coordination
 * 3. Enhanced tool orchestration
 * 
 * Can be run as a standalone example or as a unit test.
 *
 * @param {object} options - Configuration options
 * @param {Function} [options.assertions] - Optional assertions for testing
 * @param {Function} [options.preCycleCallback] - Optional callback before cycles run
 * @param {Function} [options.postCycleCallback] - Optional callback after cycles run
 * @returns {Promise<System>} The system instance after running
 */
async function enhancedFeaturesDemo(options = {}) {
    // Initialize a system for the demo
    const system = await createSystem({
        LM: {
            LLM_PROVIDER: 'xenova',
        }
    });

    // Register various tools using the enhanced system
    system.actionExecutor.registerTool(
        'web_search',
        async (params) => {
            info(`Simulating web search for: ${params.query}`);
            return {
                results: [
                    `Top result for '${params.query}': Relevant information found`,
                    `Related result: Additional context`,
                    `Source: Simulated web search`
                ],
                query: params.query,
                timestamp: new Date().toISOString()
            };
        },
        {
            description: 'Perform a web search to find information',
            resourceRequirements: { cpu: 15, memory: 100 },
            safetyConstraints: [(params) => params.query && params.query.length > 2]
        }
    );

    system.actionExecutor.registerTool(
        'calculator',
        async (params) => {
            info(`Calculating: ${params.expression}`);
            try {
                // In a real system, we'd use a safer computation method
                const result = eval(params.expression);
                return { 
                    result, 
                    expression: params.expression,
                    calculationType: params.type || 'mathematical'
                };
            } catch (error) {
                return { error: error.message, expression: params.expression };
            }
        },
        {
            description: 'Perform mathematical calculations',
            resourceRequirements: { cpu: 5, memory: 10 },
            safetyConstraints: [(params) => params.expression && typeof params.expression === 'string']
        }
    );

    system.actionExecutor.registerTool(
        'data_analysis',
        async (params) => {
            info(`Analyzing data: ${params.datasetName}`);
            return {
                summary: `Analysis of ${params.datasetName} completed`,
                insights: ['Key insight 1', 'Key insight 2', 'Recommendation'],
                confidence: 0.85
            };
        },
        {
            description: 'Analyze data sets and provide insights',
            resourceRequirements: { cpu: 25, memory: 200 }
        }
    );

    const defaultOptions = {
        cycleCount: 2,
        preCycleCallback: async (system) => {
            // Execute a complex tool chain
            const researchChain = [
                {
                    name: 'web_search',
                    params: { query: 'benefits of renewable energy' }
                },
                {
                    name: 'calculator', 
                    params: { expression: '100 * 0.15' } // Calculate 15% of 100
                },
                {
                    name: 'data_analysis',
                    params: { datasetName: 'energy_consumption_2024' }
                }
            ];

            try {
                const results = await system.actionExecutor.executeToolChain(researchChain);
                info(`Tool chain execution completed with ${results.length} results`);
            } catch (error) {
                info(`Tool chain execution error: ${error.message}`);
            }
        },
        postCycleCallback: async (system) => {
            info("Demonstrating enhanced features...");

            // Multi-Agent System demonstration
            const multiAgentSystem = new MultiAgentSystem({
                FOCUS_SET_SIZE: 20,
                LM: { LLM_PROVIDER: 'xenova' }
            });

            // Create specialized agents
            const researcher = await multiAgentSystem.createSpecializedAgent('researcher');
            const planner = await multiAgentSystem.createSpecializedAgent('planner');
            const executor = await multiAgentSystem.createSpecializedAgent('executor');

            // Extract agent IDs
            const researcherId = Array.from(multiAgentSystem.agents.keys())[0];
            const plannerId = Array.from(multiAgentSystem.agents.keys())[1];
            const executorId = Array.from(multiAgentSystem.agents.keys())[2];

            // Start the multi-agent system for message passing
            await multiAgentSystem.start();

            // Create a complex goal task
            const complexGoalTerm = parseTerm('OptimizeEnergyConsumption');
            const complexGoal = new Task(complexGoalTerm, '!', { 
                frequency: 0.95, 
                confidence: 0.85 
            });

            // Coordinate agents to solve the goal
            try {
                const coordinationResult = await multiAgentSystem.coordinateForGoal(complexGoal);
                info(`Multi-agent coordination: ${coordinationResult.success ? 'SUCCESS' : 'FAILED'}`);
                info(`Agents involved: ${coordinationResult.results.length}`);
            } catch (coordinationError) {
                info(`Multi-agent coordination failed: ${coordinationError.message}`);
            }

            // Demonstrate direct task delegation
            const subtaskTerm = parseTerm('ResearchRenewableEnergyBenefits');
            const subtask = new Task(subtaskTerm, '!', { frequency: 0.8, confidence: 0.7 });

            try {
                const delegationResult = await multiAgentSystem.delegateTask(subtask, researcherId);
                info(`Task delegation: ${delegationResult.success ? 'SUCCESS' : 'FAILED'}`);
            } catch (delegationError) {
                info(`Task delegation failed: ${delegationError.message}`);
            }

            // Show resource management and execution tracking
            const toolHistory = system.actionExecutor.getToolExecutionHistory();
            info(`Total tool executions tracked: ${toolHistory.length}`);

            const availableResources = system.actionExecutor.getAvailableResources();
            info(`Available system resources: ${availableResources.length}`);

            // Cleanup
            await multiAgentSystem.stop();

            // Verify enhanced functionality
            const webSearchInfo = system.actionExecutor.getToolInfo('web_search');
            if (webSearchInfo) {
                info("✅ Enhanced tool registration and execution working");
            } else {
                info("❌ Enhanced tool system not working properly");
            }
        }
    };

    // Merge options with defaults
    const mergedOptions = {...defaultOptions, ...options};

    // Run the demo using the shared utility
    return await runSystem('Enhanced Features Demo', [], mergedOptions);
}

export default enhancedFeaturesDemo;

// This makes the demo runnable directly
if (import.meta.url.startsWith('file:')) {
    enhancedFeaturesDemo().catch(console.error);
}

// This makes it testable
// In your test file, you would import and call:
// await enhancedFeaturesDemo({ assertions: (system) => { /* your assertions */ } });