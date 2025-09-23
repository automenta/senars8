#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
import UnitTestAnalyzer from '../src/analyzer/index.js';
import {logAndExit, safeAsync} from '../src/utils/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
    const args = process.argv.slice(2);

    if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
        console.log(`
Unit Test Analyzer - SeNARS-powered test diagnostics

Usage:
  node analyzer-cli.js [options]

Options:
  --test-results <file>     Path to test results JSON file
  --coverage <file>         Path to coverage JSON file
  --profiling <file>        Path to profiling JSON file
  --format <format>         Output format: json, text, html, markdown (default: text)
  --output <file>           Output file path (default: stdout)
  --help, -h               Show this help message

Examples:
  node analyzer-cli.js --test-results ./test-results.json
  node analyzer-cli.js --test-results ./test-results.json --coverage ./coverage.json --format html --output report.html
        `);
        process.exit(0);
    }

    // Parse arguments
    const options = {};
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        switch (arg) {
            case '--test-results':
                options.testResults = args[++i];
                break;
            case '--coverage':
                options.coverage = args[++i];
                break;
            case '--profiling':
                options.profiling = args[++i];
                break;
            case '--format':
                options.format = args[++i];
                break;
            case '--output':
                options.output = args[++i];
                break;
        }
    }

    // Validate required files
    if (!options.testResults) {
        console.error('Error: --test-results is required');
        process.exit(1);
    }

    await safeAsync(async () => {
        // Load data files
        const testData = JSON.parse(fs.readFileSync(options.testResults, 'utf8'));
        const coverageData = options.coverage ? JSON.parse(fs.readFileSync(options.coverage, 'utf8')) : null;
        const profilingData = options.profiling ? JSON.parse(fs.readFileSync(options.profiling, 'utf8')) : null;

        // Create analyzer
        const analyzer = new UnitTestAnalyzer({
            enableCoverageAnalysis: !!coverageData,
            enablePerformanceAnalysis: !!profilingData
        });

        // Analyze data
        console.log('Analyzing test data...');
        const results = await analyzer.analyzeTestData(testData, coverageData, profilingData);

        if (!results) {
            console.error('Analysis failed');
            process.exit(1);
        }

        // Generate report
        const format = options.format || 'text';
        console.log(`Generating ${format} report...`);

        let report;
        if (format === 'html' || format === 'markdown') {
            report = await analyzer.generateDetailedReport(format);
        } else {
            report = analyzer.generateReport(format);
        }

        // Output report
        if (options.output) {
            fs.writeFileSync(options.output, report);
            console.log(`Report written to ${options.output}`);
        } else {
            console.log(report);
        }
    }, 'main');
}

if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(logAndExit);
}