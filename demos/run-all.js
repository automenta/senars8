const fs = require('fs');
const path = require('path');

async function runAllDemos() {
    const demoDir = __dirname;
    const files = fs.readdirSync(demoDir);

    const demoFiles = files.filter(file => file.endsWith('-demo.js') && file !== 'run-all.js');

    for (const demoName of demoFiles) {
        try {
            console.log(`\n=== Running ${demoName} ===`);
            const demo = require(path.join(demoDir, demoName));
            await demo();
        } catch (error) {
            console.error(`Error running ${demoName}:`, error.message);
        }
    }
}

module.exports = runAllDemos;