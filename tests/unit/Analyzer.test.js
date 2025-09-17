import { UnitTestAnalyzer, DataIngestor, NarseseTranslator, AnalysisEngine, ReportGenerator } from '../../src/analyzer/index.js';

describe('Unit Test Analyzer Components', () => {
    test('should create all analyzer components without error', () => {
        expect(() => new UnitTestAnalyzer()).not.toThrow();
        expect(() => new DataIngestor()).not.toThrow();
        expect(() => new NarseseTranslator()).not.toThrow();
        expect(() => new AnalysisEngine()).not.toThrow();
        expect(() => new ReportGenerator()).not.toThrow();
    });

    test('should process mock test data', async () => {
        const analyzer = new UnitTestAnalyzer();
        const mockData = {
            testResults: [
                {
                    testFilePath: "/src/test.js",
                    perfStats: { runtime: 50 },
                    numPassingTests: 1,
                    numFailingTests: 1,
                    numPendingTests: 0,
                    testResults: [
                        {
                            title: "should pass",
                            fullName: "Test should pass",
                            status: "passed",
                            duration: 5,
                            failureMessages: [],
                            ancestorTitles: ["Test"]
                        },
                        {
                            title: "should fail",
                            fullName: "Test should fail",
                            status: "failed",
                            duration: 8,
                            failureMessages: ["Expected true to be false"],
                            ancestorTitles: ["Test"]
                        }
                    ]
                }
            ]
        };

        const results = await analyzer.analyzeTestData(mockData);
        expect(results).toBeDefined();
        expect(results.summary).toBeDefined();
        expect(results.issues).toBeDefined();
    });

    test('should generate reports in different formats', async () => {
        const analyzer = new UnitTestAnalyzer();
        const mockData = {
            testResults: [{
                testFilePath: "/src/test.js",
                perfStats: { runtime: 50 },
                numPassingTests: 1,
                numFailingTests: 0,
                numPendingTests: 0,
                testResults: [{
                    title: "should pass",
                    fullName: "Test should pass",
                    status: "passed",
                    duration: 5,
                    failureMessages: [],
                    ancestorTitles: ["Test"]
                }]
            }]
        };

        const results = await analyzer.analyzeTestData(mockData);
        
        // Test JSON report
        const jsonReport = analyzer.generateReport('json');
        expect(jsonReport).toBeDefined();
        expect(() => JSON.parse(jsonReport)).not.toThrow();

        // Test text report
        const textReport = analyzer.generateReport('text');
        expect(textReport).toBeDefined();
        expect(typeof textReport).toBe('string');

        // Test HTML report
        const htmlReport = await analyzer.generateDetailedReport('html');
        expect(htmlReport).toBeDefined();
        expect(htmlReport).toContain('<html>');
        expect(htmlReport).toContain('</html>');

        // Test markdown report
        const mdReport = await analyzer.generateDetailedReport('markdown');
        expect(mdReport).toBeDefined();
        expect(mdReport).toContain('#');
    });
});