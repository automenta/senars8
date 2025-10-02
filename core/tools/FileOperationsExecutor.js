/**
 * File Operations Executor
 * Provides intelligent file operations with syntax validation, backup, and advanced editing
 */

import { readFile, writeFile, mkdir, copyFile, rename, unlink, access, constants } from 'fs/promises';
import { dirname, join, extname, basename } from 'path';
import { createHash } from 'crypto';
import { debug, error as logError, info, warn } from '../utils/logger.js';
import { createUnifiedErrorHandler } from '../utils/errorHandler.js';

const errorHandler = createUnifiedErrorHandler('FileOperationsExecutor');

class FileOperationsExecutor {
    constructor(config = {}) {
        this.config = {
            backupEnabled: config.backupEnabled ?? true,
            backupDir: config.backupDir || '.senars-backups',
            maxFileSize: config.maxFileSize || 10 * 1024 * 1024, // 10MB
            allowedExtensions: config.allowedExtensions || null, // null means all allowed
            forbiddenPaths: config.forbiddenPaths || ['/etc', '/usr', '/sys', '/proc'],
            validateSyntax: config.validateSyntax ?? true,
            ...config
        };

        this.syntaxValidators = new Map();
        this.initializeSyntaxValidators();

        info('FileOperationsExecutor initialized');
    }

    initializeSyntaxValidators() {
        // JavaScript/TypeScript
        this.syntaxValidators.set('.js', this.validateJavaScript.bind(this));
        this.syntaxValidators.set('.ts', this.validateTypeScript.bind(this));
        this.syntaxValidators.set('.jsx', this.validateJavaScript.bind(this));
        this.syntaxValidators.set('.tsx', this.validateTypeScript.bind(this));

        // JSON
        this.syntaxValidators.set('.json', this.validateJSON.bind(this));

        // YAML
        this.syntaxValidators.set('.yaml', this.validateYAML.bind(this));
        this.syntaxValidators.set('.yml', this.validateYAML.bind(this));

        // Markdown
        this.syntaxValidators.set('.md', this.validateMarkdown.bind(this));

        // HTML/XML
        this.syntaxValidators.set('.html', this.validateHTML.bind(this));
        this.syntaxValidators.set('.xml', this.validateXML.bind(this));
    }

    async read(params) {
        const { path, encoding, maxSize } = {
            encoding: 'utf8',
            maxSize: this.config.maxFileSize,
            ...params
        };

        try {
            // Security checks
            this.validatePath(path);

            // Check file existence
            await access(path, constants.R_OK);

            // Check file size
            const stats = await this.getFileStats(path);
            if (stats.size > maxSize) {
                throw new Error(`File too large: ${stats.size} bytes (max: ${maxSize})`);
            }

            debug(`Reading file: ${path}`);

            const content = await readFile(path, encoding);

            // Detect file type and extract metadata
            const metadata = await this.extractMetadata(path, content);

            const result = {
                success: true,
                path,
                content,
                encoding,
                size: stats.size,
                modified: stats.mtime,
                created: stats.birthtime,
                metadata,
                hash: this.generateHash(content)
            };

            info(`File read successfully: ${path} (${stats.size} bytes)`);
            return result;

        } catch (error) {
            logError(`Failed to read file: ${path}`, error);
            throw error;
        }
    }

    async write(params) {
        const { path, content, encoding, backup, validateSyntax } = {
            encoding: 'utf8',
            backup: this.config.backupEnabled,
            validateSyntax: this.config.validateSyntax,
            ...params
        };

        try {
            // Security checks
            this.validatePath(path);

            // Validate syntax if requested
            if (validateSyntax) {
                await this.validateContent(path, content);
            }

            // Create backup if requested and file exists
            let backupPath = null;
            if (backup) {
                try {
                    await access(path, constants.F_OK);
                    backupPath = await this.createBackup(path);
                } catch (error) {
                    // File doesn't exist, no backup needed
                }
            }

            // Ensure directory exists
            const dir = dirname(path);
            await mkdir(dir, { recursive: true });

            debug(`Writing file: ${path}`);

            await writeFile(path, content, encoding);

            const stats = await this.getFileStats(path);

            const result = {
                success: true,
                path,
                size: stats.size,
                backupPath,
                hash: this.generateHash(content),
                timestamp: new Date().toISOString()
            };

            info(`File written successfully: ${path} (${stats.size} bytes)`);
            return result;

        } catch (error) {
            logError(`Failed to write file: ${path}`, error);
            throw error;
        }
    }

