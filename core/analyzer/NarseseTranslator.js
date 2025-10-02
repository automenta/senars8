import {createUnifiedErrorHandler} from '../utils/errorHandler.js';
import Term from '../core/Term.js';

const errorHandler = createUnifiedErrorHandler('NarseseTranslator');

// Shared categorization functions
export const categorizeDuration = (ms) => {
    if (ms < 100) return 'fast';
    if (ms < 1000) return 'medium';
    if (ms < 5000) return 'slow';
    return 'very_slow';
};

export const categorizeCoverage = (pct) => {
    if (pct >= 90) return 'high';
    if (pct >= 70) return 'medium';
    if (pct >= 50) return 'low';
    return 'very_low';
};

export const categorizePerformance = (ms) => {
    if (ms < 5) return 'fast';
    if (ms < 50) return 'medium';
    if (ms < 200) return 'slow';
    return 'very_slow';
};

export const calculatePerformanceFrequency = (ms) => {
    // Convert milliseconds to frequency (0-1 scale)
    // Lower ms should result in higher frequency (better performance)
    return Math.max(0, Math.min(1, 1 - (ms / 1000)));
};

export const extractErrorPatterns = (errorMessage) => {
    const patterns = [];

    // Common error pattern matching
    if (errorMessage.includes('TypeError')) patterns.push('type_error');
    if (errorMessage.includes('ReferenceError')) patterns.push('reference_error');
    if (errorMessage.includes('expect(')) patterns.push('assertion_failure');
    if (errorMessage.includes('undefined') || errorMessage.includes('null')) patterns.push('null_undefined_error');
    if (errorMessage.includes('Cannot set property')) patterns.push('property_assignment_error');
    if (errorMessage.includes('Expected') && errorMessage.includes('found')) patterns.push('parse_error');

    return patterns.length > 0 ? patterns : ['unclassified_error'];
};

const sanitizeKey = (str) => str.replace(/[^a-zA-Z0-9_]/g, '_');

class NarseseTranslator {
    constructor(config = {}) {
        this.config = {
            termSimilarityThreshold: config.termSimilarityThreshold || 0.7,
            confidenceThreshold: config.confidenceThreshold || 0.5,
            // Test result confidence defaults
            testSuiteExecutionConfidence: config.testSuiteExecutionConfidence || 0.9,
            testSuiteDurationConfidence: config.testSuiteDurationConfidence || 0.8,
            testFailureConfidence: config.testFailureConfidence || 0.95,
            testFailureImplicationConfidence: config.testFailureImplicationConfidence || 0.8,
            testErrorPatternConfidence: config.testErrorPatternConfidence || 0.9,
            testSummaryConfidence: config.testSummaryConfidence || 0.9,
            // Coverage data confidence defaults
            coverageStatementConfidence: config.coverageStatementConfidence || 0.9,
            coverageCategoryConfidence: config.coverageCategoryConfidence || 0.8,
            coverageAverageConfidence: config.coverageAverageConfidence || 0.9,
            // Profiling data confidence defaults
            profilingConfidence: config.profilingConfidence || 0.8,
            performanceStatementConfidence: config.performanceStatementConfidence || 0.7,
            performanceCategoryConfidence: config.performanceCategoryConfidence || 0.9,
            performanceTrendConfidence: config.performanceTrendConfidence || 0.9,
            ...config
        };
    }

    async translate(testData, coverageData = null, profilingData = null) {
        return errorHandler.execute(async () => {
            const narseseData = {
                facts: [],
                implications: [],
                goals: [],
                questions: []
            };

            // Translate test data
            if (testData) {
                this._translateTestResults(testData, narseseData);
            }

            // Translate coverage data
            if (coverageData) {
                this._translateCoverageData(coverageData, narseseData);
            }

            // Translate profiling data
            if (profilingData) {
                this._translateProfilingData(profilingData, narseseData);
            }

            return narseseData;
        }, 'translate', null);
    }

