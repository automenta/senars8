import chalk from 'chalk';

class TuiRenderer {
    constructor() {
        this.currentScreen = null;
    }

    render(systemState) {
        // Clear screen
        console.clear();
        
        // Render header
        this.renderHeader();
        
        // Render system status
        this.renderSystemStatus(systemState);
        
        // Render tasks
        this.renderTasks(systemState);
        
        // Render memory
        this.renderMemory(systemState);
        
        // Render footer
        this.renderFooter();
    }

    renderHeader() {
        console.log(chalk.bold.blue('='.repeat(80)));
        console.log(chalk.bold.blue('SENARS - Self-Enhancing Neurosymbolic Autonomous Reasoning System'));
        console.log(chalk.bold.blue('='.repeat(80)));
        console.log('');
    }

    renderSystemStatus(systemState) {
        const isRunning = systemState?.isRunning || false;
        const cycleCount = systemState?.cycleCount || 0;
        const status = isRunning ? chalk.green('RUNNING') : chalk.red('STOPPED');
        
        console.log(chalk.bold('System Status: ') + status);
        console.log(chalk.bold('Cycle Count: ') + cycleCount);
        console.log('');
    }

    renderTasks(systemState) {
        console.log(chalk.bold('Tasks:'));
        
        if (systemState?.memory?.tasks && systemState.memory.tasks.length > 0) {
            const tasks = systemState.memory.tasks.slice(0, 10); // Show only first 10 tasks
            
            tasks.forEach((task, index) => {
                const type = task.type || 'UNKNOWN';
                const content = task.content || 'No content';
                const status = task.status || 'PENDING';
                
                let statusColor = chalk.yellow;
                if (status === 'COMPLETED') statusColor = chalk.green;
                else if (status === 'FAILED') statusColor = chalk.red;
                
                console.log(`  ${index + 1}. [${type}] ${content} - ${statusColor(status)}`);
            });
            
            if (systemState.memory.tasks.length > 10) {
                console.log(`  ... and ${systemState.memory.tasks.length - 10} more tasks`);
            }
        } else {
            console.log('  No tasks available');
        }
        
        console.log('');
    }

    renderMemory(systemState) {
        console.log(chalk.bold('Memory:'));
        
        if (systemState?.memory?.beliefs && systemState.memory.beliefs.length > 0) {
            console.log(`  Beliefs: ${systemState.memory.beliefs.length}`);
        }
        
        if (systemState?.memory?.goals && systemState.memory.goals.length > 0) {
            console.log(`  Goals: ${systemState.memory.goals.length}`);
        }
        
        if (systemState?.memory?.questions && systemState.memory.questions.length > 0) {
            console.log(`  Questions: ${systemState.memory.questions.length}`);
        }
        
        console.log('');
    }

    renderFooter() {
        console.log('');
        console.log(chalk.gray('Press Ctrl+C to exit'));
        console.log(chalk.gray('Commands: [S]top/[R]un/[T]ask/[A]dd belief/[Q]uit'));
    }

    renderError(error) {
        console.log(chalk.red.bold('ERROR: ') + error.message);
        console.log(chalk.red(error.stack));
    }
}

export { TuiRenderer };