    async edit(params) {
        const { path, operations, backup } = {
            backup: this.config.backupEnabled,
            ...params
        };

        try {
            // Security checks
            this.validatePath(path);

            // Read existing content
            const originalContent = await readFile(path, 'utf8');
            let modifiedContent = originalContent;

            // Create backup if requested
            let backupPath = null;
            if (backup) {
                backupPath = await this.createBackup(path);
            }

            debug(`Editing file: ${path} with ${operations.length} operations`);

            // Apply operations
            const appliedOperations = [];
            for (const operation of operations) {
                try {
                    const result = await this.applyOperation(modifiedContent, operation);
                    modifiedContent = result.content;
                    appliedOperations.push({
                        ...operation,
                        applied: true,
                        changes: result.changes
                    });
                } catch (error) {
                    appliedOperations.push({
                        ...operation,
                        applied: false,
                        error: error.message
                    });
                    warn(`Operation failed: ${operation.type} - ${error.message}`);
                }
            }

            // Validate modified content
            await this.validateContent(path, modifiedContent);

            // Write modified content
            await writeFile(path, modifiedContent, 'utf8');

            const stats = await this.getFileStats(path);

            const result = {
                success: true,
                path,
                operations: appliedOperations,
                backupPath,
                size: stats.size,
                hash: this.generateHash(modifiedContent),
                timestamp: new Date().toISOString()
            };

            info(`File edited successfully: ${path} (${appliedOperations.filter(op => op.applied).length}/${operations.length} operations)`);
            return result;

        } catch (error) {
            logError(`Failed to edit file: ${path}`, error);
            throw error;
        }
    }

    async applyOperation(content, operation) {
        const { type, target, content: newContent, regex } = operation;

        switch (type) {
            case 'replace':
                return this.applyReplace(content, target, newContent, regex);

            case 'insert':
                return this.applyInsert(content, target, newContent, regex);

            case 'delete':
                return this.applyDelete(content, target, regex);

            default:
                throw new Error(`Unknown operation type: ${type}`);
        }
    }

    async applyReplace(content, target, newContent, useRegex = false) {
        if (useRegex) {
            const regex = new RegExp(target, 'g');
            const matches = content.match(regex);
            if (!matches) {
                throw new Error(`No matches found for regex: ${target}`);
            }
            return {
                content: content.replace(regex, newContent),
                changes: matches.length
            };
        } else {
            if (!content.includes(target)) {
                throw new Error(`Target not found: ${target}`);
            }
            return {
                content: content.replace(target, newContent),
                changes: 1
            };
        }
    }

    async applyInsert(content, target, newContent, useRegex = false) {
        if (useRegex) {
            const regex = new RegExp(target);
            const match = content.match(regex);
            if (!match) {
                throw new Error(`No match found for regex: ${target}`);
            }
            const insertPosition = match.index + match[0].length;
            return {
                content: content.slice(0, insertPosition) + newContent + content.slice(insertPosition),
                changes: 1
            };
        } else {
            const insertPosition = content.indexOf(target);
            if (insertPosition === -1) {
                throw new Error(`Target not found: ${target}`);
            }
            return {
                content: content.slice(0, insertPosition + target.length) + newContent + content.slice(insertPosition + target.length),
                changes: 1
            };
        }
    }

    async applyDelete(content, target, useRegex = false) {
        if (useRegex) {
            const regex = new RegExp(target, 'g');
            const matches = content.match(regex);
            if (!matches) {
                throw new Error(`No matches found for regex: ${target}`);
            }
            return {
                content: content.replace(regex, ''),
                changes: matches.length
            };
        } else {
            if (!content.includes(target)) {
                throw new Error(`Target not found: ${target}`);
            }
            return {
                content: content.replace(target, ''),
                changes: 1
            };
        }
    }

    async createBackup(originalPath) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = basename(originalPath);
        const backupPath = join(
            dirname(originalPath),
            this.config.backupDir,
            `${fileName}.${timestamp}.backup`
        );

        // Ensure backup directory exists
        await mkdir(dirname(backupPath), { recursive: true });

        // Copy file to backup location
        await copyFile(originalPath, backupPath);

