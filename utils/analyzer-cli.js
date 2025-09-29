#!/usr/bin/env node

import fs from 'fs';
import { UnitTestAnalyzer } from '../../core/analyzer/index.js';
import { logAndExit, safeAsync } from '../../core/utils/errorHandler.js';

const showHelp = () => {
    console.log(`
Unit Test Analyzer - SeNARS-powered test diagnostics

Usage:
  node utils/analyzer-cli.js [options]

Options:
  --test-results <file>     Path to test results JSON file (required for standard analysis)
  --coverage <file>         Path to coverage JSON file
  --profiling <file>        Path to profiling JSON file
  --format <format>         Output format: json, text, html, markdown (default: text)
  --output <file>           Output file path (default: stdout)
  --analyze-failures        Analyze only the failing tests from ./test-results.json
  --help, -h                Show this help message

Examples:
  node utils/analyzer-cli.js --test-results ./test-results.json
  node utils/analyzer-cli.js --analyze-failures
  node utils/analyzer-cli.js --test-results ./test-results.json --coverage ./coverage.json --format html --output report.html
    `);
    process.exit(0);
};

const parseArgs = (args) => {
    const options = {};
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg.startsWith('--')) {
            const key = arg.slice(2).replace(/-./g, x => x[1].toUpperCase());
            if (i + 1 < args.length && !args[i + 1].startsWith('-')) {
                options[key] = args[++i];
            } else {
                options[key] = true;
            }
        } else if (arg === '-h') {
            options.help = true;
        }
    }
    return options;
};

const loadDataFile = (filePath) => filePath ? JSON.parse(fs.readFileSync(filePath, 'utf8')) : null;

const analyzeFailures = async () => {
    console.log('--- Analyzing Test Failures ---');
    const testResultsPath = './test-results.json';
    if (!fs.existsSync(testResultsPath)) {
        console.log('Test results file not found. Nothing to analyze.');
        return;
    }

    const testResultsData = JSON.parse(fs.readFileSync(testResultsPath, 'utf8'));
    const failingSuites = testResultsData.testResults.filter(suite => suite.numFailingTests > 0);

    if (failingSuites.length === 0) {
        console.log('All tests are passing! No failures to analyze.');
        return;
    }

    console.log(`Found ${failingSuites.length} test suites with failures.`);
    const failureData = { testResults: failingSuites };

    const analyzer = new UnitTestAnalyzer({
        enableCoverageAnalysis: false,
        enablePerformanceAnalysis: false,
    });

    console.log('Processing failure data...');
    if (!await analyzer.analyzeTestData(failureData, null, null)) {
        throw new Error('Analysis failed!');
    }

    console.log('\n--- Analysis Results (Text) ---\n');
    console.log(analyzer.generateReport('text'));

    console.log('Generating HTML report...');
    const htmlReport = await analyzer.generateDetailedReport('html');
    const reportPath = './actual-test-failures-analysis.html';
    fs.writeFileSync(reportPath, htmlReport);
    console.log(`HTML report saved to ${reportPath}`);
};

const runCli = async (options) => {
    console.log('--- Running Analyzer CLI ---');
    if (!options.testResults) {
        console.error('Error: --test-results is required for CLI mode.');
        showHelp();
    }

    const testData = loadDataFile(options.testResults);
    const coverageData = loadDataFile(options.coverage);
    const profilingData = loadDataFile(options.profiling);

    const analyzer = new UnitTestAnalyzer({
        enableCoverageAnalysis: !!coverageData,
        enablePerformanceAnalysis: !!profilingData,
    });

    console.log('Analyzing test data...');
    if (!await analyzer.analyzeTestData(testData, coverageData, profilingData)) {
        logAndExit(new Error('Analysis failed'), 1);
    }

    const format = options.format || 'text';
    console.log(`Generating ${format} report...`);

    const report = ['html', 'markdown'].includes(format)
        ? await analyzer.generateDetailedReport(format)
        : analyzer.generateReport(format);

    if (options.output) {
        fs.writeFileSync(options.output, report);
        console.log(`Report written to ${options.output}`);
    } else {
        console.log(report);
    }
};

const run = async () => {
    const args = process.argv.slice(2);
    const options = parseArgs(args);

    if (options.help) {
        showHelp();
    }

    await safeAsync(async () => {
        if (options.analyzeFailures) {
            await analyzeFailures();
        } else if (args.length > 0) {
            await runCli(options);
        } else {
            showHelp();
        }
    }, 'analyzer-cli');
};

run().catch(logAndExit);