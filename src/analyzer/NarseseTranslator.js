import { createModuleErrorHandler } from '../utils/errorHandler.js';
import Term from '../core/Term.js';

const errorHandler = createModuleErrorHandler('NarseseTranslator');

class NarseseTranslator {
    constructor(config = {}) {
        this.config = {
            termSimilarityThreshold: config.termSimilarityThreshold || 0.7,
            confidenceThreshold: config.confidenceThreshold || 0.5,
            ...config
        };
    }
    
    async translate(testData, coverageData = null, profilingData = null) {
        return errorHandler.safeAsync(async () => {
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
            const suiteKey = `test_suite_${this._sanitizeKey(suite.name)}`;
            
            // Fact about suite execution
            narseseData.facts.push({
                term: new Term(`(${suiteKey} execution_status ${suite.status})`),
                truth: {
                    frequency: suite.status === 'pass' ? 1.0 : 
                              suite.status === 'fail' ? 0.0 : 0.5,
                    confidence: 0.9
                }
            });
            
            // Implication about suite duration
            if (suite.duration > 0) {
                const durationCategory = this._categorizeDuration(suite.duration);
                narseseData.implications.push({
                    term: new Term(`(${suiteKey} duration_category ${durationCategory})`),
                    truth: {
                        frequency: 1.0,
                        confidence: 0.8
                    }
                });
            }
        });
        
        // Translate test failures
        testData.failures.forEach(failure => {
            const testKey = `test_${this._sanitizeKey(failure.fullName)}`;
            const suiteKey = `test_suite_${this._sanitizeKey(failure.suite)}`;
            
            // Fact about test failure
            narseseData.facts.push({
                term: new Term(`(${testKey} has_status failed)`),
                truth: {
                    frequency: 1.0,
                    confidence: 0.95
                }
            });
            
            // Implication: if test fails, suite has failures
            narseseData.implications.push({
                term: new Term(`((${testKey} has_status failed) ==> (${suiteKey} has_failures))`),
                truth: {
                    frequency: 0.9,
                    confidence: 0.8
                }
            });
            
            // Extract error patterns from failure messages
            if (failure.failureMessages && failure.failureMessages.length > 0) {
                failure.failureMessages.forEach(message => {
                    const patterns = this._extractErrorPatterns(message);
                    patterns.forEach(pattern => {
                        narseseData.facts.push({
                            term: new Term(`(${testKey} error_pattern ${pattern})`),
                            truth: {
                                frequency: 1.0,
                                confidence: 0.9
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
                    confidence: 0.9
                }
            });
        }
    }
    
    _translateCoverageData(coverageData, narseseData) {
        Object.entries(coverageData.files).forEach(([filePath, coverage]) => {
            const fileKey = `file_${this._sanitizeKey(filePath)}`;
            
            // Facts about coverage percentages
            ['statements', 'branches', 'functions', 'lines'].forEach(type => {
                if (coverage[type]) {
                    const pct = coverage[type].pct;
                    const coverageLevel = this._categorizeCoverage(pct);
                    
                    narseseData.facts.push({
                        term: new Term(`(${fileKey} ${type}_coverage ${coverageLevel})`),
                        truth: {
                            frequency: pct / 100,
                            confidence: 0.9
                        }
                    });
                    
                    // Create goals for low coverage
                    if (pct < 80) { // Below 80% is considered low
                        narseseData.goals.push({
                            term: new Term(`(${fileKey} ${type}_coverage high)`),
                            truth: {
                                frequency: pct / 100,
                                confidence: 0.8
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
                    confidence: 0.9
                }
            });
        }
    }
    
    _translateProfilingData(profilingData, narseseData) {
        // Translate function performance data
        profilingData.functions.forEach(func => {
            const funcKey = `function_${this._sanitizeKey(func.name)}`;
            
            // Fact about function performance
            const performanceCategory = this._categorizePerformance(func.averageTime);
            narseseData.facts.push({
                term: new Term(`(${funcKey} performance ${performanceCategory})`),
                truth: {
                    frequency: this._calculatePerformanceFrequency(func.averageTime),
                    confidence: 0.8
                }
            });
            
            // Implication: slow functions may cause bottlenecks
            if (performanceCategory === 'slow' || performanceCategory === 'very_slow') {
                narseseData.implications.push({
                    term: new Term(`((${funcKey} performance ${performanceCategory}) ==> (${funcKey} is_bottleneck))`),
                    truth: {
                        frequency: 0.7,
                        confidence: 0.7
                    }
                });
            }
        });
        
        // Translate bottlenecks
        profilingData.bottlenecks.forEach(bottleneck => {
            const funcKey = `function_${this._sanitizeKey(bottleneck.name)}`;
            
            narseseData.facts.push({
                term: new Term(`(${funcKey} is_bottleneck)`),
                truth: {
                    frequency: 0.9,
                    confidence: 0.9
                }
            });
            
            // Goal to optimize bottleneck
            narseseData.goals.push({
                term: new Term(`(${funcKey} performance fast)`),
                truth: {
                    frequency: 0.1, // Currently slow
                    confidence: 0.9
                }
            });
        });
    }
    
    _sanitizeKey(str) {
        return str.replace(/[^a-zA-Z0-9_]/g, '_');
    }
    
    _categorizeDuration(ms) {
        if (ms < 100) return 'fast';
        if (ms < 1000) return 'medium';
        if (ms < 5000) return 'slow';
        return 'very_slow';
    }
    
    _categorizeCoverage(pct) {
        if (pct >= 90) return 'high';
        if (pct >= 70) return 'medium';
        if (pct >= 50) return 'low';
        return 'very_low';
    }
    
    _categorizePerformance(ms) {
        if (ms < 5) return 'fast';
        if (ms < 50) return 'medium';
        if (ms < 200) return 'slow';
        return 'very_slow';
    }
    
    _calculatePerformanceFrequency(ms) {
        // Convert milliseconds to frequency (0-1 scale)
        // Lower ms should result in higher frequency (better performance)
        return Math.max(0, Math.min(1, 1 - (ms / 1000)));
    }
    
    _extractErrorPatterns(errorMessage) {
        const patterns = [];
        
        // Common error pattern matching
        if (errorMessage.includes('TypeError')) patterns.push('type_error');
        if (errorMessage.includes('ReferenceError')) patterns.push('reference_error');
        if (errorMessage.includes('expect(')) patterns.push('assertion_failure');
        if (errorMessage.includes('undefined') || errorMessage.includes('null')) patterns.push('null_undefined_error');
        if (errorMessage.includes('Cannot set property')) patterns.push('property_assignment_error');
        if (errorMessage.includes('Expected') && errorMessage.includes('found')) patterns.push('parse_error');
        
        return patterns.length > 0 ? patterns : ['unclassified_error'];
    }
}

export default NarseseTranslator;