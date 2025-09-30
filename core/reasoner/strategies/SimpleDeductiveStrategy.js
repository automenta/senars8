/**
 * Example: Simple Deductive Reasoning Strategy
 * This is an example implementation showing how to create a custom reasoning strategy
 */

import {ReasoningStrategy} from '../StrategyInterface.js';

class SimpleDeductiveStrategy extends ReasoningStrategy {
  /**
   * Determines if this strategy can handle the given task.
   * This example strategy handles tasks that are beliefs with simple implications.
   * @param {Task} task - The task to evaluate
   * @param {SystemContext} context - The current system context
   * @returns {boolean} - True if the strategy can handle the task
   */
  canHandle(task, context) {
    // For this example, we'll handle belief tasks with implication terms
    return task.punctuation === '.' && // Beliefs only
           task.term && 
           (task.term.type === 'Implication' || task.term.type === 'Equivalence');
  }

  /**
   * Executes the reasoning strategy on the given task.
   * @param {Task} task - The task to process
   * @param {SystemContext} context - The current system context
   * @returns {Promise<TaskResult>} - The result of the reasoning operation
   */
  async execute(task, context) {
    try {
      // Example logic: if we have A -> B and A is believed, infer B
      if (task.term.type === 'Implication' && task.term.terms && task.term.terms.length === 2) {
        const [premise, conclusion] = task.term.terms;
        
        // Look for matching beliefs in memory that match the premise
        const beliefs = context.getTasksByType('belief');
        const matchingBelief = beliefs.find(belief => 
          belief.term.key === premise.key && 
          belief.state.truthValue.confidence > 0.5
        );
        
        if (matchingBelief) {
          // Create a new task based on the conclusion
          const inferredTask = context.createTask(
            conclusion.key,
            '.', // belief
            {
              frequency: Math.min(task.state.truthValue.frequency, matchingBelief.state.truthValue.frequency),
              confidence: task.state.truthValue.confidence * matchingBelief.state.truthValue.confidence
            }
          );
          
          return {
            inferredTasks: [inferredTask],
            executionStats: {
              strategyName: this.getMetadata().name,
              executionTime: Date.now(), // In a real implementation, measure actual time
              success: true
            },
            success: true
          };
        }
      }

      // If no inference was possible, return empty result
      return {
        inferredTasks: [],
        executionStats: {
          strategyName: this.getMetadata().name,
          executionTime: Date.now(),
          success: true
        },
        success: true
      };
    } catch (error) {
      return {
        inferredTasks: [],
        executionStats: {
          strategyName: this.getMetadata().name,
          executionTime: Date.now(),
          success: false,
          error: error.message
        },
        success: false,
        errorMessage: error.message
      };
    }
  }

  /**
   * Gets metadata about this strategy.
   * @returns {StrategyMetadata} - Information about the strategy
   */
  getMetadata() {
    return {
      name: 'simple-deductive',
      description: 'A basic deductive reasoning strategy that implements modus ponens',
      supportedTaskTypes: ['belief'],
      category: 'deductive',
      priority: 0.7 // Higher priority for basic deductive reasoning
    };
  }

  /**
   * Validates the input task before execution.
   * @param {Task} task - The task to validate
   * @returns {ValidationResult} - The validation result
   */
  validate(task) {
    const errors = [];
    
    if (!task) {
      errors.push('Task is required');
    } else {
      if (!task.term) {
        errors.push('Task must have a term');
      }
      if (!['.', '?', '!'].includes(task.punctuation)) {
        errors.push('Task must have valid punctuation (., ?, !)');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export default SimpleDeductiveStrategy;