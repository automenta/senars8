/**
 * Command Executor with Security Sandboxing
 * Provides secure command execution with resource limits and monitoring
 */

import { spawn } from 'child_process';
import { debug, error as logError, info, warn } from '../utils/logger.js';
import { createUnifiedErrorHandler } from '../utils/errorHandler.js';
import { randomUUID } from 'crypto';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

const errorHandler = createUnifiedErrorHandler('CommandExecutor');

class CommandExecutor {
    constructor(config = {}) {
        this.config = {
            allowedCommands: config.allowedCommands || [
                'ls', 'cat', 'echo', 'grep', 'find', 'pwd', 'which',
                'node', 'npm', 'python3', 'python', 'pip', 'pip3',
                'git', 'curl', 'wget', 'tar', 'zip', 'unzip',
                'mkdir', 'rm', 'cp', 'mv', 'touch'
            ],
            forbiddenCommands: config.forbiddenCommands || [
                'sudo', 'su', 'chmod', 'chown', 'rm -rf /', 'dd', 'mkfs',
                'iptables', 'ufw', 'systemctl', 'service', 'shutdown', 'reboot'
            ],
            timeout: config.timeout || 30000,
            maxOutputSize: config.maxOutputSize || 1024 * 1024, // 1MB
            sandboxEnabled: config.sandboxEnabled ?? true,
            workingDirectory: config.workingDirectory || process.cwd(),
            envWhitelist: config.envWhitelist || ['PATH', 'HOME', 'USER', 'NODE_ENV'],
            resourceLimits: {
                memory: config.memoryLimit || 512 * 1024 * 1024, // 512MB
                cpuTime: config.cpuTimeLimit || 30000, // 30 seconds
                fileSize: config.fileSizeLimit || 100 * 1024 * 1024, // 100MB
                ...config.resourceLimits
            },
            ...config
        };
        
        this.activeProcesses = new Map();
        this.executionHistory = [];
        this.sandboxDir = join(tmpdir(), 'senars-sandbox', randomUUID());
        
        info('CommandExecutor initialized with sandboxing:', this.config.sandboxEnabled);
    }

