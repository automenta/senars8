import path from 'path';
import fs from 'fs';

/**
 * Configuration for the File Monitoring Agent
 */
class FileMonitoringConfig {
    constructor(options = {}) {
        // Default configuration
        this.config = {
            // File patterns to monitor
            patterns: options.patterns || ['docs/**/*.md', 'PLAN.*.md', 'TODO.md', 'ROADMAP.md'],

            // Directory to watch
            watchDir: options.watchDir || process.cwd(),

            // Debounce time in milliseconds (to avoid processing files too frequently)
            debounce: options.debounce || 1000,

            // Whether to keep the process running
            persistent: options.persistent !== false,

            // Whether to follow symlinks
            followSymlinks: options.followSymlinks || false,

            // Whether to ignore initial add events (when first starting)
            ignoreInitial: options.ignoreInitial !== false,

            // Whether to use polling instead of native file system events
            usePolling: options.usePolling || false,

            // Polling interval
            interval: options.interval || 100,

            // Whether to process existing files on startup
            processExistingOnStartup: options.processExistingOnStartup !== false,

            // Custom processors by file extension
            customProcessors: options.customProcessors || {},

            // Priority boost for certain file types or content
            priorityModifiers: options.priorityModifiers || {
                'PLAN.*.md': 0.1,  // Boost priority for plan files
                'critical': 0.2,   // Boost for content containing "critical"
                'urgent': 0.2      // Boost for content containing "urgent"
            },

            // Max file size to process (in bytes)
            maxFileSize: options.maxFileSize || 10 * 1024 * 1024, // 10MB

            // Whether to watch for file changes
            enableWatching: options.enableWatching !== false,

            // Event handlers
            onFileAdded: options.onFileAdded || null,
            onFileChanged: options.onFileChanged || null,
            onFileRemoved: options.onFileRemoved || null,
            onGoalExtracted: options.onGoalExtracted || null,

            // Advanced options for different application domains
            domainSpecificConfig: {
                'development': {
                    patterns: ['**/*.md', '**/*.txt', 'docs/**/*.md', 'TODO.md', 'ROADMAP.md'],
                    priorityModifiers: {
                        'bug': 0.3,
                        'feature': 0.2,
                        'refactor': 0.1
                    }
                },
                'research': {
                    patterns: ['**/*.md', '**/*.txt', '**/*.pdf', '**/*.tex'],
                    priorityModifiers: {
                        'hypothesis': 0.2,
                        'experiment': 0.1,
                        'result': 0.1
                    }
                },
                'business': {
                    patterns: ['**/*.md', '**/*.txt', '**/*.csv', '**/*.yaml', '**/*.json'],
                    priorityModifiers: {
                        'revenue': 0.3,
                        'customer': 0.2,
                        'compliance': 0.3
                    }
                },
                'education': {
                    patterns: ['**/*.md', '**/*.txt', '**/*.pdf'],
                    priorityModifiers: {
                        'assignment': 0.2,
                        'deadline': 0.3,
                        'exam': 0.3
                    }
                }
            }
        };
    }

    /**
     * Load configuration from file
     */
    static async loadFromFile(filePath) {
        if (!fs.existsSync(filePath)) {
            throw new Error(`Configuration file not found: ${filePath}`);
        }

        const content = fs.readFileSync(filePath, 'utf8');

        try {
            const configData = JSON.parse(content);
            return new FileMonitoringConfig(configData);
        } catch (error) {
            throw new Error(`Invalid JSON in configuration file: ${error.message}`);
        }
    }

    /**
     * Save configuration to file
     */
    async saveToFile(filePath) {
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, {recursive: true});
        }

        fs.writeFileSync(filePath, JSON.stringify(this.config, null, 2));
    }

    /**
     * Get configuration for specific domain
     */
    getDomainConfig(domain) {
        const baseConfig = {...this.config};
        const domainConfig = this.config.domainSpecificConfig[domain];

        if (!domainConfig) {
            return baseConfig;
        }

        // Merge domain config with base config
        return {
            ...baseConfig,
            ...domainConfig,
            patterns: [...new Set([...baseConfig.patterns, ...domainConfig.patterns || []])], // Combine and unique
            priorityModifiers: {
                ...baseConfig.priorityModifiers,
                ...domainConfig.priorityModifiers
            }
        };
    }

    /**
     * Get current configuration
     */
    getConfig() {
        return {...this.config};
    }

    /**
     * Update configuration
     */
    updateConfig(newConfig) {
        this.config = {...this.config, ...newConfig};
    }

    /**
     * Get patterns for monitoring
     */
    getPatterns() {
        return this.config.patterns;
    }

    /**
     * Add patterns to monitor
     */
    addPatterns(patterns) {
        if (!Array.isArray(patterns)) {
            patterns = [patterns];
        }

        this.config.patterns = [...new Set([...this.config.patterns, ...patterns])];
    }

    /**
     * Apply priority modifiers based on content and file type
     */
    applyPriorityModifiers(content, filePath, basePriority) {
        let priority = basePriority;

        // Apply file-type specific modifiers
        for (const [pattern, modifier] of Object.entries(this.config.priorityModifiers)) {
            if (filePath.includes(pattern)) {
                priority = Math.min(1.0, priority + modifier);
            }
        }

        // Apply content-based modifiers
        const lowerContent = content.toLowerCase();
        for (const [keyword, modifier] of Object.entries(this.config.priorityModifiers)) {
            if (lowerContent.includes(keyword.toLowerCase())) {
                priority = Math.min(1.0, priority + modifier);
            }
        }

        return Math.max(0.0, Math.min(1.0, priority)); // Clamp between 0 and 1
    }

    /**
     * Check if a file should be processed based on size and type
     */
    shouldProcessFile(filePath) {
        // Check file size
        try {
            const stats = fs.statSync(filePath);
            if (stats.size > this.config.maxFileSize) {
                return false;
            }
        } catch (error) {
            // If we can't stat the file, skip it
            return false;
        }

        // Check if file matches any of our patterns
        const relativePath = path.relative(this.config.watchDir, filePath);
        return this.config.patterns.some(pattern => {
            // Simple pattern matching - in a real implementation you'd use proper glob matching
            if (pattern.includes('*')) {
                // For now, just check if the file extension matches
                const fileExt = path.extname(filePath);
                const patternExt = path.extname(pattern);
                return patternExt === '' || fileExt === patternExt;
            }
            return relativePath.includes(pattern.replace(/\*/g, ''));
        });
    }
}

export default FileMonitoringConfig;