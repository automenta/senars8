#!/usr/bin/env node

import fs from 'fs';
import {UnitTestAnalyzer} from '../../coreagent/analyzer/index.js';
import {logAndExit, safeAsync} from '../../coreagent/utils/errorHandler.js';

const showHelp = () => {
    console.log(`
Unit Test Analyzer - SeNARS-powered test diagnostics

Usage:
  node utils/analyzer-cli.js [options]

Options:
  --test-results <file>     Path to test results JSON file (required)
  --coverage <file>         Path to coverage JSON file
  --profiling <file>        Path to profiling JSON file
  --format <format>         Output format: json, text, html, markdown (default: text)
  --output <file>           Output file path (default: stdout)
  --help, -h                Show this help message

Examples:
  node utils/analyzer-cli.js --test-results ./test-results.json
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

const run = async () => {
    const args = process.argv.slice(2);
    const options = parseArgs(args);

    if (args.length === 0 || options.help) {
        showHelp();
    }

    if (!options.testResults) {
        console.error('Error: --test-results is required.');
        process.exit(1);
    }

    await safeAsync(async () => {
        const testData = loadDataFile(options.testResults);
        const coverageData = loadDataFile(options.coverage);
        const profilingData = loadDataFile(options.profiling);

        const analyzer = new UnitTestAnalyzer({
            enableCoverageAnalysis: !!coverageData,
            enablePerformanceAnalysis: !!profilingData,
        });

        console.log('Analyzing test data...');
        const analysisResult = await analyzer.analyzeTestData(testData, coverageData, profilingData);

        if (!analysisResult) {
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
    }, 'analyzer-cli');
};

run().catch(logAndExit);