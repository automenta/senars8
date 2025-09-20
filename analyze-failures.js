#!/usr/bin/env node

import fs from 'fs';
import UnitTestAnalyzer from './src/analyzer/index.js';

async function analyzeActualFailures() {
    console.log("=== Unit Test Analyzer - Actual Test Failures ===\n");

    try {
        // Read the actual test results
        console.log("Reading actual test results...");
        const testResultsData = JSON.parse(fs.readFileSync('./test-results.json', 'utf8'));

        // Check if there are any failures
        const hasFailures = testResultsData.testResults.some(suite => suite.numFailingTests > 0);

        if (!hasFailures) {
            console.log("All tests are passing! No failures to analyze.");
            return;
        }

        // Filter to only suites with failures
        const failingSuites = testResultsData.testResults.filter(suite => suite.numFailingTests > 0);

        console.log(`Found ${failingSuites.length} test suites with failures.`);

        // Create analyzer
        const analyzer = new UnitTestAnalyzer({
            enableCoverageAnalysis: false,
            enablePerformanceAnalysis: false
        });

        // Process test data
        console.log("Processing actual test failure data...");
        const results = await analyzer.analyzeTestData({testResults: failingSuites}, null, null);

        if (!results) {
            console.error("Analysis failed!");
            return;
        }

        // Generate text report
        console.log("\n=== ANALYSIS RESULTS ===\n");
        const textReport = analyzer.generateReport('text');
        console.log(textReport);

        // Generate HTML report
        console.log("Generating HTML report...");
        const htmlReport = await analyzer.generateDetailedReport('html');

        // Save HTML report
        fs.writeFileSync('./actual-test-failures-analysis.html', htmlReport);
        console.log("HTML report saved to actual-test-failures-analysis.html");

        console.log("\n=== ANALYSIS COMPLETE ===");

    } catch (error) {
        console.error("Analysis failed:", error.message);
        console.error(error.stack);
    }
}

// Run the analysis
analyzeActualFailures();