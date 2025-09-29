import fs from 'fs';
import path from 'path';
import {glob} from 'glob';
import {debug, info, warn} from './logger.js';
import {createUnifiedErrorHandler} from './errorHandler.js';

/**
 * Generic PlanProcessor that can process any set of input files to extract goals
 * and convert them to cognitive tasks for the system.
 */
class PlanProcessor {
    constructor(system, options = {}) {
        this.system = system;
        this.errorHandler = createUnifiedErrorHandler('PlanProcessor');
        this.defaultPatterns = options.patterns || ['**/*.md', '**/*.txt', '**/*.plan'];
        this.watchDir = options.watchDir || process.cwd();
        this.fileProcessors = options.fileProcessors || this.getDefaultProcessors();
        this.processedGoals = [];
        this.fileContentCache = new Map();
        this.processors = new Map();
    }

    getDefaultProcessors() {
        return {
            '.md': this.processMarkdownFile.bind(this),
            '.txt': this.processTextFile.bind(this),
            '.plan': this.processPlanFile.bind(this),
            '.json': this.processJsonFile.bind(this),
            '.yaml': this.processYamlFile.bind(this),
            '.yml': this.processYamlFile.bind(this),
        };
    }

    async initialize() {
        info('Initializing PlanProcessor...');

        // Register built-in processors
        this.registerProcessor('.md', this.processMarkdownFile.bind(this));
        this.registerProcessor('.txt', this.processTextFile.bind(this));
        this.registerProcessor('.plan', this.processPlanFile.bind(this));
        this.registerProcessor('.json', this.processJsonFile.bind(this));
        this.registerProcessor('.yaml', this.processYamlFile.bind(this));
        this.registerProcessor('.yml', this.processYamlFile.bind(this));

        info('PlanProcessor initialized');
        return true;
    }

    /**
     * Register a custom processor for specific file types
     */
    registerProcessor(extension, processorFunction) {
        this.processors.set(extension, processorFunction);
    }

    /**
     * Process files based on patterns
     */
    async processFiles(filePaths, options = {}) {
        let paths = filePaths;
        if (typeof filePaths === 'string') {
            paths = [filePaths];
        } else if (Array.isArray(filePaths) && filePaths.length === 1 && typeof filePaths[0] === 'string' && filePaths[0].includes('*')) {
            // If it's a glob pattern, expand it
            paths = glob.sync(filePaths[0]);
        }

        const allGoals = [];

        for (const filePath of paths) {
            try {
                const goals = await this.processFile(filePath, options);
                allGoals.push(...goals);
            } catch (error) {
                warn(`Failed to process file ${filePath}:`, error.message);
            }
        }

        return allGoals;
    }

    /**
     * Process a single file
     */
    async processFile(filePath, options = {}) {
        const stats = fs.statSync(filePath);
        const mtime = stats.mtimeMs;

        // Check cache to avoid reprocessing unchanged files
        const cacheKey = `${filePath}:${mtime}`;
        if (this.fileContentCache.has(cacheKey)) {
            debug(`File ${filePath} unchanged, using cache`);
            return this.fileContentCache.get(cacheKey);
        }

        const extension = path.extname(filePath).toLowerCase();
        const processor = this.processors.get(extension) || this.processTextFile.bind(this);

        const content = fs.readFileSync(filePath, 'utf8');
        const goals = await processor(filePath, content, options);

        // Cache the results
        this.fileContentCache.set(cacheKey, goals);

        // Store goals for statistics
        this.processedGoals.push(...goals);

        info(`Processed ${goals.length} goals from ${filePath}`);
        return goals;
    }