        info(`Backup created: ${originalPath} -> ${backupPath}`);
        return backupPath;
    }

    async validatePath(path) {
        // Check for forbidden paths
        for (const forbidden of this.config.forbiddenPaths) {
            if (path.startsWith(forbidden)) {
                throw new Error(`Access to path '${path}' is forbidden`);
            }
        }

        // Check file extension if restrictions are in place
        if (this.config.allowedExtensions) {
            const ext = extname(path).toLowerCase();
            if (ext && !this.config.allowedExtensions.includes(ext)) {
                throw new Error(`File extension '${ext}' is not allowed`);
            }
        }

        // Check for path traversal attempts
        if (path.includes('..')) {
            throw new Error('Path traversal attempts are not allowed');
        }

        // Resolve to absolute path to prevent relative path issues
        const absolutePath = require('path').resolve(path);

        return absolutePath;
    }

    async validateContent(filePath, content) {
        const ext = extname(filePath).toLowerCase();
        const validator = this.syntaxValidators.get(ext);

        if (validator) {
            await validator(content);
        }
    }

    async validateJavaScript(content) {
        try {
            // Basic syntax check using Function constructor
            new Function(content);
        } catch (error) {
            throw new Error(`JavaScript syntax error: ${error.message}`);
        }
    }

    async validateTypeScript(content) {
        try {
            // For TypeScript, we'll do a basic check
            // In a real implementation, you'd use the TypeScript compiler
            this.validateJavaScript(content);
        } catch (error) {
            throw new Error(`TypeScript syntax error: ${error.message}`);
        }
    }

    async validateJSON(content) {
        try {
            JSON.parse(content);
        } catch (error) {
            throw new Error(`JSON syntax error: ${error.message}`);
        }
    }

    async validateYAML(content) {
        try {
            const yaml = await import('yaml');
            yaml.parse(content);
        } catch (error) {
            throw new Error(`YAML syntax error: ${error.message}`);
        }
    }

    async validateMarkdown(content) {
        // Basic markdown validation - just check for balanced code blocks
        const codeBlockMatches = content.match(/```/g);
        if (codeBlockMatches && codeBlockMatches.length % 2 !== 0) {
            throw new Error('Markdown validation error: Unclosed code block');
        }
    }

    async validateHTML(content) {
        try {
            // Basic HTML validation using DOMParser if available
            if (typeof DOMParser !== 'undefined') {
                const parser = new DOMParser();
                const doc = parser.parseFromString(content, 'text/html');
                const parseError = doc.querySelector('parsererror');
                if (parseError) {
                    throw new Error('HTML parsing error detected');
                }
            }
        } catch (error) {
            throw new Error(`HTML validation error: ${error.message}`);
        }
    }

    async validateXML(content) {
        try {
            // Basic XML validation
            if (typeof DOMParser !== 'undefined') {
                const parser = new DOMParser();
                const doc = parser.parseFromString(content, 'text/xml');
                const parseError = doc.querySelector('parsererror');
                if (parseError) {
                    throw new Error('XML parsing error detected');
                }
            }
        } catch (error) {
            throw new Error(`XML validation error: ${error.message}`);
        }
    }

    async extractMetadata(filePath, content) {
        const ext = extname(filePath).toLowerCase();
        const metadata = {
            extension: ext,
            size: content.length,
            lines: content.split('\n').length,
            words: content.split(/\s+/).filter(word => word.length > 0).length,
            encoding: 'utf8'
        };

        // Extract specific metadata based on file type
        switch (ext) {
            case '.json':
                try {
                    const parsed = JSON.parse(content);
                    metadata.type = 'json';
                    metadata.structure = this.analyzeJSONStructure(parsed);
                } catch (error) {
                    metadata.type = 'invalid-json';
                }
                break;

            case '.js':
            case '.ts':
                metadata.type = 'javascript';
                metadata.imports = this.extractImports(content);
                metadata.exports = this.extractExports(content);
                break;

            case '.md':
                metadata.type = 'markdown';
                metadata.headings = this.extractMarkdownHeadings(content);
                break;

            case '.html':
                metadata.type = 'html';
                metadata.title = this.extractHTMLTitle(content);
                break;
        }

        return metadata;
    }

    analyzeJSONStructure(obj, depth = 0) {
        if (depth > 5) return 'deeply-nested';

        if (Array.isArray(obj)) {
            return {
                type: 'array',
                length: obj.length,
                sample: obj.slice(0, 3).map(item => this.analyzeJSONStructure(item, depth + 1))
            };
        } else if (typeof obj === 'object' && obj !== null) {
            return {
                type: 'object',
                keys: Object.keys(obj),
                sample: Object.fromEntries(
                    Object.entries(obj).slice(0, 3).map(([key, value]) => [
                        key, this.analyzeJSONStructure(value, depth + 1)
                    ])
                )
            };
        } else {
            return typeof obj;
        }
    }

    extractImports(content) {
        const imports = [];
        const importRegex = /import\s+.*?\s+from\s+['"](.*?)['"]/g;
        let match;

        while ((match = importRegex.exec(content)) !== null) {
            imports.push(match[1]);
        }

        return imports;
    }

    extractExports(content) {
        const exports = [];
        const exportRegex = /export\s+(?:default\s+)?(?:const|let|var|function|class)\s+(\w+)/g;
        let match;

        while ((match = exportRegex.exec(content)) !== null) {
            exports.push(match[1]);
        }

        return exports;
    }

    extractMarkdownHeadings(content) {
        const headings = [];
        const headingRegex = /^(#{1,6})\s+(.+)$/gm;
        let match;

        while ((match = headingRegex.exec(content)) !== null) {
            headings.push({
                level: match[1].length,
                text: match[2].trim()
            });
        }

        return headings;
    }

    extractHTMLTitle(content) {
        const titleMatch = content.match(/<title[^>]*>(.*?)<\/title>/i);
        return titleMatch ? titleMatch[1].trim() : null;
    }

    async getFileStats(path) {
        const { stat } = await import('fs/promises');
        return await stat(path);
    }

    generateHash(content) {
        return createHash('sha256').update(content).digest('hex');
    }

    async shutdown() {
        info('FileOperationsExecutor shutdown completed');
    }
}

export default FileOperationsExecutor;