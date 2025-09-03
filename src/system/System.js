const Memory = require('../memory/Memory');
const Reasoner = require('../reasoner/Reasoner');
const LM = require('../lm/LM');
const Cycle = require('./Cycle');
const CONSTITUTION_TASKS = require('./Constitution');

/**
 * Main System Class
 * Orchestrates all components of the SeNARS cognitive system.
 */
class System {
    constructor() {
        // Initialize core components
        this.memory = new Memory();
        this.reasoner = new Reasoner();
        this.lm = new LM();
        this.cycle = new Cycle(this.memory, this.reasoner, this.lm);
        
        // System state
        this.isRunning = false;
        this.cycleCount = 0;
        this.initialized = false;
    }
    
    /**
     * Initializes the system with constitutional knowledge.
     */
    async initialize() {
        console.log("Initializing SeNARS system...");
        
        // Load Constitution
        this.memory.addTasks(CONSTITUTION_TASKS);
        
        // Bootstrap constitutional terms
        const termPromises = CONSTITUTION_TASKS.map(task => {
            if (!this.memory.getTerm(task.termKey)) {
                return this.lm.bootstrapTerm(task.termKey);
            }
            return Promise.resolve(null);
        });
        
        const newTerms = (await Promise.all(termPromises)).filter(Boolean);
        newTerms.forEach(term => this.memory.addTerm(term));
        
        this.initialized = true;
        console.log(`System initialized with ${CONSTITUTION_TASKS.length} constitutional tasks`);
    }
    
    /**
     * Runs the cognitive cycle once.
     */
    async runCycle() {
        // Initialize if not already done
        if (!this.initialized) {
            await this.initialize();
        }
        
        this.cycleCount++;
        console.log(`\n=== Cognitive Cycle ${this.cycleCount} ===`);
        
        const result = await this.cycle.runOnce();
        return result;
    }
    
    /**
     * Starts the continuous cognitive loop.
     * @param {number} maxCycles - Maximum number of cycles to run (0 for infinite).
     */
    async start(maxCycles = 0) {
        if (this.isRunning) {
            console.warn('System is already running');
            return;
        }
        
        if (!this.initialized) {
            await this.initialize();
        }
        
        this.isRunning = true;
        this.cycleCount = 0;
        
        console.log("System started. Running cognitive cycles...");
        
        let cyclesRun = 0;
        while (this.isRunning && (maxCycles === 0 || cyclesRun < maxCycles)) {
            try {
                await this.runCycle();
                cyclesRun++;
                
                // Small delay to prevent overwhelming the system
                await new Promise(resolve => setTimeout(resolve, 100));
            } catch (error) {
                console.error('Error during cycle execution:', error);
                break;
            }
        }
        
        if (maxCycles > 0 && cyclesRun >= maxCycles) {
            console.log(`Reached maximum cycle count (${maxCycles}). Stopping system.`);
            this.stop();
        }
    }
    
    /**
     * Stops the cognitive loop.
     */
    stop() {
        this.isRunning = false;
        console.log(`System stopped after ${this.cycleCount} cycles.`);
    }
    
    /**
     * Adds a task to the system's memory.
     * @param {Task|Task[]} tasks - Task or array of tasks to add.
     */
    async addTasks(tasks) {
        // Initialize if not already done
        if (!this.initialized) {
            await this.initialize();
        }
        
        const tasksToAdd = Array.isArray(tasks) ? tasks : [tasks];
        
        // Bootstrap terms for new tasks
        const termPromises = tasksToAdd.map(task => {
            if (!this.memory.getTerm(task.termKey)) {
                return this.lm.bootstrapTerm(task.termKey);
            }
            return Promise.resolve(null);
        });
        
        const newTerms = (await Promise.all(termPromises)).filter(Boolean);
        newTerms.forEach(term => this.memory.addTerm(term));
        
        this.memory.addTasks(tasksToAdd);
        console.log(`Added ${tasksToAdd.length} tasks to system memory.`);
    }
}

module.exports = System;