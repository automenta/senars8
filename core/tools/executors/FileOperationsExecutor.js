/**
 * File operations executor for the ToolSystem
 */
import {EventEmitter} from 'events';
import {debug, error as logError} from '../../utils/logger.js';
import fs from 'fs/promises';

class FileOperationsExecutor extends EventEmitter {
    constructor(config = {}) {
        super();
        this.config = config;
    }

    async read(params = {}) {
        const {path: filePath, encoding = 'utf8', maxSize = 10 * 1024 * 1024} = params;

        try {
            // Check if file exists and get stats
            const stats = await fs.stat(filePath);
            if (stats.size > maxSize) {
                throw new Error(`File exceeds max size of ${maxSize} bytes`);
            }

            const content = await fs.readFile(filePath, encoding);

            return {
                path: filePath,
                content,
                size: stats.size,
                encoding,
                timestamp: Date.now()
            };
        } catch (error) {
            logError('File read error:', error);
            throw error;
        }
    }

    async write(params = {}) {
        const {path: filePath, content, encoding = 'utf8', backup = true, validateSyntax = true} = params;

        try {
            // Create backup if requested
            if (backup) {
                try {
                    await fs.access(filePath);
                    const backupPath = `${filePath}.backup.${Date.now()}`;
                    await fs.copyFile(filePath, backupPath);
                } catch (error) {
                    // File doesn't exist, no backup needed
                }
            }

            // Write content to file
            await fs.writeFile(filePath, content, encoding);

            return {
                path: filePath,
                status: 'written',
                timestamp: Date.now(),
                backupCreated: backup
            };
        } catch (error) {
            logError('File write error:', error);
            throw error;
        }
    }

    async edit(params = {}) {
        const {path: filePath, operations, backup = true} = params;

        try {
            if (backup) {
                const content = await fs.readFile(filePath, 'utf8');
                const backupPath = `${filePath}.backup.${Date.now()}`;
                await fs.writeFile(backupPath, content, 'utf8');
            }

            let content = await fs.readFile(filePath, 'utf8');

            for (const operation of operations) {
                const {type, target, content: editContent, regex = false} = operation;

                switch (type) {
                    case 'replace':
                        if (regex) {
                            const regexPattern = new RegExp(target, 'g');
                            content = content.replace(regexPattern, editContent);
                        } else {
                            content = content.split(target).join(editContent);
                        }
                        break;
                    case 'insert':
                        content = `${content}${editContent}`;
                        break;
                    case 'delete':
                        if (regex) {
                            const regexPattern = new RegExp(target, 'g');
                            content = content.replace(regexPattern, '');
                        } else {
                            content = content.replace(target, '');
                        }
                        break;
                }
            }

            await fs.writeFile(filePath, content, 'utf8');

            return {
                path: filePath,
                status: 'edited',
                operations: operations.length,
                timestamp: Date.now()
            };
        } catch (error) {
            logError('File edit error:', error);
            throw error;
        }
    }

    async shutdown() {
        debug('File operations executor shutting down');
    }
}

export default FileOperationsExecutor;