    /**
     * Process Markdown files to extract goals and tasks
     */
    async processMarkdownFile(filePath, content, options = {}) {
        const goals = [];

        // Common patterns for identifying goals/tasks in markdown
        const patterns = [
            // Checklist items
            /-\s+\[([x\s])\]\s+(.+)/g,
            // Bold items (often goals)
            /-\s+\*\*([^*]+)\*\*/g,
            // List items with specific keywords
            /-\s+(implement|create|add|build|develop|design|plan|enhance|improve|fix|resolve|test)\s+(.+)/gi,
            // Numbered sections with tasks
            /\d+\.\d*.*?\n(?:\s+)?-\s+(.+)/g,
            // H3/H4 headers (often section titles that represent goals)
            /###\s+(.+)$/gm,
            /####\s+(.+)$/gm,
        ];

        for (const pattern of patterns) {
            let match;
            while ((match = pattern.exec(content)) !== null) {
                const description = match[2] || match[1];
                if (description && this.isValidGoal(description)) {
                    goals.push({
                        id: `${path.basename(filePath)}-${goals.length}`,
                        content: this.cleanGoalText(description),
                        sourceFile: filePath,
                        type: 'goal',
                        priority: this.estimatePriority(description),
                        createdAt: new Date().toISOString(),
                    });
                }
            }
        }

        return goals;
    }

    /**
     * Process plain text files
     */
    async processTextFile(filePath, content, options = {}) {
        const goals = [];
        const lines = content.split('\n');

        for (const line of lines) {
            if (this.lineContainsGoal(line)) {
                const goalText = this.cleanGoalText(line);
                if (goalText) {
                    goals.push({
                        id: `${path.basename(filePath)}-${goals.length}`,
                        content: goalText,
                        sourceFile: filePath,
                        type: 'goal',
                        priority: this.estimatePriority(goalText),
                        createdAt: new Date().toISOString(),
                    });
                }
            }
        }

        return goals;
    }

    /**
     * Process plan-specific files (structured format)
     */
    async processPlanFile(filePath, content, options = {}) {
        // For now, treat as markdown, but this could be extended for specific plan formats
        return this.processMarkdownFile(filePath, content, options);
    }

    /**
     * Process JSON files (structured goals)
     */
    async processJsonFile(filePath, content, options = {}) {
        try {
            const data = JSON.parse(content);
            const goals = [];

            // Extract goals from various JSON structures
            if (Array.isArray(data)) {
                // Array of goals
                for (const item of data) {
                    if (typeof item === 'object' && item.description) {
                        goals.push({
                            id: `${path.basename(filePath)}-${goals.length}`,
                            content: item.description,
                            sourceFile: filePath,
                            type: item.type || 'goal',
                            priority: item.priority || this.estimatePriority(item.description),
                            createdAt: new Date().toISOString(),
                        });
                    } else if (typeof item === 'string') {
                        goals.push({
                            id: `${path.basename(filePath)}-${goals.length}`,
                            content: item,
                            sourceFile: filePath,
                            type: 'goal',
                            priority: this.estimatePriority(item),
                            createdAt: new Date().toISOString(),
                        });
                    }
                }
            } else if (typeof data === 'object' && data.goals) {
                // Object with goals property
                for (const goal of data.goals) {
                    goals.push({
                        id: `${path.basename(filePath)}-${goals.length}`,
                        content: goal.description || goal.content || goal,
                        sourceFile: filePath,
                        type: goal.type || 'goal',
                        priority: goal.priority || this.estimatePriority(goal.description || goal.content || goal),
                        createdAt: new Date().toISOString(),
                    });
                }
            }

            return goals;
        } catch (error) {
            warn(`Invalid JSON in ${filePath}:`, error.message);
            return [];
        }
    }

