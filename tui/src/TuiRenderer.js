import chalk from 'chalk';
import UiComponents from '../../common/services/UiComponents.js';

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
        // Use shared UI component
        const systemStatusComponent = UiComponents.createSystemStatus(systemState);
        const formatted = UiComponents.formatForTui(systemStatusComponent);
        console.log(chalk.bold('System Status:'));
        console.log(formatted);

        // Additional detailed information
        const systemInfo = systemState.systemInfo;
        if (systemInfo) {
            console.log(chalk.bold('System Info:'));
            console.log(`  Beliefs: ${systemInfo.beliefsCount}, Goals: ${systemInfo.goalsCount}, Questions: ${systemInfo.questionsCount}`);
            console.log(`  Cycle Count: ${systemInfo.cycleCount}, Memory Usage: ${systemInfo.memoryUsage}`);
        }
        console.log('');
    }

    renderTasks(systemState) {
        // Use shared UI component
        const taskListComponent = UiComponents.createTaskList(systemState?.memory?.tasks || [], {maxItems: 10});
        const formatted = UiComponents.formatForTui(taskListComponent);
        console.log(chalk.bold('Tasks:'));
        console.log(formatted);
    }

    renderMemory(systemState) {
        // Use shared UI component
        const memoryState = {
            beliefs: systemState?.memory?.beliefs || [],
            goals: systemState?.memory?.goals || [],
            questions: systemState?.memory?.questions || [],
            tasks: systemState?.memory?.tasks || []
        };
        const memoryStatusComponent = UiComponents.createMemoryStatus(memoryState);
        const formatted = UiComponents.formatForTui(memoryStatusComponent);
        console.log(chalk.bold('Memory:'));
        console.log(formatted);
    }

    renderFooter() {
        console.log('');
        console.log(chalk.gray('Commands: [S]top/[R]un/[T]ask/[A]dd/[B]eliefs/[G]oals/[L]ist/[C]lear/[H]elp/[Q]uit'));
        console.log(chalk.gray('For Narsese input, type directly (ends with . for belief, ? for question, ! for goal)'));
        console.log(chalk.gray('Press Ctrl+C to exit'));
    }

    renderError(error) {
        console.log(chalk.red.bold('ERROR: ') + error.message);
        console.log(chalk.red(error.stack));
    }
}

export {TuiRenderer};