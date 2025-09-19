import {createModuleErrorHandler} from '../utils/errorHandler.js';

const errorHandler = createModuleErrorHandler('AnalysisEngine');

class AnalysisEngine {
    constructor(config = {}) {
        this.config = {
            minConfidence: config.minConfidence || 0.5,
            similarityThreshold: config.similarityThreshold || 0.7,
            bottleneckThreshold: config.bottleneckThreshold || 100, // ms
            ...config
        };
    }

    async analyze(narseseData, _config = {}) {
        return errorHandler.safeAsync(async () => {
            const analysis = {
                issues: [],
                recommendations: [],
                patterns: [],
                metrics: {},
                summary: {}
            };

            // Analyze test failures
            this._analyzeTestFailures(narseseData, analysis);

            // Analyze coverage issues
            this._analyzeCoverageIssues(narseseData, analysis);

            // Analyze performance bottlenecks
            this._analyzePerformance(narseseData, analysis);

            // Identify patterns and correlations
            this._identifyPatterns(narseseData, analysis);

            // Generate summary metrics
            this._generateSummary(analysis);

            return analysis;
        }, 'analyze', null);
    }

    _analyzeTestFailures(narseseData, analysis) {
        // Find all failed tests
        const failedTests = narseseData.facts.filter(fact =>
            fact.term.key.includes('has_status failed')
        );

        failedTests.forEach(fact => {
            const testKey = fact.term.key.match(/\((test_[^ ]+) has_status failed\)/)?.[1];
            if (testKey) {
                analysis.issues.push({
                    type: 'test_failure',
                    severity: 'high',
                    entity: testKey,
                    description: `Test ${testKey} is failing`,
                    confidence: fact.truth.confidence
                });
            }
        });

        // Find common error patterns
        const errorPatterns = {};
        narseseData.facts.forEach(fact => {
            const match = fact.term.key.match(/\((test_[^ ]+) error_pattern ([^)]+)\)/);
            if (match) {
                const [, testKey, pattern] = match;
                if (!errorPatterns[pattern]) {
                    errorPatterns[pattern] = [];
                }
                errorPatterns[pattern].push(testKey);
            }
        });

