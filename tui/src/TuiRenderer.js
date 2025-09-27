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
        if (!systemState?.memory?.tasks) {
            console.log(chalk.bold('Tasks:'));
            console.log('  No tasks available');
            console.log('');
            return;
        }

        const tasks = systemState.memory.tasks;
        const maxDisplayItems = 10;

        console.log(chalk.bold(`Tasks: (${tasks.length})`));

        if (tasks.length > 0) {
            const tasksToShow = tasks.slice(0, maxDisplayItems);

            tasksToShow.forEach((task, index) => {
                // Get task content using the task's toDisplayString method if available, otherwise toString
                const taskContent = task.toDisplayString?.() || task.toString?.() || task.content || 'No content';
                
                // Determine task type based on punctuation (NARS uses punctuation to distinguish types)
                let type = 'UNKNOWN';
                if (task.punctuation === '.') type = 'BELIEF';
                else if (task.punctuation === '!') type = 'GOAL';
                else if (task.punctuation === '?') type = 'QUESTION';
                
                // Color coding based on task type
                let typeColor = chalk.gray;
                if (type === 'BELIEF') typeColor = chalk.blue;
                else if (type === 'GOAL') typeColor = chalk.green;
                else if (type === 'QUESTION') typeColor = chalk.yellow;

                console.log(`  ${index + 1}. [${typeColor(type)}] ${taskContent}`);
            });

            if (tasks.length > maxDisplayItems) {
                console.log(chalk.gray(`  ... and ${tasks.length - maxDisplayItems} more tasks`));
            }
        } else {
            console.log('  No tasks available');
        }

        console.log('');
    }

    renderMemory(systemState) {
        const memory = systemState?.memory || {};
        const beliefs = memory.beliefs || [];
        const goals = memory.goals || [];
        const questions = memory.questions || [];

        console.log(chalk.bold('Memory:'));

        // Color code for different memory types
        console.log(`  ${chalk.blue('Beliefs')}: ${beliefs.length}`);
        console.log(`  ${chalk.green('Goals')}: ${goals.length}`);
        console.log(`  ${chalk.yellow('Questions')}: ${questions.length}`);

        console.log('');
    }

    renderFooter() {
        console.log('');
        console.log(chalk.gray('Commands: [S]top/[R]un/[T]ask/[A]dd belief/[B]eliefs/[G]oals/[L]ist tasks/[C]lear/[H]elp/[Q]uit'));
        console.log(chalk.gray('Press Ctrl+C to exit'));
    }

    renderError(error) {
        console.log(chalk.red.bold('ERROR: ') + error.message);
        console.log(chalk.red(error.stack));
    }
}

export {TuiRenderer};