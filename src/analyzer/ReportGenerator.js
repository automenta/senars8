import {createUnifiedErrorHandler} from '../utils/errorHandler.js';

const errorHandler = createUnifiedErrorHandler('ReportGenerator');

class ReportGenerator {
    constructor(config = {}) {
        this.config = {
            includeCharts: config.includeCharts ?? true,
            maxRecommendations: config.maxRecommendations || 10,
            ...config
        };
    }

    generate(analysisResults, format = 'json') {
        return errorHandler.executeSync(() => {
            switch (format.toLowerCase()) {
                case 'json':
                    return this._generateJsonReport(analysisResults);
                case 'text':
                    return this._generateTextReport(analysisResults);
                default:
                    throw new Error(`Unsupported report format: ${format}`);
            }
        }, 'generate', null);
    }

    async generateDetailed(analysisResults, format = 'html') {
        return errorHandler.execute(async () => {
            switch (format.toLowerCase()) {
                case 'html':
                    return this._generateHtmlReport(analysisResults);
                case 'markdown':
                    return this._generateMarkdownReport(analysisResults);
                default:
                    throw new Error(`Unsupported detailed report format: ${format}`);
            }
        }, 'generate-detailed', null);
    }

    _generateJsonReport(analysisResults) {
        return JSON.stringify(analysisResults, null, 2);
    }

    _generateTextReport(analysisResults) {
        let report = 'Unit Test Analysis Report\n';
        report += '========================\n\n';

        // Summary
        const summary = analysisResults.summary;
        report += 'SUMMARY\n';
        report += '-------\n';
        report += `Total Issues: ${summary.totalIssues}\n`;
        report += `Critical Issues: ${summary.criticalIssues}\n`;
        report += `Major Issues: ${summary.majorIssues}\n`;
        report += `Minor Issues: ${summary.minorIssues}\n`;
        report += `Recommendations: ${summary.totalRecommendations}\n\n`;

        // Issues
        report += 'ISSUES\n';
        report += '------\n';
        analysisResults.issues.slice(0, 10).forEach((issue, index) => {
            report += `${index + 1}. [${issue.severity.toUpperCase()}] ${issue.description}\n`;
            report += `   Entity: ${issue.entity || 'N/A'}\n`;
            report += `   Confidence: ${(issue.confidence * 100).toFixed(1)}%\n\n`;
        });

        if (analysisResults.issues.length > 10) {
            report += `... and ${analysisResults.issues.length - 10} more issues\n\n`;
        }

        // Recommendations
        report += 'RECOMMENDATIONS\n';
        report += '---------------\n';
        analysisResults.recommendations.slice(0, this.config.maxRecommendations).forEach((rec, index) => {
            report += `${index + 1}. [${(rec.priority || 'medium').toUpperCase()}] ${rec.description}\n`;
            report += `   Entity: ${rec.entity || 'N/A'}\n\n`;
        });

        return report;
    }

    _generateHtmlReport(analysisResults) {
        let html = `
<!DOCTYPE html>
<html>
<head>
    <title>Unit Test Analysis Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1, h2, h3 { color: #333; }
        .summary-card { background: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .issue { border: 1px solid #ddd; padding: 10px; margin: 10px 0; border-radius: 3px; }
        .high { border-left: 5px solid #d9534f; }
        .medium { border-left: 5px solid #f0ad4e; }
        .low { border-left: 5px solid #5bc0de; }
        .recommendation { border: 1px solid #ddd; padding: 10px; margin: 10px 0; border-radius: 3px; background: #f9f9f9; }
        .high-priority { border-left: 5px solid #d9534f; }
        .medium-priority { border-left: 5px solid #f0ad4e; }
        .chart-container { margin: 20px 0; }
        .pattern { background: #e8f5e9; padding: 10px; margin: 10px 0; border-radius: 3px; }
    </style>
</head>
<body>
    <h1>Unit Test Analysis Report</h1>
    
    <div class="summary-card">
        <h2>Summary</h2>
        <p><strong>Total Issues:</strong> ${analysisResults.summary.totalIssues}</p>
        <p><strong>Critical Issues:</strong> ${analysisResults.summary.criticalIssues}</p>
        <p><strong>Major Issues:</strong> ${analysisResults.summary.majorIssues}</p>
        <p><strong>Minor Issues:</strong> ${analysisResults.summary.minorIssues}</p>
        <p><strong>Recommendations:</strong> ${analysisResults.summary.totalRecommendations}</p>
    </div>
    
    <h2>Issues</h2>
`;

        // Group issues by severity
        const highIssues = analysisResults.issues.filter(i => i.severity === 'high');
        const mediumIssues = analysisResults.issues.filter(i => i.severity === 'medium');
        const lowIssues = analysisResults.issues.filter(i => i.severity === 'low');

        if (highIssues.length > 0) {
            html += `<h3>Critical Issues (${highIssues.length})</h3>`;
            highIssues.forEach(issue => {
                html += `
    <div class="issue high">
        <h4>${issue.description}</h4>
        <p><strong>Entity:</strong> ${issue.entity || 'N/A'}</p>
        <p><strong>Confidence:</strong> ${(issue.confidence * 100).toFixed(1)}%</p>
        <p><strong>Type:</strong> ${issue.type}</p>
    </div>
`;
            });
        }

        if (mediumIssues.length > 0) {
            html += `<h3>Major Issues (${mediumIssues.length})</h3>`;
            mediumIssues.forEach(issue => {
                html += `
    <div class="issue medium">
        <h4>${issue.description}</h4>
        <p><strong>Entity:</strong> ${issue.entity || 'N/A'}</p>
        <p><strong>Confidence:</strong> ${(issue.confidence * 100).toFixed(1)}%</p>
        <p><strong>Type:</strong> ${issue.type}</p>
    </div>
`;
            });
        }

        if (lowIssues.length > 0) {
            html += `<h3>Minor Issues (${lowIssues.length})</h3>`;
            lowIssues.forEach(issue => {
                html += `
    <div class="issue low">
        <h4>${issue.description}</h4>
        <p><strong>Entity:</strong> ${issue.entity || 'N/A'}</p>
        <p><strong>Confidence:</strong> ${(issue.confidence * 100).toFixed(1)}%</p>
        <p><strong>Type:</strong> ${issue.type}</p>
    </div>
`;
            });
        }

        html += `<h2>Recommendations</h2>`;

        const highRecs = analysisResults.recommendations.filter(r => r.priority === 'high');
        const mediumRecs = analysisResults.recommendations.filter(r => r.priority === 'medium');

        if (highRecs.length > 0) {
            html += `<h3>High Priority (${highRecs.length})</h3>`;
            highRecs.forEach(rec => {
                html += `
    <div class="recommendation high-priority">
        <h4>${rec.description}</h4>
        <p><strong>Entity:</strong> ${rec.entity || 'N/A'}</p>
        <p><strong>Type:</strong> ${rec.type}</p>
    </div>
`;
            });
        }

        if (mediumRecs.length > 0) {
            html += `<h3>Medium Priority (${mediumRecs.length})</h3>`;
            mediumRecs.forEach(rec => {
                html += `
    <div class="recommendation medium-priority">
        <h4>${rec.description}</h4>
        <p><strong>Entity:</strong> ${rec.entity || 'N/A'}</p>
        <p><strong>Type:</strong> ${rec.type}</p>
    </div>
`;
            });
        }

        // Patterns
        if (analysisResults.patterns.length > 0) {
            html += `<h2>Identified Patterns (${analysisResults.patterns.length})</h2>`;
            analysisResults.patterns.forEach(pattern => {
                html += `
    <div class="pattern">
        <h4>${pattern.description}</h4>
        <p><strong>Type:</strong> ${pattern.type}</p>
        ${pattern.affectedTests ? `<p><strong>Affected Tests:</strong> ${pattern.affectedTests.join(', ')}</p>` : ''}
    </div>
`;
            });
        }

        html += `
</body>
</html>
`;

        return html;
    }