    async execute(params) {
        const { command, args, cwd, env, timeout, allowedCommands } = {
            args: [],
            cwd: this.config.workingDirectory,
            timeout: this.config.timeout,
            allowedCommands: this.config.allowedCommands,
            ...params
        };

        const executionId = randomUUID();
        const startTime = Date.now();

        try {
            // Security validation
            this.validateCommand(command, allowedCommands);
            
            // Prepare execution environment
            const executionEnv = this.prepareEnvironment(env);
            const executionCwd = this.resolveWorkingDirectory(cwd);
            
            debug(`Executing command: ${command} ${args.join(' ')} (execution: ${executionId})`);
            
            // Create sandbox if enabled
            if (this.config.sandboxEnabled) {
                await this.createSandbox(executionId);
            }
            
            // Execute command
            const result = await this.runCommand(command, args, executionCwd, executionEnv, timeout, executionId);
            
            const duration = Date.now() - startTime;
            
            // Store execution history
            this.executionHistory.push({
                executionId,
                command,
                args,
                cwd: executionCwd,
                duration,
                exitCode: result.exitCode,
                success: result.success,
                timestamp: new Date().toISOString()
            });
            
            info(`Command executed successfully: ${command} (execution: ${executionId}, duration: ${duration}ms)`);
            
            return {
                success: true,
                executionId,
                command,
                args,
                result,
                duration
            };
            
        } catch (error) {
            const duration = Date.now() - startTime;
            
            this.executionHistory.push({
                executionId,
                command,
                args,
                cwd,
                duration,
                exitCode: error.exitCode || -1,
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
            
            logError(`Command execution failed: ${command} (execution: ${executionId})`, error);
            throw error;
        } finally {
            // Clean up sandbox
            if (this.config.sandboxEnabled) {
                await this.cleanupSandbox(executionId);
            }
            
            // Remove from active processes
            this.activeProcesses.delete(executionId);
        }
    }

    validateCommand(command, allowedCommands) {
        // Check against forbidden commands
        for (const forbidden of this.config.forbiddenCommands) {
            if (command.includes(forbidden)) {
                throw new Error(`Command '${command}' contains forbidden pattern: ${forbidden}`);
            }
        }
        
        // Check if command is allowed
        if (allowedCommands && !allowedCommands.includes(command)) {
            throw new Error(`Command '${command}' is not in the allowed commands list`);
        }
        
        // Additional security checks
        if (command.includes('|') || command.includes('||') || command.includes('&&')) {
            throw new Error('Command chaining is not allowed');
        }
        
        if (command.includes('>') || command.includes('<') || command.includes('>>')) {
            throw new Error('File redirection is not allowed');
        }
        
        if (command.includes('$(') || command.includes('`')) {
            throw new Error('Command substitution is not allowed');
        }
        
        if (command.includes(';')) {
            throw new Error('Command separation is not allowed');
        }
    }

    prepareEnvironment(env = {}) {
        const safeEnv = {};
        
        // Start with whitelisted environment variables
        for (const key of this.config.envWhitelist) {
            if (process.env[key]) {
                safeEnv[key] = process.env[key];
            }
        }
        
        // Add custom environment variables (with validation)
        for (const [key, value] of Object.entries(env)) {
            if (this.isSafeEnvVar(key, value)) {
                safeEnv[key] = value;
            }
        }
        
        // Add execution-specific variables
        safeEnv.SENARS_EXECUTION = '1';
        safeEnv.SENARS_SANDBOX = this.config.sandboxEnabled ? '1' : '0';
        
        return safeEnv;
    }

    isSafeEnvVar(key, value) {
        // Block potentially dangerous environment variables
        const dangerousVars = [
            'LD_PRELOAD', 'LD_LIBRARY_PATH', 'DYLD_INSERT_LIBRARIES',
            'PYTHONPATH', 'NODE_OPTIONS', 'JAVA_TOOL_OPTIONS',
            'MAIL', 'LOGNAME', 'SHELL', 'SSH_AUTH_SOCK'
        ];
        
        if (dangerousVars.includes(key.toUpperCase())) {
            return false;
        }
        
        // Block variables with suspicious values
        if (typeof value === 'string') {
            if (value.includes('../') || value.includes('..\\')) {
                return false;
            }
            if (value.includes('|') || value.includes('>') || value.includes('<')) {
                return false;
            }
        }
        
        return true;
    }

    resolveWorkingDirectory(cwd) {
        if (this.config.sandboxEnabled) {
            return this.sandboxDir;
        }
        
        // Resolve and validate working directory
        const resolved = require('path').resolve(cwd);
        
        // Check against forbidden paths
        for (const forbidden of this.config.forbiddenPaths || []) {
            if (resolved.startsWith(forbidden)) {
                throw new Error(`Working directory '${cwd}' is forbidden`);
            }
        }
        
        return resolved;
    }

    async createSandbox(executionId) {
        const sandboxPath = join(this.sandboxDir, executionId);
        
        try {
            await mkdir(sandboxPath, { recursive: true });
            
            // Create basic directory structure
            const dirs = ['tmp', 'work', 'output'];
            for (const dir of dirs) {
                await mkdir(join(sandboxPath, dir), { recursive: true });
            }
            
            debug(`Created sandbox: ${sandboxPath}`);
            
        } catch (error) {
            logError(`Failed to create sandbox: ${sandboxPath}`, error);
            throw error;
        }
    }

    async cleanupSandbox(executionId) {
        const sandboxPath = join(this.sandboxDir, executionId);
        
        try {
            const { rm } = await import('fs/promises');
            await rm(sandboxPath, { recursive: true, force: true });
            debug(`Cleaned up sandbox: ${sandboxPath}`);
        } catch (error) {
            warn(`Failed to cleanup sandbox: ${sandboxPath}`, error.message);
        }
    }

    async runCommand(command, args, cwd, env, timeout, executionId) {
        return new Promise((resolve, reject) => {
            const child = spawn(command, args, {
                cwd,
                env,
                stdio: ['pipe', 'pipe', 'pipe'],
                shell: false
            });
            
            let stdout = '';
            let stderr = '';
            let outputSize = 0;
            const maxOutputSize = this.config.maxOutputSize;
            
            // Store process reference
            this.activeProcesses.set(executionId, child);
            
            // Handle stdout
            child.stdout.on('data', (data) => {
                const chunk = data.toString();
                outputSize += chunk.length;
                
                if (outputSize > maxOutputSize) {
                    child.kill('SIGTERM');
                    reject(new Error(`Output size exceeded limit: ${maxOutputSize} bytes`));
                    return;
                }
                
                stdout += chunk;
            });
            
            // Handle stderr
            child.stderr.on('data', (data) => {
                const chunk = data.toString();
                outputSize += chunk.length;
                
                if (outputSize > maxOutputSize) {
                    child.kill('SIGTERM');
                    reject(new Error(`Output size exceeded limit: ${maxOutputSize} bytes`));
                    return;
                }
                
                stderr += chunk;
            });
            
            // Handle process exit
            child.on('exit', (code, signal) => {
                const duration = Date.now() - startTime;
                
                if (signal) {
                    reject({
                        message: `Process terminated by signal: ${signal}`,
                        exitCode: code,
                        stdout,
                        stderr,
                        duration
                    });
                } else {
                    resolve({
                        exitCode: code,
                        stdout: stdout.trim(),
                        stderr: stderr.trim(),
                        success: code === 0,
                        duration
                    });
                }
            });
            
            // Handle process errors
            child.on('error', (error) => {
                reject({
                    message: `Process error: ${error.message}`,
                    error: error.message,
                    stdout,
                    stderr,
                    duration: Date.now() - startTime
                });
            });
            
            // Set up timeout
            const startTime = Date.now();
            const timeoutTimer = setTimeout(() => {
                child.kill('SIGTERM');
                setTimeout(() => {
                    if (!child.killed) {
                        child.kill('SIGKILL');
                    }
                }, 5000);
                
                reject({
                    message: `Command timed out after ${timeout}ms`,
                    stdout,
                    stderr,
                    duration: Date.now() - startTime
                });
            }, timeout);
            
            // Clean up timeout on exit
            child.on('exit', () => {
                clearTimeout(timeoutTimer);
            });
        });
    }

    async executeScript(params) {
        const { script, language, timeout } = {
            language: 'javascript',
            timeout: this.config.timeout,
            ...params
        };
        
        const executionId = randomUUID();
        
        try {
            // Create script file
            const scriptPath = join(this.sandboxDir, executionId, 'script');
            const extensions = {
                javascript: '.js',
                python: '.py',
                bash: '.sh'
            };
            
            const scriptFile = scriptPath + (extensions[language] || '.txt');
            
            await mkdir(dirname(scriptFile), { recursive: true });
            await writeFile(scriptFile, script, 'utf8');
            
            // Execute script based on language
            let command, args;
            
            switch (language) {
                case 'javascript':
                    command = 'node';
                    args = [scriptFile];
                    break;
                    
                case 'python':
                    command = 'python3';
                    args = [scriptFile];
                    break;
                    
                case 'bash':
                    command = 'bash';
                    args = [scriptFile];
                    break;
                    
                default:
                    throw new Error(`Unsupported script language: ${language}`);
            }
            
            return await this.execute({ command, args, timeout });
            
        } catch (error) {
            logError(`Script execution failed (execution: ${executionId})`, error);
            throw error;
        }
    }

    async getSystemInfo() {
        try {
            const { execSync } = await import('child_process');
            
            const info = {
                platform: process.platform,
                arch: process.arch,
                nodeVersion: process.version,
                cpus: require('os').cpus().length,
                totalMemory: Math.round(require('os').totalmem() / 1024 / 1024), // MB
                freeMemory: Math.round(require('os').freemem() / 1024 / 1024), // MB
                uptime: Math.round(process.uptime()),
                loadAverage: require('os').loadavg()
            };
            
            // Get additional system info
            try {
                info.hostname = execSync('hostname', { encoding: 'utf8' }).trim();
            } catch (error) {
                info.hostname = require('os').hostname();
            }
            
            return info;
            
        } catch (error) {
            logError('Failed to get system info', error);
            throw error;
        }
    }

    getActiveExecutions() {
        return Array.from(this.activeProcesses.keys()).map(executionId => ({
            executionId,
            command: this.activeProcesses.get(executionId).spawnfile,
            pid: this.activeProcesses.get(executionId).pid
        }));
    }

    getExecutionHistory(limit = 100) {
        return this.executionHistory.slice(-limit);
    }

    getStatistics() {
        const total = this.executionHistory.length;
        const successful = this.executionHistory.filter(exec => exec.success).length;
        const failed = total - successful;
        
        const avgDuration = total > 0 
            ? Math.round(this.executionHistory.reduce((sum, exec) => sum + exec.duration, 0) / total)
            : 0;
        
        return {
            totalExecutions: total,
            successfulExecutions: successful,
            failedExecutions: failed,
            successRate: total > 0 ? Math.round((successful / total) * 100) : 0,
            averageDuration: avgDuration,
            activeExecutions: this.activeProcesses.size
        };
    }

    async shutdown() {
        info('Shutting down CommandExecutor...');
        
        // Terminate all active processes
        for (const [executionId, process] of this.activeProcesses) {
            try {
                process.kill('SIGTERM');
                debug(`Terminated process: ${executionId}`);
            } catch (error) {
                warn(`Failed to terminate process ${executionId}:`, error.message);
            }
        }
        
        this.activeProcesses.clear();
        info('CommandExecutor shutdown completed');
    }
}

export default CommandExecutor;