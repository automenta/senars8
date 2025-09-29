#!/usr/bin/env node

import fs from 'fs';

const patternConfig = {
    property_assignment_error: /TypeError: Cannot set property/,
    config_boolean_error: /Configuration value.*must be a boolean/,
    similarity_calc_error: /Expected: 0\.8.*Received: 0\.75/,
    planner_null_error: /expect\(received\)\.not\.toBeNull\(\).*Received: null/,
    planner_undefined_error: /expect\(received\)\.toBe\(false\).*Received: undefined/,
    validation_message_error: /Expected substring.*Received message/,
    syntax_error: /SyntaxError.*Unexpected token/,
};

const readTestResults = (filePath) => {
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (error) {
        console.error(`Error reading or parsing ${filePath}:`, error);
        return null;
    }
};

const extractFailures = (testResultsData) => {
    const failures = [];
    if (!testResultsData?.testResults) return failures;

    testResultsData.testResults.forEach(suite => {
        if (suite.status === 'failed') {
            failures.push({
                suite: suite.name,
                testName: suite.name.split('/').pop(),
                failureMessages: [suite.message],
            });
        }

        suite.assertionResults?.forEach(test => {
            if (test.status === 'failed') {
                failures.push({
                    suite: suite.name,
                    testName: test.title,
                    failureMessages: test.failureMessages || [],
                });
            }
        });
    });
    return failures;
};

const categorizeFailures = (failures) => {
    const failureCategories = {};
    const errorPatterns = {};

    failures.forEach(failure => {
        failure.failureMessages.forEach(message => {
            let matched = false;
            for (const [key, regex] of Object.entries(patternConfig)) {
                if (regex.test(message)) {
                    errorPatterns[key] = (errorPatterns[key] || 0) + 1;
                    matched = true;
                    break;
                }
            }
            if (!matched) {
                errorPatterns.other_error = (errorPatterns.other_error || 0) + 1;
            }
        });

        const suiteName = failure.suite.split('/').pop();
        failureCategories[suiteName] = (failureCategories[suiteName] || 0) + 1;
    });

    return {failureCategories, errorPatterns};
};

const printSummary = (totalFailures, failureCategories, errorPatterns) => {
    console.log('=== Test Failure Analysis ===\n');
    console.log('Total failures:', totalFailures);
    console.log('\nFailures by suite:');
    Object.entries(failureCategories).forEach(([suite, count]) => {
        console.log(`  ${suite}: ${count}`);
    });
    console.log('\nError patterns:');
    Object.entries(errorPatterns).forEach(([pattern, count]) => {
        console.log(`  ${pattern}: ${count}`);
    });
};

const printDetailedFailures = (failures) => {
    console.log('\n=== DETAILED FAILURES ===\n');
    failures.slice(0, 5).forEach((failure, index) => {
        console.log(`${index + 1}. ${failure.testName}`);
        console.log(`   Suite: ${failure.suite}`);
        if (failure.failureMessages.length > 0 && failure.failureMessages[0].length > 0) {
            const message = failure.failureMessages[0];
            console.log(`   Error: ${message.substring(0, 500)}${message.length > 500 ? '...' : ''}`);
        }
        console.log('');
    });
};

const main = () => {
    const testResultsData = readTestResults('./test-results.json');
    if (!testResultsData) return;

    const failures = extractFailures(testResultsData);
    if (failures.length === 0) {
        console.log('No test failures found.');
        return;
    }

    const {failureCategories, errorPatterns} = categorizeFailures(failures);
    printSummary(failures.length, failureCategories, errorPatterns);
    printDetailedFailures(failures);
};

main();