    _generateMarkdownReport(analysisResults) {
        let md = '# Unit Test Analysis Report\n\n';

        // Summary
        const summary = analysisResults.summary;
        md += '## Summary\n\n';
        md += `| Metric | Value |\n`;
        md += `|--------|-------|\n`;
        md += `| Total Issues | ${summary.totalIssues} |\n`;
        md += `| Critical Issues | ${summary.criticalIssues} |\n`;
        md += `| Major Issues | ${summary.majorIssues} |\n`;
        md += `| Minor Issues | ${summary.minorIssues} |\n`;
        md += `| Recommendations | ${summary.totalRecommendations} |\n\n`;

        // Issues by severity
        md += '## Issues by Severity\n\n';

        const highIssues = analysisResults.issues.filter(i => i.severity === 'high');
        if (highIssues.length > 0) {
            md += `### Critical Issues (${highIssues.length})\n\n`;
            highIssues.forEach((issue, index) => {
                md += `${index + 1}. **${issue.description}**\n`;
                md += `   - Entity: ${issue.entity || 'N/A'}\n`;
                md += `   - Confidence: ${(issue.confidence * 100).toFixed(1)}%\n`;
                md += `   - Type: ${issue.type}\n\n`;
            });
        }

        const mediumIssues = analysisResults.issues.filter(i => i.severity === 'medium');
        if (mediumIssues.length > 0) {
            md += `### Major Issues (${mediumIssues.length})\n\n`;
            mediumIssues.forEach((issue, index) => {
                md += `${index + 1}. **${issue.description}**\n`;
                md += `   - Entity: ${issue.entity || 'N/A'}\n`;
                md += `   - Confidence: ${(issue.confidence * 100).toFixed(1)}%\n`;
                md += `   - Type: ${issue.type}\n\n`;
            });
        }

        // Recommendations
        md += '## Recommendations\n\n';

        const highRecs = analysisResults.recommendations.filter(r => r.priority === 'high');
        if (highRecs.length > 0) {
            md += `### High Priority (${highRecs.length})\n\n`;
            highRecs.forEach((rec, index) => {
                md += `${index + 1}. **${rec.description}**\n`;
                md += `   - Entity: ${rec.entity || 'N/A'}\n`;
                md += `   - Type: ${rec.type}\n\n`;
            });
        }

        const mediumRecs = analysisResults.recommendations.filter(r => r.priority === 'medium');
        if (mediumRecs.length > 0) {
            md += `### Medium Priority (${mediumRecs.length})\n\n`;
            mediumRecs.forEach((rec, index) => {
                md += `${index + 1}. **${rec.description}**\n`;
                md += `   - Entity: ${rec.entity || 'N/A'}\n`;
                md += `   - Type: ${rec.type}\n\n`;
            });
        }

        // Patterns
        if (analysisResults.patterns.length > 0) {
            md += '## Identified Patterns\n\n';
            analysisResults.patterns.forEach((pattern, index) => {
                md += `${index + 1}. **${pattern.description}**\n`;
                md += `   - Type: ${pattern.type}\n`;
                if (pattern.affectedTests) {
                    md += `   - Affected Tests: ${pattern.affectedTests.join(', ')}\n`;
                }
                md += '\n';
            });
        }

        return md;
    }
}

export default ReportGenerator;