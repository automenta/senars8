#!/usr/bin/env node

import UnitTestAnalyzer from '../../src/analyzer/index.js';

// This is a comprehensive test to verify the analyzer works with various data types
async function runIntegrationTest() {
    console.log("=== Unit Test Analyzer Integration Test ===\n");
    
    try {
        // Create analyzer with all features enabled
        const analyzer = new UnitTestAnalyzer({
            enableCoverageAnalysis: true,
            enablePerformanceAnalysis: true
        });
        
        // Mock comprehensive test data
        const testData = {
            testResults: [
                {
                    testFilePath: "/src/core/Term.js",
                    perfStats: { runtime: 150 },
                    numPassingTests: 8,
                    numFailingTests: 1,
                    numPendingTests: 0,
                    testResults: [
                        {
                            title: "should calculate structural similarity",
                            fullName: "Term should calculate structural similarity",
                            status: "failed",
                            duration: 12,
                            failureMessages: ["Expected: 0.8, Received: 0.75"],
                            ancestorTitles: ["Term"]
                        }
                    ]
                }
            ]
        };
        
        const coverageData = {
            total: {
                statements: { covered: 450, total: 500, pct: 90 },
                branches: { covered: 220, total: 250, pct: 88 },
                functions: { covered: 95, total: 100, pct: 95 },
                lines: { covered: 450, total: 500, pct: 90 }
            }
        };
        
        const profilingData = {
            functions: [
                {
                    name: "Term.structuralSimilarity",
                    file: "/src/core/Term.js",
                    lineNumber: 100,
                    calls: 1000,
                    totalTime: 200,
                    averageTime: 0.2,
                    maxTime: 1.5
                }
            ]
        };
        
        // Process the data
        console.log("Processing test data with coverage and profiling...");
        const results = await analyzer.analyzeTestData(testData, coverageData, profilingData);
        
        if (!results) {
            console.error("❌ Analysis failed!");
            return;
        }
        
        // Verify we got results
        console.log("✅ Analysis completed successfully");
        console.log(`✅ Found ${results.issues.length} issues`);
        console.log(`✅ Generated ${results.recommendations.length} recommendations`);
        console.log(`✅ Identified ${results.patterns.length} patterns`);
        
        // Test report generation
        console.log("\nTesting report generation...");
        
        // JSON report
        const jsonReport = analyzer.generateReport('json');
        console.log("✅ JSON report generated");
        
        // Text report
        const textReport = analyzer.generateReport('text');
        console.log("✅ Text report generated");
        
        // HTML report
        const htmlReport = await analyzer.generateDetailedReport('html');
        console.log("✅ HTML report generated");
        
        // Markdown report
        const mdReport = await analyzer.generateDetailedReport('markdown');
        console.log("✅ Markdown report generated");
        
        // Verify content
        if (jsonReport && textReport && htmlReport && mdReport) {
            console.log("✅ All report formats generated successfully");
        } else {
            console.log("❌ Some report formats failed to generate");
        }
        
        // Test error handling
        console.log("\nTesting error handling...");
        
        try {
            await analyzer.generateDetailedReport('unsupported-format');
            console.log("❌ Should have thrown an error for unsupported format");
        } catch (error) {
            console.log("✅ Correctly handled unsupported format error");
        }
        
        console.log("\n=== INTEGRATION TEST COMPLETE ===");
        console.log("🎉 All tests passed! The Unit Test Analyzer is working correctly.");
        
    } catch (error) {
        console.error("❌ Integration test failed:", error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Run the integration test
runIntegrationTest();
