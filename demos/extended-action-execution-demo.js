// Description: An extended demonstration of the system's action execution capabilities.
const { runDemo } = require('./demo-utils');

async function extendedActionExecutionDemo() {
    const taskDefs = [
        // Simple atomic goal
        {
            termKey: 'print_hello_world',
            punctuation: '!',
            truthValue: {
                frequency: 1.0,
                confidence: 0.9
            }
        },

        // Compound action goal
        {
            termKey: '(&, create, file, test.txt)',
            punctuation: '!',
            truthValue: {
                frequency: 1.0,
                confidence: 0.9
            }
        },

        // Sequential actions
        {
            termKey: '(&/, analyze, plan, execute_solution)',
            punctuation: '!',
            truthValue: {
                frequency: 1.0,
                confidence: 0.9
            }
        },

        // Parallel actions
        {
            termKey: '(||, log_activity, update_status)',
            punctuation: '!',
            truthValue: {
                frequency: 1.0,
                confidence: 0.9
            }
        },

        // Choice actions
        {
            termKey: '(|, navigate_to_kitchen, navigate_to_living_room)',
            punctuation: '!',
            truthValue: {
                frequency: 1.0,
                confidence: 0.9
            }
        },

        // Conditional action
        {
            termKey: '((environment_is_safe) ==> (proceed_with_task))',
            punctuation: '!',
            truthValue: {
                frequency: 1.0,
                confidence: 0.9
            }
        },

        // Complex goal
        {
            termKey: '(&, achieve, system_optimization)',
            punctuation: '!',
            truthValue: {
                frequency: 1.0,
                confidence: 0.9
            }
        },

        // Temporal action
        {
            termKey: '(&, future, send_report, tomorrow)',
            punctuation: '!',
            truthValue: {
                frequency: 1.0,
                confidence: 0.9
            }
        },

        // Resource-aware action
        {
            termKey: '(&, optimize, cpu_usage)',
            punctuation: '!',
            truthValue: {
                frequency: 1.0,
                confidence: 0.9
            }
        },

        // Constraint-aware action
        {
            termKey: '(&, coordinate, team_members)',
            punctuation: '!',
            truthValue: {
                frequency: 1.0,
                confidence: 0.9
            }
        }
    ];

    await runDemo('Extended Action Execution Demo', taskDefs, {
        cycleCount: 5
    });
}

module.exports = extendedActionExecutionDemo;

if (require.main === module) {
    extendedActionExecutionDemo().catch(console.error);
}