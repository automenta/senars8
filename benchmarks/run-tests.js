#!/usr/bin/env node

import {CognitiveTestSuite} from './index.js';

async function main() {
    const suite = new CognitiveTestSuite();
    await suite.runAllTests();
    suite.generateReport();
}

main().catch(console.error);
