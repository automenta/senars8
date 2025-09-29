#!/usr/bin/env node

import fs from 'fs';
import { UnitTestAnalyzer } from '../../core/analyzer/index.js';
import { logAndExit, safeAsync } from '../../core/utils/errorHandler.js';

const TEST_RESULTS_PATH = './test-results.json';
const HTML_REPORT_PATH = './actual-test-failures-analysis.html';

const loadAndFilterFailures = () => {
    console.log(`Reading test results from ${TEST_RESULTS_PATH}...`);
    if (!fs.existsSync(TEST_RESULTS_PATH)) {
        console.log('Test results file not found. Nothing to analyze.');
        return null;
    }

    const testResultsData = JSON.parse(fs.readFileSync(TEST_RESULTS_PATH, 'utf8'));
    const failingSuites = testResultsData.testResults.filter(suite => suite.numFailingTests > 0);

    if (failingSuites.length === 0) {
        console.log('All tests are passing! No failures to analyze.');
        return null;
    }

    console.log(`Found ${failingSuites.length} test suites with failures.`);
    return { testResults: failingSuites };
};

const analyzeAndGenerateReports = async (failureData) => {
    const analyzer = new UnitTestAnalyzer({
        enableCoverageAnalysis: false,
        enablePerformanceAnalysis: false,
    });

    console.log('Processing actual test failure data...');
    const analysisResult = await analyzer.analyzeTestData(failureData, null, null);

    if (!analysisResult) {
        throw new Error('Analysis failed!');
    }

    console.log('\n=== ANALYSIS RESULTS ===\n');
    const textReport = analyzer.generateReport('text');
    console.log(textReport);

    console.log('Generating HTML report...');
    const htmlReport = await analyzer.generateDetailedReport('html');
    fs.writeFileSync(HTML_REPORT_PATH, htmlReport);
    console.log(`HTML report saved to ${HTML_REPORT_PATH}`);
};

const run = async () => {
    console.log('=== Unit Test Analyzer - Actual Test Failures ===\n');

    await safeAsync(async () => {
        const failureData = loadAndFilterFailures();
        if (failureData) {
            await analyzeAndGenerateReports(failureData);
        }
        console.log('\n=== ANALYSIS COMPLETE ===');
    }, 'analyzeActualFailures');
};

run().catch(logAndExit);