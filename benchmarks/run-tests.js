#!/usr/bin/env node

const { runAllTests } = require('./index');

async function main() {
    await runAllTests();
}

if (require.main === module) {
    main();
}