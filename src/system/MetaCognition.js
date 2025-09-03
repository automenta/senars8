const { parseTerm } = require('../parser/TermParser');
const Task = require('../core/Task');

/**
 * Meta-Cognition System
 * Handles contradiction detection, analysis, and remediation.
 */
class MetaCognition {
    /**
     * Finds contradictions in the memory.
     * @param {Array} tasks - Array of tasks to check for contradictions.
     * @returns {Array} Array of contradictions found.
     */
    findContradictions(tasks) {
        const contradictions = [];
        const beliefTasks = tasks.filter(task => task.punctuation === '.');
        
        // Check for direct contradictions (A. and (--, A).)
        for (let i = 0; i < beliefTasks.length; i++) {
            for (let j = i + 1; j < beliefTasks.length; j++) {
                const task1 = beliefTasks[i];
                const task2 = beliefTasks[j];
                
                if (this.areContradictory(task1, task2)) {
                    contradictions.push({
                        type: 'direct',
                        tasks: [task1, task2],
                        confidence: Math.min(task1.state.truthValue.confidence, task2.state.truthValue.confidence)
                    });
                }
            }
        }
        
        return contradictions;
    }
    
    /**
     * Checks if two tasks are contradictory.
     * @param {Task} task1 - First task.
     * @param {Task} task2 - Second task.
     * @returns {boolean} True if tasks are contradictory.
     */
    areContradictory(task1, task2) {
        // Simple case: A. and (--, A).
        const parsed1 = parseTerm(task1.termKey);
        const parsed2 = parseTerm(task2.termKey);
        
        if (!parsed1 || !parsed2) return false;
        
        // Check if one is negation of the other
        if (parsed1.type === 'Negation' && parsed1.term === task2.termKey) {
            return true;
        }
        
        if (parsed2.type === 'Negation' && parsed2.term === task1.termKey) {
            return true;
        }
        
        return false;
    }
    
    /**
     * Analyzes contradictions and generates remediation tasks.
     * @param {Array} contradictions - Array of contradictions to analyze.
     * @returns {Array} Array of remediation tasks.
     */
    analyzeFailures(contradictions) {
        const metaTasks = [];
        
        for (const contradiction of contradictions) {
            // Create a high-priority task to resolve the contradiction
            const contradictionTask = new Task(
                `contradiction_resolution_${Date.now()}`,
                '!',
                {
                    frequency: 1.0,
                    confidence: contradiction.confidence
                }
            );
            
            // Add to meta tasks
            metaTasks.push(contradictionTask);
            
            // Generate specific remediation goals
            for (const task of contradiction.tasks) {
                const remediationTask = new Task(
                    `resolve_contradiction_with_${task.termKey}`,
                    '!',
                    {
                        frequency: 1.0,
                        confidence: task.state.truthValue.confidence * 0.8
                    }
                );
                metaTasks.push(remediationTask);
            }
        }
        
        return metaTasks;
    }
    
    /**
     * Performs backward reasoning to find the source of a contradiction.
     * @param {Task} contradictoryTask - The contradictory task.
     * @param {Map} taskDerivations - Map of task derivations.
     * @returns {Task|null} The premise task with lowest confidence that contributed to the error.
     */
    findFaultyPremise(contradictoryTask, taskDerivations) {
        // This is a simplified implementation
        // In a full system, this would trace back through the derivation tree
        const derivations = taskDerivations.get(contradictoryTask.id) || [];
        
        if (derivations.length === 0) {
            return null;
        }
        
        // Find the premise with the lowest confidence
        let lowestConfidenceTask = derivations[0];
        for (const premise of derivations) {
            if (premise.state.truthValue.confidence < lowestConfidenceTask.state.truthValue.confidence) {
                lowestConfidenceTask = premise;
            }
        }
        
        return lowestConfidenceTask;
    }
}

module.exports = MetaCognition;