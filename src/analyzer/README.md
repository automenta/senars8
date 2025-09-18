# Unit Test Analyzer

A SeNARS-powered diagnostic tool for analyzing unit test failures, coverage, and performance bottlenecks.

## Overview

The Unit Test Analyzer applies SeNARS reasoning to automatically diagnose issues in your test suite by:

- Identifying patterns in test failures
- Analyzing code coverage gaps
- Detecting performance bottlenecks
- Generating actionable recommendations
- Creating detailed reports with insights

## Features

- **Test Failure Analysis**: Identifies common error patterns and root causes
- **Coverage Analysis**: Highlights under-tested code areas
- **Performance Analysis**: Detects slow functions and bottlenecks
- **SeNARS Reasoning**: Uses formal reasoning to find correlations and causations
- **Multiple Report Formats**: JSON, text, HTML, and Markdown output
- **CLI Tool**: Command-line interface for easy integration

## Installation

The analyzer is included as part of the SeNARS project. No additional installation is required.

## Usage

### As a Library

```javascript
import UnitTestAnalyzer from './src/analyzer/index.js';

const analyzer = new UnitTestAnalyzer({
    enableCoverageAnalysis: true,
    enablePerformanceAnalysis: true
});

// Analyze test data
const results = await analyzer.analyzeTestData(testData, coverageData, profilingData);

// Generate reports
const textReport = analyzer.generateReport('text');
const htmlReport = await analyzer.generateDetailedReport('html');
```

### Command Line Interface

```bash
# Analyze test results only
node analyzer-cli.js --test-results ./test-results.json

# Analyze with coverage data
node analyzer-cli.js --test-results ./test-results.json --coverage ./coverage.json

# Generate HTML report
node analyzer-cli.js --test-results ./test-results.json --format html --output report.html
```

### Demo

Run the built-in demo to see the analyzer in action:

```bash
npm run start:analyzer
```

## API

### UnitTestAnalyzer

#### Constructor

```javascript
new UnitTestAnalyzer(config)
```

**Config Options:**
- `enableCoverageAnalysis` (boolean): Enable coverage analysis (default: true)
- `enablePerformanceAnalysis` (boolean): Enable performance analysis (default: true)
- `enableFailureAnalysis` (boolean): Enable failure analysis (default: true)

#### Methods

##### analyzeTestData(testResults, coverageData, profilingData)

Analyzes the provided test data and returns structured results.

##### generateReport(format)

Generates a report in the specified format ('json', 'text').

##### generateDetailedReport(format)

Generates a detailed report in the specified format ('html', 'markdown').

## Data Formats

### Test Results

The analyzer expects test results in a Jest-compatible format with the following structure:

```json
{
  "testResults": [
    {
      "testFilePath": "path/to/test/file.js",
      "perfStats": {
        "runtime": 120
      },
      "numPassingTests": 5,
      "numFailingTests": 2,
      "testResults": [
        {
          "title": "test name",
          "fullName": "full test name",
          "status": "passed|failed",
          "duration": 15,
          "failureMessages": ["error message"],
          "ancestorTitles": ["describe block", "test suite"]
        }
      ]
    }
  ]
}
```

### Coverage Data

Coverage data should follow the Istanbul coverage format:

```json
{
  "total": {
    "statements": { "covered": 850, "total": 1000, "pct": 85 },
    "branches": { "covered": 420, "total": 500, "pct": 84 },
    "functions": { "covered": 170, "total": 200, "pct": 85 },
    "lines": { "covered": 850, "total": 1000, "pct": 85 }
  }
}
```

### Profiling Data

Profiling data should include function performance metrics:

```json
{
  "functions": [
    {
      "name": "functionName",
      "file": "path/to/file.js",
      "lineNumber": 42,
      "calls": 100,
      "totalTime": 50,
      "averageTime": 0.5,
      "maxTime": 2.1
    }
  ]
}
```

## Analysis Capabilities

### Issue Detection

The analyzer identifies several types of issues:

1. **Test Failures**: Categorizes failures by error patterns
2. **Common Error Patterns**: Groups similar failures together
3. **Low Code Coverage**: Highlights under-tested files and functions
4. **Performance Bottlenecks**: Identifies slow functions
5. **Multi-issue Entities**: Finds components with multiple problem types

### Recommendation Generation

Based on the analysis, the analyzer generates prioritized recommendations:

1. **Increase Coverage**: Suggests writing tests for under-covered code
2. **Optimize Functions**: Recommends performance improvements
3. **Fix Common Patterns**: Provides solutions for recurring error types

### Pattern Recognition

The analyzer uses SeNARS reasoning to identify:

1. **Correlations**: Relationships between different issue types
2. **Causations**: Cause-effect relationships in the codebase
3. **Entity Clustering**: Groups of related issues across the system

## Report Examples

### Text Report

```
SUMMARY
-------
Total Issues: 15
Critical Issues: 11
Major Issues: 4
Recommendations: 2

ISSUES
------
1. [HIGH] Test test_ConfigManager_should_handle_different_data_types_for_getters is failing
   Entity: test_ConfigManager_should_handle_different_data_types_for_getters
   Confidence: 95.0%

RECOMMENDATIONS
---------------
1. [HIGH] Optimize function function_MemoryIndexer__indexImplication to improve performance
   Entity: function_MemoryIndexer__indexImplication
```

### HTML Report

The HTML report provides a rich, interactive dashboard with:

- Visual summary cards
- Color-coded issue severity
- Expandable issue details
- Pattern visualization
- Recommendation prioritization

## Integration

The analyzer can be easily integrated into existing CI/CD pipelines or development workflows. The JSON output format makes it simple to parse and incorporate into automated systems.

## Contributing

Contributions are welcome! Please see the main SeNARS contributing guidelines.

## License

AGPL-3.0-or-later