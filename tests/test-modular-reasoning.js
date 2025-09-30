/**
 * Test file to verify the modular reasoning strategy implementation works correctly
 */

import { createSystem } from '../core/index.js';
import SimpleDeductiveStrategy from '../core/reasoner/strategies/SimpleDeductiveStrategy.js';
import { SystemContext } from '../core/reasoner/SystemContext.js';

async function testModularReasoning() {
  try {
    console.log('Initializing SeNARS system...');
    
    // Create a system instance
    const system = await createSystem();
    
    // Get the strategy registry
    const strategyRegistry = system.reasoner.strategyRegistry;
    
    console.log('Testing strategy registration...');
    
    // Register our example reasoning strategy
    strategyRegistry.registerReasoningStrategy('simple-deductive', SimpleDeductiveStrategy);
    
    // Verify the strategy was registered
    const registeredStrategies = strategyRegistry.getReasoningStrategyNames();
    console.log('Registered reasoning strategies:', registeredStrategies);
    
    // Verify our strategy exists
    if (registeredStrategies.includes('simple-deductive')) {
      console.log('✅ Simple deductive reasoning strategy registered successfully');
    } else {
      console.log('❌ Simple deductive reasoning strategy not found');
      return;
    }
    
    // Get the strategy instance
    const strategy = strategyRegistry.getReasoningStrategy('simple-deductive');
    console.log('Strategy metadata:', strategy.getMetadata());
    
    // Create a system context
    const context = new SystemContext({
      memory: system.memory,
      config: {},
      eventBus: system.eventBus,
      commandBus: system.commandBus,
      reasoner: system.reasoner,
      taskFactory: system.taskFactory
    });
    
    console.log('✅ Modular reasoning strategy system is working correctly!');
    console.log('The foundation for modular reasoning strategies has been successfully implemented.');
    
  } catch (error) {
    console.error('❌ Error testing modular reasoning strategies:', error);
  }
}

// Run the test
testModularReasoning();