    /**
     * Process YAML files (structured goals)
     */
    async processYamlFile(filePath, content, options = {}) {
        try {
            // Import YAML parser dynamically to avoid dependency issues if it's not available
            let yaml;
            try {
                yaml = await import('yaml');
            } catch {
                // If yaml isn't available, treat as regular text
                return this.processTextFile(filePath, content, options);
            }

            const data = yaml.parse(content);
            const goals = [];

            // Extract goals from YAML structures (same logic as JSON)
            if (Array.isArray(data)) {
                for (const item of data) {
                    if (typeof item === 'object' && item.description) {
                        goals.push({
                            id: `${path.basename(filePath)}-${goals.length}`,
                            content: item.description,
                            sourceFile: filePath,
                            type: item.type || 'goal',
                            priority: item.priority || this.estimatePriority(item.description),
                            createdAt: new Date().toISOString(),
                        });
                    } else if (typeof item === 'string') {
                        goals.push({
                            id: `${path.basename(filePath)}-${goals.length}`,
                            content: item,
                            sourceFile: filePath,
                            type: 'goal',
                            priority: this.estimatePriority(item),
                            createdAt: new Date().toISOString(),
                        });
                    }
                }
            } else if (typeof data === 'object' && data.goals) {
                for (const goal of data.goals) {
                    goals.push({
                        id: `${path.basename(filePath)}-${goals.length}`,
                        content: goal.description || goal.content || goal,
                        sourceFile: filePath,
                        type: goal.type || 'goal',
                        priority: goal.priority || this.estimatePriority(goal.description || goal.content || goal),
                        createdAt: new Date().toISOString(),
                    });
                }
            }

            return goals;
        } catch (error) {
            warn(`Invalid YAML in ${filePath}:`, error.message);
            return [];
        }
    }

    /**
     * Helper methods
     */
    isValidGoal(text) {
        // Filter out short, non-descriptive texts
        return text && text.length > 5 && text.length < 500;
    }

    lineContainsGoal(line) {
        const lowerLine = line.toLowerCase();
        const goalKeywords = [
            'implement', 'create', 'add', 'build', 'develop', 'design',
            'plan', 'enhance', 'improve', 'fix', 'resolve', 'test',
            'goal:', 'task:', 'objective:', 'requirement:'
        ];

        return goalKeywords.some(keyword => lowerLine.includes(keyword)) ||
            (line.startsWith('- ') && !line.startsWith('- [')) ||
            (line.includes('[ ]') || line.includes('[x]'));
    }

    cleanGoalText(text) {
        if (!text) return null;

        return text
            .replace(/\*\*(.*?)\*\*/g, '$1')  // Remove bold
            .replace(/`([^`]+)`/g, '$1')      // Remove code formatting
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')  // Remove links
            .replace(/\[([x\s])\]\s*/, '')    // Remove checkbox markers
            .replace(/^\s*[-*+]\s*/, '')      // Remove list markers
            .replace(/^\s*###?\s*/, '')       // Remove heading markers
            .trim();
    }

    estimatePriority(text) {
        const lowerText = text.toLowerCase();

        // High priority keywords
        const highPriority = ['critical', 'essential', 'must', 'required', 'urgent', 'immediate', 'core', 'fundamental'];
        // Medium priority keywords
        const mediumPriority = ['important', 'should', 'need', 'recommended', 'desirable', 'helpful'];

        if (highPriority.some(keyword => lowerText.includes(keyword))) {
            return 0.9;
        } else if (mediumPriority.some(keyword => lowerText.includes(keyword))) {
            return 0.7;
        }

        return 0.5;
    }

    /**
     * Convert extracted goals to cognitive tasks
     */
    convertGoalsToTasks(goals) {
        if (!this.system?.memory?.Task) {
            // If system isn't available, return as-is or create basic task objects
            return goals.map(goal => ({
                content: goal.content,
                priority: goal.priority,
                source: goal.sourceFile
            }));
        }

        return goals.map(goal => {
            const Task = this.system.memory.Task;
            const punctuation = goal.content.toLowerCase().includes('implement') ||
            goal.content.toLowerCase().includes('create') ||
            goal.content.toLowerCase().includes('add') ? '!' : '.';

            return Task.createInner(
                goal.content,
                punctuation,
                {
                    frequency: 0.9,
                    confidence: goal.priority
                }
            );
        });
    }

    /**
     * Get processing statistics
     */
    getStatistics() {
        return {
            processedGoalsCount: this.processedGoals.length,
            uniqueFilesProcessed: [...new Set(this.processedGoals.map(g => g.sourceFile))].length,
            goals: this.processedGoals,
            cacheSize: this.fileContentCache.size
        };
    }

    /**
     * Reset processor state
     */
    reset() {
        this.processedGoals = [];
        this.fileContentCache.clear();
    }
}

export default PlanProcessor;