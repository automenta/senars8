/**
 * Command execution executor for the ToolSystem
 */
import {EventEmitter} from 'events';
import {execa} from 'execa';
import {debug, error as logError} from '../../utils/logger.js';

class CommandExecutor extends EventEmitter {
    constructor(config = {}) {
        super();
        this.config = config;
        this.allowedCommands = new Set(config.allowedCommands || [
            'ls', 'pwd', 'echo', 'cat', 'grep', 'find', 'ps', 'netstat', 'whoami', 'date'
        ]);
    }

    async execute(params = {}) {
        const {
            command,
            args = [],
            cwd,
            timeout = 30000,
            env = {},
            allowedCommands
        } = params;
        
        try {
            // Security check: validate command is allowed
            const commandsToCheck = allowedCommands || Array.from(this.allowedCommands);
            if (!commandsToCheck.includes(command.split(' ')[0])) {
                throw new Error(`Command '${command}' is not allowed`);
            }
            
            // Execute command
            const result = await execa(command, args, {
                cwd,
                timeout,
                env: {...process.env, ...env},
                reject: false // Don't throw on non-zero exit code
            });
            
            return {
                command: `${command} ${args.join(' ')}`,
                exitCode: result.exitCode,
                stdout: result.stdout,
                stderr: result.stderr,
                duration: result.duration,
                timestamp: Date.now()
            };
        } catch (error) {
            logError('Command execution error:', error);
            throw error;
        }
    }

    async shutdown() {
        debug('Command executor shutting down');
    }
}

export default CommandExecutor;