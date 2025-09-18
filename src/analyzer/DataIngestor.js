import { createModuleErrorHandler } from '../utils/errorHandler.js';

const errorHandler = createModuleErrorHandler('DataIngestor');

class DataIngestor {
    constructor() {
        // Configuration for data parsing
        this.parsers = {
            jest: this._parseJestResults.bind(this),
            coverage: this._parseCoverageData.bind(this),
            profiling: this._parseProfilingData.bind(this)
        };
    }

    async ingestTestResults(rawData, format = 'jest') {
        return errorHandler.safeAsync(async () => {
            if (!rawData) {
                throw new Error('No test data provided for ingestion');
            }

            const parser = this.parsers[format];
            if (!parser) {
                throw new Error(`Unsupported test data format: ${format}`);
            }

            return await parser(rawData);
        }, 'ingest-test-results', null);
    }

    async ingestCoverageData(rawData) {
        return errorHandler.safeAsync(async () => {
            if (!rawData) {
                return null;
            }

            return await this._parseCoverageData(rawData);
        }, 'ingest-coverage-data', null);
    }

    async ingestProfilingData(rawData) {
        return errorHandler.safeAsync(async () => {
            if (!rawData) {
                return null;
            }

            return await this._parseProfilingData(rawData);
        }, 'ingest-profiling-data', null);
    }

    _parseJestResults(rawData) {
        // Parse Jest test results format
        try {
            const data = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;

            const parsed = {
                suites: [],
                tests: [],
                failures: [],
                summary: {
                    totalTests: 0,
                    passedTests: 0,
                    failedTests: 0,
                    totalSuites: 0,
                    passedSuites: 0,
                    failedSuites: 0,
                    duration: 0
                }
            };

            // Extract test suite information
            if (data.testResults) {
                parsed.suites = data.testResults.map(suite => ({
                    name: suite.testFilePath,
                    duration: suite.perfStats ? suite.perfStats.runtime : 0,
                    numPassingTests: suite.numPassingTests,
                    numFailingTests: suite.numFailingTests,
                    numPendingTests: suite.numPendingTests,
                    testExecError: suite.testExecError,
                    status: suite.testExecError ? 'error' :
                           suite.numFailingTests > 0 ? 'fail' : 'pass'
                }));

                // Extract individual test cases
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

                            parsed.tests.push(testCase);

                            if (test.status === 'failed') {
                                parsed.failures.push(testCase);
                            }
                        });
                    }
                });
            }

            // Calculate summary statistics
            parsed.summary.totalSuites = parsed.suites.length;
            parsed.summary.passedSuites = parsed.suites.filter(s => s.status === 'pass').length;
            parsed.summary.failedSuites = parsed.suites.filter(s => s.status === 'fail' || s.status === 'error').length;

            parsed.summary.totalTests = parsed.tests.length;
            parsed.summary.passedTests = parsed.tests.filter(t => t.status === 'passed').length;
            parsed.summary.failedTests = parsed.tests.filter(t => t.status === 'failed').length;

            parsed.summary.duration = parsed.suites.reduce((sum, suite) => sum + suite.duration, 0);

            return parsed;
        } catch (error) {
            throw new Error(`Failed to parse Jest test results: ${error.message}`);
        }
    }

    _parseCoverageData(rawData) {
        // Parse coverage data (Istanbul format)
        try {
            const data = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;

            const parsed = {
                files: {},
                summary: {
                    statements: { covered: 0, total: 0, pct: 0 },
                    branches: { covered: 0, total: 0, pct: 0 },
                    functions: { covered: 0, total: 0, pct: 0 },
                    lines: { covered: 0, total: 0, pct: 0 }
                }
            };

            // Process coverage per file
            if (data.coverageMap) {
                Object.entries(data.coverageMap).forEach(([filePath, coverage]) => {
                    parsed.files[filePath] = {
                        statements: this._calculateCoverageStats(coverage.s, coverage.statementMap),
                        branches: this._calculateCoverageStats(coverage.b, coverage.branchMap),
                        functions: this._calculateCoverageStats(coverage.f, coverage.fnMap),
                        lines: coverage.l ? this._calculateLineCoverage(coverage.l) : { covered: 0, total: 0, pct: 0 }
                    };
                });
            }

            // Process summary if available
            if (data.total) {
                parsed.summary = {
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

            return parsed;
        } catch (error) {
            throw new Error(`Failed to parse coverage data: ${error.message}`);
        }
    }

    _parseProfilingData(rawData) {
        // Parse profiling data
        try {
            const data = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;

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
                    func.averageTime > avgTime * 2 || func.totalTime > 100 // Thresholds can be configurable
                );
            }

            return parsed;
        } catch (error) {
            throw new Error(`Failed to parse profiling data: ${error.message}`);
        }
    }

    _calculateCoverageStats(coverage, map) {
        if (!coverage || !map) {
            return { covered: 0, total: 0, pct: 0 };
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

        return { covered, total, pct };
    }

    _calculateLineCoverage(lineCoverage) {
        if (!lineCoverage) {
            return { covered: 0, total: 0, pct: 0 };
        }

        const lines = Object.values(lineCoverage);
        const total = lines.length;
        const covered = lines.filter(count => count > 0).length;
        const pct = total > 0 ? (covered / total) * 100 : 0;

        return { covered, total, pct };
    }
}

export default DataIngestor;