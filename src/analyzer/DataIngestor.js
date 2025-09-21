import {createUnifiedErrorHandler} from '../utils/unifiedErrorHandler.js';

const errorHandler = createUnifiedErrorHandler('DataIngestor');

class DataIngestor {
    constructor(config = {}) {
        this.config = {
            bottleneckTimeThreshold: 100,
            bottleneckAvgTimeFactor: 2,
            ...config,
        };
        // Configuration for data parsing
        this.parsers = {
            jest: this._parseJestResults.bind(this),
            coverage: this._parseCoverageData.bind(this),
            profiling: this._parseProfilingData.bind(this)
        };
    }

    async ingestTestResults(rawData, format = 'jest') {
        return this._ingestData(rawData, format, 'ingest-test-results');
    }

    async ingestCoverageData(rawData) {
        return this._ingestData(rawData, 'coverage', 'ingest-coverage-data');
    }

    async ingestProfilingData(rawData) {
        return this._ingestData(rawData, 'profiling', 'ingest-profiling-data');
    }

    async _ingestData(rawData, format, context) {
        return errorHandler.execute(async () => {
            if (!rawData) {
                if (context === 'ingest-test-results') {
                    throw new Error('No test data provided for ingestion');
                }
                return null;
            }

            const parser = this.parsers[format];
            if (!parser) {
                throw new Error(`Unsupported data format: ${format}`);
            }

            const data = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
            return await parser(data);
        }, context, null);
    }

    _parseJestResults(data) {
        const suites = this._parseSuites(data);
        const tests = this._parseTests(data);
        const failures = tests.filter(t => t.status === 'failed');
        const summary = this._calculateSummary(suites, tests);

        return {
            suites,
            tests,
            failures,
            summary
        };
    }

    _parseSuites(data) {
        if (!data.testResults) return [];
        return data.testResults.map(suite => ({
            name: suite.testFilePath,
            duration: suite.perfStats ? suite.perfStats.runtime : 0,
            numPassingTests: suite.numPassingTests,
            numFailingTests: suite.numFailingTests,
            numPendingTests: suite.numPendingTests,
            testExecError: suite.testExecError,
            status: suite.testExecError ? 'error' :
                suite.numFailingTests > 0 ? 'fail' : 'pass'
        }));
    }

    _parseTests(data) {
        if (!data.testResults) return [];
        const tests = [];
        data.testResults.forEach(suite => {
            if (suite.testResults) {
                suite.testResults.forEach(test => {
                    const testCase = {
                        name: test.title,
                        fullName: test.fullName,
                        status: test.status,
                        duration: test.duration,
                        failureMessages: test.failureMessages || [],
                        ancestorTitles: test.ancestorTitles || [],
                        suite: suite.testFilePath
                    };
                    tests.push(testCase);
                });
            }
        });
        return tests;
    }

    _calculateSummary(suites, tests) {
        return {
            totalSuites: suites.length,
            passedSuites: suites.filter(s => s.status === 'pass').length,
            failedSuites: suites.filter(s => s.status === 'fail' || s.status === 'error').length,
            totalTests: tests.length,
            passedTests: tests.filter(t => t.status === 'passed').length,
            failedTests: tests.filter(t => t.status === 'failed').length,
            duration: suites.reduce((sum, suite) => sum + suite.duration, 0)
        };
    }

    _parseCoverageData(data) {
        const files = this._parseFileCoverage(data);
        const summary = this._parseCoverageSummary(data);

        return {
            files,
            summary
        };
    }

    _parseFileCoverage(data) {
        const files = {};
        if (data.coverageMap) {
            Object.entries(data.coverageMap).forEach(([filePath, coverage]) => {
                files[filePath] = {
                    statements: this._calculateCoverageStats(coverage.s, coverage.statementMap),
                    branches: this._calculateCoverageStats(coverage.b, coverage.branchMap),
                    functions: this._calculateCoverageStats(coverage.f, coverage.fnMap),
                    lines: coverage.l ? this._calculateLineCoverage(coverage.l) : {
                        covered: 0,
                        total: 0,
                        pct: 0
                    }
                };
            });
        }
        return files;
    }

    _parseCoverageSummary(data) {
        const summary = {
            statements: {
                covered: 0,
                total: 0,
                pct: 0
            },
            branches: {
                covered: 0,
                total: 0,
                pct: 0
            },
            functions: {
                covered: 0,
                total: 0,
                pct: 0
            },
            lines: {
                covered: 0,
                total: 0,
                pct: 0
            }
        };

        if (data.total) {
            return {
                statements: {
                    covered: data.total.statements.covered,
                    total: data.total.statements.total,
                    pct: data.total.statements.pct
                },
                branches: {
                    covered: data.total.branches.covered,
                    total: data.total.branches.total,
                    pct: data.total.branches.pct
                },
                functions: {
                    covered: data.total.functions.covered,
                    total: data.total.functions.total,
                    pct: data.total.functions.pct
                },
                lines: {
                    covered: data.total.lines.covered,
                    total: data.total.lines.total,
                    pct: data.total.lines.pct
                }
            };
        }
        return summary;
    }

    _parseProfilingData(data) {
        const parsed = {
            functions: [],
            hotPaths: [],
            bottlenecks: []
        };

        // Process function timing data if available
        if (data.functions) {
            parsed.functions = data.functions.map(func => ({
                name: func.name,
                file: func.file,
                lineNumber: func.lineNumber,
                calls: func.calls || 0,
                totalTime: func.totalTime || 0,
                averageTime: func.averageTime || 0,
                maxTime: func.maxTime || 0
            }));
        }

        // Process hot paths if available
        if (data.hotPaths) {
            parsed.hotPaths = data.hotPaths.map(path => ({
                path: path.path,
                totalTime: path.totalTime,
                percentage: path.percentage
            }));
        }

        // Identify bottlenecks based on thresholds
        if (parsed.functions.length > 0) {
            const avgTime = parsed.functions.reduce((sum, f) => sum + f.averageTime, 0) / parsed.functions.length;
            parsed.bottlenecks = parsed.functions.filter(func =>
                func.averageTime > avgTime * this.config.bottleneckAvgTimeFactor || func.totalTime > this.config.bottleneckTimeThreshold
            );
        }

        return parsed;
    }

    _calculateCoverageStats(coverage, map) {
        if (!coverage || !map) {
            return {covered: 0, total: 0, pct: 0};
        }

        const total = Object.keys(map).length;
        let covered = 0;

        // Count covered items
        Object.values(coverage).forEach(value => {
            if (Array.isArray(value)) {
                // Branch coverage - check if all branches are covered
                if (value.every(v => v > 0)) covered++;
            } else {
                // Statement/function coverage
                if (value > 0) covered++;
            }
        });

        const pct = total > 0 ? (covered / total) * 100 : 0;

        return {covered, total, pct};
    }

    _calculateLineCoverage(lineCoverage) {
        if (!lineCoverage) {
            return {covered: 0, total: 0, pct: 0};
        }

        const lines = Object.values(lineCoverage);
        const total = lines.length;
        const covered = lines.filter(count => count > 0).length;
        const pct = total > 0 ? (covered / total) * 100 : 0;

        return {covered, total, pct};
    }
}

export default DataIngestor;