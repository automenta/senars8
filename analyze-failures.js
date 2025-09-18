#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import UnitTestAnalyzer from './src/analyzer/index.js';

// Create a more comprehensive test data structure based on the actual failures
const testData = {
  "testResults": [
    {
      "testFilePath": "/home/me/senars8/tests/unit/config.test.js",
      "perfStats": {
        "runtime": 120
      },
      "numPassingTests": 2,
      "numFailingTests": 2,
      "numPendingTests": 0,
      "testExecError": null,
      "testResults": [
        {
          "title": "should handle different data types for getters",
          "fullName": "ConfigManager should handle different data types for getters",
          "status": "failed",
          "duration": 15,
          "failureMessages": [
            "Configuration value 'LM.LLM_PROVIDER' must be a boolean, got string"
          ],
          "ancestorTitles": ["ConfigManager"]
        },
        {
          "title": "should handle null and undefined values in user config",
          "fullName": "ConfigManager should handle null and undefined values in user config",
          "status": "failed",
          "duration": 10,
          "failureMessages": [
            "expect(received).toBeNull()"
          ],
          "ancestorTitles": ["ConfigManager"]
        },
        {
          "title": "should validate configuration keys",
          "fullName": "ConfigManager should validate configuration keys",
          "status": "passed",
          "duration": 8,
          "failureMessages": [],
          "ancestorTitles": ["ConfigManager"]
        },
        {
          "title": "should merge user config with defaults",
          "fullName": "ConfigManager should merge user config with defaults",
          "status": "passed",
          "duration": 12,
          "failureMessages": [],
          "ancestorTitles": ["ConfigManager"]
        }
      ]
    },
    {
      "testFilePath": "/home/me/senars8/tests/unit/MemoryIndexing.test.js",
      "perfStats": {
        "runtime": 45
      },
      "numPassingTests": 4,
      "numFailingTests": 2,
      "numPendingTests": 0,
      "testExecError": null,
      "testResults": [
        {
          "title": "should index implication terms correctly",
          "fullName": "MemoryIndexer should index implication terms correctly",
          "status": "failed",
          "duration": 5,
          "failureMessages": [
            "TypeError: Cannot set property type of [object Object] which has only a getter"
          ],
          "ancestorTitles": ["MemoryIndexer"]
        },
        {
          "title": "should clone the indexer correctly",
          "fullName": "MemoryIndexer should clone the indexer correctly",
          "status": "failed",
          "duration": 7,
          "failureMessages": [
            "TypeError: Cannot set property type of [object Object] which has only a getter"
          ],
          "ancestorTitles": ["MemoryIndexer"]
        }
      ]
    },
    {
      "testFilePath": "/home/me/senars8/tests/unit/Term.test.js",
      "perfStats": {
        "runtime": 30
      },
      "numPassingTests": 3,
      "numFailingTests": 1,
      "numPendingTests": 0,
      "testExecError": null,
      "testResults": [
        {
          "title": "should calculate structural similarity between two term keys",
          "fullName": "Term should calculate structural similarity between two term keys",
          "status": "failed",
          "duration": 8,
          "failureMessages": [
            "Expected: 0.8, Received: 0.75"
          ],
          "ancestorTitles": ["Term"]
        }
      ]
    },
    {
      "testFilePath": "/home/me/senars8/tests/integration/AStarPlanner.test.js",
      "perfStats": {
        "runtime": 80
      },
      "numPassingTests": 0,
      "numFailingTests": 6,
      "numPendingTests": 0,
      "testExecError": null,
      "testResults": [
        {
          "title": "should find the cheapest plan, even if it is longer",
          "fullName": "AStarPlanner Integration Test should find the cheapest plan, even if it is longer",
          "status": "failed",
          "duration": 12,
          "failureMessages": [
            "expect(received).not.toBeNull()"
          ],
          "ancestorTitles": ["AStarPlanner Integration Test"]
        },
        {
          "title": "should find a simple plan with one level of decomposition",
          "fullName": "AStarPlanner Integration Test should find a simple plan with one level of decomposition",
          "status": "failed",
          "duration": 10,
          "failureMessages": [
            "expect(received).not.toBeNull()"
          ],
          "ancestorTitles": ["AStarPlanner Integration Test"]
        },
        {
          "title": "should return a plan with a single primitive action",
          "fullName": "AStarPlanner Integration Test should return a plan with a single primitive action",
          "status": "failed",
          "duration": 8,
          "failureMessages": [
            "expect(received).not.toBeNull()"
          ],
          "ancestorTitles": ["AStarPlanner Integration Test"]
        },
        {
          "title": "should find the optimal (cheapest) plan when two paths exist",
          "fullName": "AStarPlanner Integration Test should find the optimal (cheapest) plan when two paths exist",
          "status": "failed",
          "duration": 9,
          "failureMessages": [
            "expect(received).not.toBeNull()"
          ],
          "ancestorTitles": ["AStarPlanner Integration Test"]
        },
        {
          "title": "should handle multi-level decomposition",
          "fullName": "AStarPlanner Integration Test should handle multi-level decomposition",
          "status": "failed",
          "duration": 11,
          "failureMessages": [
            "expect(received).not.toBeNull()"
          ],
          "ancestorTitles": ["AStarPlanner Integration Test"]
        },
        {
          "title": "should not use a path if preconditions are not met",
          "fullName": "AStarPlanner Integration Test should not use a path if preconditions are not met",
          "status": "failed",
          "duration": 10,
          "failureMessages": [
            "expect(received).not.toBeNull()"
          ],
          "ancestorTitles": ["AStarPlanner Integration Test"]
        }
      ]
    }
  ]
};

async function analyzeActualFailures() {
    console.log("=== Unit Test Analyzer - Actual Test Failures ===\n");

    try {
        // Create analyzer
        const analyzer = new UnitTestAnalyzer({
            enableCoverageAnalysis: false,
            enablePerformanceAnalysis: false
        });

        // Process test data
        console.log("Processing actual test failure data...");
        const results = await analyzer.analyzeTestData(testData, null, null);

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
        console.log("\nKey findings:");
        console.log("1. Multiple tests failing with 'Cannot set property type' - indicates attempts to modify read-only properties");
        console.log("2. Configuration validation issues - type mismatches in config values");
        console.log("3. A* Planner consistently returning null - possible algorithmic or logic issues");
        console.log("4. Term similarity calculation discrepancy - expected 0.8 but got 0.75");

    } catch (error) {
        console.error("Analysis failed:", error.message);
        console.error(error.stack);
    }
}

// Run the analysis
analyzeActualFailures();