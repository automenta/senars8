import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';
import {UnitTestAnalyzer} from '../../core/analyzer/index.js';
import * as logger from '../../core/utils/logger.js';

describe('Analyzer Integration Test', () => {
    let errorSpy;

    beforeEach(() => {
        errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        errorSpy.mockRestore();
    });

    test('should analyze test data and generate reports', async () => {
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
                    perfStats: {runtime: 150},
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
                statements: {covered: 450, total: 500, pct: 90},
                branches: {covered: 220, total: 250, pct: 88},
                functions: {covered: 95, total: 100, pct: 95},
                lines: {covered: 450, total: 500, pct: 90}
            }
        };

        const profilingData = {
            functions: [
                {
                    name: "structuralSimilarity",
                    file: "/src/core/TermUtils.js",
                    lineNumber: 1,
                    calls: 1000,
                    totalTime: 200,
                    averageTime: 0.2,
                    maxTime: 1.5
                }
            ]
        };

        // Process the data
        const results = await analyzer.analyzeTestData(testData, coverageData, profilingData);

        // Verify we got results
        expect(results).not.toBeNull();
        expect(results.issues).toBeDefined();
        expect(results.recommendations).toBeDefined();
        expect(results.patterns).toBeDefined();

        // Test report generation
        // JSON report
        const jsonReport = analyzer.generateReport('json');
        expect(jsonReport).toBeDefined();

        // Text report
        const textReport = analyzer.generateReport('text');
        expect(textReport).toBeDefined();

        // HTML report
        const htmlReport = await analyzer.generateDetailedReport('html');
        expect(htmlReport).toBeDefined();

        // Markdown report
        const mdReport = await analyzer.generateDetailedReport('markdown');
        expect(mdReport).toBeDefined();
    });

    test('should handle unsupported format error', async () => {
        const analyzer = new UnitTestAnalyzer();

        // First run analysis to have data
        await analyzer.analyzeTestData({
            testResults: []
        }, {}, {});

        // Test error handling - expect null due to error handling wrapper
        const result = await analyzer.generateDetailedReport('unsupported-format');
        expect(result).toBeNull();
    });
});
