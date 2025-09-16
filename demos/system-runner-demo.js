// Description: A demo of the main system runner, showing the cognitive cycle in action.
const { runDemo } = require('./demo-utils');

async function systemRunnerDemo() {
    await runDemo('System Runner Demo', [], {
        cycleCount: 5
    });
}

module.exports = systemRunnerDemo;

if (require.main === module) {
    systemRunnerDemo().catch(console.error);
}