        // Report common patterns
        Object.entries(errorPatterns).forEach(([pattern, tests]) => {
            if (tests.length > 1) {
                analysis.patterns.push({
                    type: 'common_error_pattern',
                    pattern: pattern,
                    affectedTests: tests,
                    count: tests.length,
                    description: `${tests.length} tests have the same error pattern: ${pattern}`
                });

                analysis.issues.push({
                    type: 'common_error_pattern',
                    severity: 'medium',
                    entity: pattern,
                    description: `${tests.length} tests are failing with the same error pattern: ${pattern}`,
                    confidence: 0.8,
                    affectedTests: tests
                });
            }
        });
    }

    _analyzeCoverageIssues(narseseData, analysis) {
        // Find low coverage files
        const lowCoverageFacts = narseseData.facts.filter(fact => {
            const key = fact.term.key;
            return (key.includes('_coverage low') || key.includes('_coverage very_low')) &&
                fact.truth.frequency < 0.8; // Below 80%
        });

        lowCoverageFacts.forEach(fact => {
            const match = fact.term.key.match(/\((file_[^ ]+) ([^ ]+)_coverage ([^)]+)\)/);
            if (match) {
                const [, fileKey, coverageType, level] = match;
                analysis.issues.push({
                    type: 'low_coverage',
                    severity: level === 'very_low' ? 'high' : 'medium',
                    entity: fileKey,
                    description: `File ${fileKey} has ${level} coverage for ${coverageType}`,
                    confidence: fact.truth.confidence,
                    coverageType: coverageType,
                    coverageLevel: level
                });

                analysis.recommendations.push({
                    type: 'increase_coverage',
                    priority: level === 'very_low' ? 'high' : 'medium',
                    entity: fileKey,
                    description: `Write tests to increase ${coverageType} coverage for ${fileKey}`,
                    confidence: 0.9
                });
            }
        });
    }

    _analyzePerformance(narseseData, analysis) {
        // Find performance bottlenecks
        const bottlenecks = narseseData.facts.filter(fact =>
            fact.term.key.includes('is_bottleneck') &&
            fact.truth.frequency > 0.7
        );

        bottlenecks.forEach(fact => {
            const funcKey = fact.term.key.match(/\((function_[^ ]+) is_bottleneck\)/)?.[1];
            if (funcKey) {
                analysis.issues.push({
                    type: 'performance_bottleneck',
                    severity: 'high',
                    entity: funcKey,
                    description: `Function ${funcKey} is a performance bottleneck`,
                    confidence: fact.truth.confidence
                });

                analysis.recommendations.push({
                    type: 'optimize_function',
                    priority: 'high',
                    entity: funcKey,
                    description: `Optimize function ${funcKey} to improve performance`,
                    confidence: 0.9
                });
            }
        });

        // Find slow functions
        const slowFunctions = narseseData.facts.filter(fact => {
            const key = fact.term.key;
            return (key.includes('performance slow') || key.includes('performance very_slow')) &&
                fact.truth.frequency < 0.5; // Poor performance
        });

        slowFunctions.forEach(fact => {
            const match = fact.term.key.match(/\((function_[^ ]+) performance ([^)]+)\)/);
            if (match) {
                const [, funcKey, performance] = match;
                analysis.issues.push({
                    type: 'slow_function',
                    severity: performance === 'very_slow' ? 'high' : 'medium',
                    entity: funcKey,
                    description: `Function ${funcKey} has ${performance} performance`,
                    confidence: fact.truth.confidence
                });
            }
        });
    }

    _identifyPatterns(narseseData, analysis) {
        // Find implications that suggest root causes
        narseseData.implications.forEach(implication => {
            const key = implication.term.key;

            // Pattern: test failure implies suite has failures
            const suiteFailureMatch = key.match(/\(\((test_[^ ]+) has_status failed\) ==> \((test_suite_[^ ]+) has_failures\)\)/);
            if (suiteFailureMatch) {
                const [, testKey, suiteKey] = suiteFailureMatch;
                analysis.patterns.push({
                    type: 'test_suite_correlation',
                    test: testKey,
                    suite: suiteKey,
                    description: `Failure in ${testKey} contributes to suite ${suiteKey} failures`
                });
            }

            // Pattern: slow function implies bottleneck
            const bottleneckMatch = key.match(/\(\((function_[^ ]+) performance (slow|very_slow)\) ==> \((function_[^ ]+) is_bottleneck\)\)/);
            if (bottleneckMatch) {
                const [, funcKey, ,] = bottleneckMatch;
                analysis.patterns.push({
                    type: 'performance_causation',
                    function: funcKey,
                    description: `Slow performance of ${funcKey} causes bottlenecks`
                });
            }
        });

        // Find common entities across different issue types
        const entityIssues = {};
        analysis.issues.forEach(issue => {
            if (issue.entity) {
                if (!entityIssues[issue.entity]) {
                    entityIssues[issue.entity] = [];
                }
                entityIssues[issue.entity].push(issue);
            }
        });

        Object.entries(entityIssues).forEach(([entity, issues]) => {
            if (issues.length > 1) {
                analysis.patterns.push({
                    type: 'multi_issue_entity',
                    entity: entity,
                    issues: issues.map(i => i.type),
                    count: issues.length,
                    description: `Entity ${entity} has ${issues.length} different types of issues`
                });
            }
        });
    }

    _generateSummary(analysis) {
        const summary = {
            totalIssues: analysis.issues.length,
            criticalIssues: analysis.issues.filter(i => i.severity === 'high').length,
            majorIssues: analysis.issues.filter(i => i.severity === 'medium').length,
            minorIssues: analysis.issues.filter(i => i.severity === 'low').length,
            totalRecommendations: analysis.recommendations.length,
            highPriorityRecommendations: analysis.recommendations.filter(r => r.priority === 'high').length
        };

        // Categorize issues
        const issueTypes = {};
        analysis.issues.forEach(issue => {
            if (!issueTypes[issue.type]) {
                issueTypes[issue.type] = 0;
            }
            issueTypes[issue.type]++;
        });
        summary.issueTypes = issueTypes;

        analysis.summary = summary;
    }
}

export default AnalysisEngine;