    _translateTestResults(testData, narseseData) {
        // Translate test suite information
        testData.suites.forEach(suite => {
            const suiteKey = `test_suite_${sanitizeKey(suite.name)}`;

            // Fact about suite execution
            narseseData.facts.push({
                term: new Term(`(${suiteKey} execution_status ${suite.status})`),
                truth: {
                    frequency: suite.status === 'pass' ? 1.0 :
                        suite.status === 'fail' ? 0.0 : 0.5,
                    confidence: this.config.testSuiteExecutionConfidence
                }
            });

            // Implication about suite duration
            if (suite.duration > 0) {
                const durationCategory = categorizeDuration(suite.duration);
                narseseData.implications.push({
                    term: new Term(`(${suiteKey} duration_category ${durationCategory})`),
                    truth: {
                        frequency: 1.0,
                        confidence: this.config.testSuiteDurationConfidence
                    }
                });
            }
        });

        // Translate test failures
        testData.failures.forEach(failure => {
            const testKey = `test_${sanitizeKey(failure.fullName)}`;
            const suiteKey = `test_suite_${sanitizeKey(failure.suite)}`;

            // Fact about test failure
            narseseData.facts.push({
                term: new Term(`(${testKey} has_status failed)`),
                truth: {
                    frequency: 1.0,
                    confidence: this.config.testFailureConfidence
                }
            });

            // Implication: if test fails, suite has failures
            narseseData.implications.push({
                term: new Term(`((${testKey} has_status failed) ==> (${suiteKey} has_failures))`),
                truth: {
                    frequency: 0.9,
                    confidence: this.config.testFailureImplicationConfidence
                }
            });

            // Extract error patterns from failure messages
            if (failure.failureMessages && failure.failureMessages.length > 0) {
                failure.failureMessages.forEach(message => {
                    const patterns = extractErrorPatterns(message);
                    patterns.forEach(pattern => {
                        narseseData.facts.push({
                            term: new Term(`(${testKey} error_pattern ${pattern})`),
                            truth: {
                                frequency: 1.0,
                                confidence: this.config.testErrorPatternConfidence
                            }
                        });
                    });
                });
            }
        });

        // Translate coverage information to goals
        if (testData.summary) {
            // Goal for test pass rate
            const passRate = testData.summary.totalTests > 0 ?
                testData.summary.passedTests / testData.summary.totalTests : 0;

            narseseData.goals.push({
                term: new Term('(system test_pass_rate 1.0)'),
                truth: {
                    frequency: passRate,
                    confidence: this.config.testSummaryConfidence
                }
            });
        }
    }

    _translateCoverageData(coverageData, narseseData) {
        Object.entries(coverageData.files).forEach(([filePath, coverage]) => {
            const fileKey = `file_${sanitizeKey(filePath)}`;

            // Facts about coverage percentages
            ['statements', 'branches', 'functions', 'lines'].forEach(type => {
                if (coverage[type]) {
                    const pct = coverage[type].pct;
                    const coverageLevel = categorizeCoverage(pct);

                    narseseData.facts.push({
                        term: new Term(`(${fileKey} ${type}_coverage ${coverageLevel})`),
                        truth: {
                            frequency: pct / 100,
                            confidence: this.config.coverageStatementConfidence
                        }
                    });

                    // Create goals for low coverage
                    if (pct < 80) { // Below 80% is considered low
                        narseseData.goals.push({
                            term: new Term(`(${fileKey} ${type}_coverage high)`),
                            truth: {
                                frequency: pct / 100,
                                confidence: this.config.coverageCategoryConfidence
                            }
                        });
                    }
                }
            });
        });

        // Overall coverage summary
        const summary = coverageData.summary;
        if (summary.statements && summary.branches && summary.functions && summary.lines) {
            const avgCoverage = (summary.statements.pct + summary.branches.pct +
                summary.functions.pct + summary.lines.pct) / 4;

            narseseData.facts.push({
                term: new Term('(system overall_coverage_quality good)'),
                truth: {
                    frequency: avgCoverage / 100,
                    confidence: this.config.coverageAverageConfidence
                }
            });
        }
    }

    _translateProfilingData(profilingData, narseseData) {
        // Translate function performance data
        profilingData.functions.forEach(func => {
            const funcKey = `function_${sanitizeKey(func.name)}`;

            // Fact about function performance
            const performanceCategory = categorizePerformance(func.averageTime);
            narseseData.facts.push({
                term: new Term(`(${funcKey} performance ${performanceCategory})`),
                truth: {
                    frequency: calculatePerformanceFrequency(func.averageTime),
                    confidence: this.config.profilingConfidence
                }
            });

            // Implication: slow functions may cause bottlenecks
            if (performanceCategory === 'slow' || performanceCategory === 'very_slow') {
                narseseData.implications.push({
                    term: new Term(`((${funcKey} performance ${performanceCategory}) ==> (${funcKey} is_bottleneck))`),
                    truth: {
                        frequency: 0.7,
                        confidence: this.config.performanceStatementConfidence
                    }
                });
            }
        });

        // Translate bottlenecks
        profilingData.bottlenecks.forEach(bottleneck => {
            const funcKey = `function_${sanitizeKey(bottleneck.name)}`;

            narseseData.facts.push({
                term: new Term(`(${funcKey} is_bottleneck)`),
                truth: {
                    frequency: 0.9,
                    confidence: this.config.performanceCategoryConfidence
                }
            });

            // Goal to optimize bottleneck
            narseseData.goals.push({
                term: new Term(`(${funcKey} performance fast)`),
                truth: {
                    frequency: 0.1, // Currently slow
                    confidence: this.config.performanceTrendConfidence
                }
            });
        });
    }
}

export default NarseseTranslator;