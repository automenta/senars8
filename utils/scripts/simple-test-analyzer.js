#!/usr/bin/env node

import fs from 'fs';

// Read the test results
const testResultsData = JSON.parse(fs.readFileSync('./test-results.json', 'utf8'));

// Extract failures
const failures = [];
testResultsData.testResults.forEach(suite => {
    if (suite.status === 'failed') {
        // For failed suites, the message contains the failure details
        failures.push({
            suite: suite.name,
            testName: suite.name.split('/').pop(), // Just the file name
            failureMessages: [suite.message] // The message contains all failure details
        });
    }

    // Also check individual assertion results
    if (suite.assertionResults) {
        suite.assertionResults.forEach(test => {
            if (test.status === 'failed') {
                failures.push({
                    suite: suite.name,
                    testName: test.title,
                    failureMessages: test.failureMessages || []
                });
            }
        });
    }
});

// Categorize failures
const failureCategories = {};
const errorPatterns = {};

failures.forEach(failure => {
    // Extract error patterns
    failure.failureMessages.forEach(message => {
        // Common error pattern matching
        if (message.includes('TypeError: Cannot set property')) {
            errorPatterns.property_assignment_error = (errorPatterns.property_assignment_error || 0) + 1;
        } else if (message.includes('Configuration value') && message.includes('must be a boolean')) {
            errorPatterns.config_boolean_error = (errorPatterns.config_boolean_error || 0) + 1;
        } else if (message.includes('Expected: 0.8') && message.includes('Received: 0.75')) {
            errorPatterns.similarity_calc_error = (errorPatterns.similarity_calc_error || 0) + 1;
        } else if (message.includes('expect(received).not.toBeNull()') && message.includes('Received: null')) {
            errorPatterns.planner_null_error = (errorPatterns.planner_null_error || 0) + 1;
        } else if (message.includes('expect(received).toBe(false)') && message.includes('Received: undefined')) {
            errorPatterns.planner_undefined_error = (errorPatterns.planner_undefined_error || 0) + 1;
        } else if (message.includes("Expected substring") && message.includes("Received message")) {
            errorPatterns.validation_message_error = (errorPatterns.validation_message_error || 0) + 1;
        } else if (message.includes('SyntaxError') && message.includes('Unexpected token')) {
            errorPatterns.syntax_error = (errorPatterns.syntax_error || 0) + 1;
        } else {
            // Generic pattern
            const genericPattern = 'other_error';
            errorPatterns[genericPattern] = (errorPatterns[genericPattern] || 0) + 1;
        }
    });

    // Categorize by suite
    const suiteName = failure.suite.split('/').pop();
    failureCategories[suiteName] = (failureCategories[suiteName] || 0) + 1;
});

// Print summary
console.log('=== Test Failure Analysis ===\n');
console.log('Total failures:', failures.length);
console.log('\nFailures by suite:');
Object.entries(failureCategories).forEach(([suite, count]) => {
    console.log(`  ${suite}: ${count}`);
});

console.log('\nError patterns:');
Object.entries(errorPatterns).forEach(([pattern, count]) => {
    console.log(`  ${pattern}: ${count}`);
});

// Print detailed failures
console.log('\n=== DETAILED FAILURES ===\n');
failures.slice(0, 5).forEach((failure, index) => {
    console.log(`${index + 1}. ${failure.testName}`);
    console.log(`   Suite: ${failure.suite}`);
    if (failure.failureMessages.length > 0 && failure.failureMessages[0].length > 0) {
        // Get first 500 characters of the first failure message
        const message = failure.failureMessages[0];
        console.log(`   Error: ${message.substring(0, 500)}${message.length > 500 ? '...' : ''}`);
    }
    console.log('');
});