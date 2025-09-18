#!/usr/bin/env node

import UnitTestAnalyzer from '../src/analyzer/index.js';

// Mock test data based on the actual test failures we observed
const mockTestData = {
    testResults: [
        {
            testFilePath: "/home/me/senars8/tests/unit/config.test.js",
            perfStats: { runtime: 120 },
            numPassingTests: 2,
            numFailingTests: 2,
            numPendingTests: 0,
            testExecError: null,
            testResults: [
                {
                    title: "should handle different data types for getters",
                    fullName: "ConfigManager should handle different data types for getters",
                    status: "failed",
                    duration: 15,
                    failureMessages: [
                        "Configuration value 'LM.LLM_PROVIDER' must be a boolean, got string"
                    ],
                    ancestorTitles: ["ConfigManager"]
                },
                {
                    title: "should handle null and undefined values in user config",
                    fullName: "ConfigManager should handle null and undefined values in user config",
                    status: "failed",
                    duration: 10,
                    failureMessages: [
                        "expect(received).toBeNull()"
                    ],
                    ancestorTitles: ["ConfigManager"]
                },
                {
                    title: "should validate configuration keys",
                    fullName: "ConfigManager should validate configuration keys",
                    status: "passed",
                    duration: 8,
                    failureMessages: [],
                    ancestorTitles: ["ConfigManager"]
                },
                {
                    title: "should merge user config with defaults",
                    fullName: "ConfigManager should merge user config with defaults",
                    status: "passed",
                    duration: 12,
                    failureMessages: [],
                    ancestorTitles: ["ConfigManager"]
                }
            ]
        },
        {
            testFilePath: "/home/me/senars8/tests/unit/MemoryIndexing.test.js",
            perfStats: { runtime: 45 },
            numPassingTests: 4,
            numFailingTests: 2,
            numPendingTests: 0,
            testExecError: null,
            testResults: [
                {
                    title: "should index implication terms correctly",
                    fullName: "MemoryIndexer should index implication terms correctly",
                    status: "failed",
                    duration: 5,
                    failureMessages: [
                        "TypeError: Cannot set property type of [object Object] which has only a getter"
                    ],
                    ancestorTitles: ["MemoryIndexer"]
                },
                {
                    title: "should clone the indexer correctly",
                    fullName: "MemoryIndexer should clone the indexer correctly",
                    status: "failed",
                    duration: 7,
                    failureMessages: [
                        "TypeError: Cannot set property type of [object Object] which has only a getter"
                    ],
                    ancestorTitles: ["MemoryIndexer"]
                }
            ]
        },
        {
            testFilePath: "/home/me/senars8/tests/unit/Term.test.js",
            perfStats: { runtime: 30 },
            numPassingTests: 3,
            numFailingTests: 1,
            numPendingTests: 0,
            testExecError: null,
            testResults: [
                {
                    title: "should calculate structural similarity between two term keys",
                    fullName: "Term should calculate structural similarity between two term keys",
                    status: "failed",
                    duration: 8,
                    failureMessages: [
                        "Expected: 0.8, Received: 0.75"
                    ],
                    ancestorTitles: ["Term"]
                }
            ]
        }
    ]
};

// Mock coverage data
const mockCoverageData = {
    coverageMap: {},
    total: {
        statements: { covered: 850, total: 1000, pct: 85 },
        branches: { covered: 420, total: 500, pct: 84 },
        functions: { covered: 170, total: 200, pct: 85 },
        lines: { covered: 850, total: 1000, pct: 85 }
    }
};

// Mock profiling data
const mockProfilingData = {
    functions: [
        {
            name: "MemoryIndexer._indexImplication",
            file: "/src/memory/MemoryIndexer.js",
            lineNumber: 35,
            calls: 1200,
            totalTime: 250,
            averageTime: 0.208,
            maxTime: 2.1
        },
        {
            name: "Term.structuralSimilarity",
            file: "/src/core/Term.js",
            lineNumber: 150,
            calls: 850,
            totalTime: 180,
            averageTime: 0.212,
            maxTime: 1.8
        },
        {
            name: "ConfigManager.getBoolean",
            file: "/src/config/ConfigManager.js",
            lineNumber: 50,
            calls: 420,
            totalTime: 35,
            averageTime: 0.083,
            maxTime: 0.5
        }
    ],
    hotPaths: [
        {
            path: "MemoryIndexer._indexImplication -> Term.type",
            totalTime: 200,
            percentage: 25.5
        }
    ]
};

async function runDemo() {
    console.log("=== Unit Test Analyzer Demo ===\n");

    try {
        // Create analyzer
        const analyzer = new UnitTestAnalyzer({
            enableCoverageAnalysis: true,
            enablePerformanceAnalysis: true
        });

        // Process mock data
        console.log("Processing test data...");
        const results = await analyzer.analyzeTestData(mockTestData, mockCoverageData, mockProfilingData);

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
        const fs = await import('fs');
        fs.writeFileSync('./test-analysis-report.html', htmlReport);
        console.log("HTML report saved to test-analysis-report.html");

        console.log("\n=== ANALYSIS COMPLETE ===");

    } catch (error) {
        console.error("Demo failed:", error.message);
        console.error(error.stack);
    }
}

// Run the demo
runDemo();