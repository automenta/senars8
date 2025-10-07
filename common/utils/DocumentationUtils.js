/**
 * Shared Documentation Utilities
 * Common functions for generating documentation for both TUI and Web UI
 */

import {existsSync, mkdirSync, writeFileSync} from 'fs';
import {join} from 'path';

/**
 * Creates a documentation entry for a UI feature
 * @param {string} title - Title of the feature
 * @param {string} description - Description of the feature
 * @param {string} usage - Usage instructions
 * @param {string[]} screenshots - Paths to related screenshots
 * @returns {object} Documentation object
 */
function createFeatureDoc(title, description, usage, screenshots = []) {
    return {
        title,
        description,
        usage,
        screenshots,
        createdAt: new Date().toISOString(),
        version: '1.0'
    };
}

/**
 * Saves documentation to a file
 * @param {object} doc - Documentation object
 * @param {string} filename - Output filename
 * @param {string} outputDir - Output directory
 */
function saveDocumentation(doc, filename, outputDir = './docs') {
    if (!existsSync(outputDir)) {
        mkdirSync(outputDir, {recursive: true});
    }

    const filepath = join(outputDir, filename);
    writeFileSync(filepath, JSON.stringify(doc, null, 2));
    console.log(`Documentation saved: ${filepath}`);
}

/**
 * Generates a README section for UI features
 * @param {object[]} features - Array of feature documentation objects
 * @returns {string} Markdown content
 */
function generateFeaturesReadme(features) {
    let markdown = '# UI Features Documentation\n\n';

    features.forEach((feature, index) => {
        markdown += `## ${index + 1}. ${feature.title}\n\n`;
        markdown += `${feature.description}\n\n`;
        markdown += `### Usage\n\`${feature.usage}\`\n\n`;

        if (feature.screenshots && feature.screenshots.length > 0) {
            markdown += '### Screenshots\n';
            feature.screenshots.forEach(screenshot => {
                markdown += `![${feature.title}](${screenshot})\n`;
            });
            markdown += '\n';
        }
    });

    return markdown;
}

/**
 * Standardizes capture metadata
 * @param {object} captureData - Raw capture data
 * @param {string} captureType - Type of capture (screenshot, asciinema, etc.)
 * @returns {object} Standardized capture object
 */
function standardizeCapture(captureData, captureType) {
    return {
        type: captureType,
        data: captureData,
        timestamp: new Date().toISOString(),
        format: 'standardized',
        metadata: {
            userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'Node.js',
            platform: process.platform,
            version: '1.0'
        }
    };
}

export {
    createFeatureDoc,
    saveDocumentation,
    generateFeaturesReadme,
    standardizeCapture
};