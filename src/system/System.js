const Memory = require('../memory/Memory');
const Reasoner = require('../reasoner/Reasoner');
const LM = require('../lm/LM');
const Cycle = require('./Cycle');
const CONSTITUTION_TASKS = require('./Constitution');
const actionExecutor = require('./ActionExecutor');
const registerDefaultActions = require('./default-actions');

class System {
    constructor() {
        this.memory = new Memory();
        this.reasoner = new Reasoner();
        this.lm = new LM();
        this.cycle = new Cycle(this.memory, this.reasoner, this.lm);
        registerDefaultActions(actionExecutor);
        this.isRunning = false;
        this.cycleCount = 0;
        this.initialized = false;
    }

    async _bootstrapTerms(tasks) {
        const termKeys = [...new Set(tasks.map(task => task.termKey))];
        const newTermKeys = termKeys.filter(key => !this.memory.getTerm(key));
        if (newTermKeys.length === 0) return;

        const termPromises = newTermKeys.map(key => this.lm.bootstrapTerm(key));
        const newTerms = (await Promise.all(termPromises)).filter(Boolean);
        newTerms.forEach(term => this.memory.addTerm(term));
    }

    async _ensureInitialized() {
        if (this.initialized) return;
        console.log("Initializing SeNARS system...");
        this.memory.addTasks(CONSTITUTION_TASKS);
        await this._bootstrapTerms(CONSTITUTION_TASKS);
        this.initialized = true;
        console.log(`System initialized with ${CONSTITUTION_TASKS.length} constitutional tasks`);
    }

    async initialize() {
        await this._ensureInitialized();
    }

    async runCycle() {
        await this._ensureInitialized();
        this.cycleCount++;
        console.log(`\n=== Cognitive Cycle ${this.cycleCount} ===`);
        return this.cycle.runOnce();
    }

    async start(maxCycles = 0) {
        if (this.isRunning) {
            console.warn('System is already running');
            return;
        }
        await this._ensureInitialized();

        this.isRunning = true;
        this.cycleCount = 0;
        console.log("System started. Running cognitive cycles...");

        while (this.isRunning && (maxCycles === 0 || this.cycleCount < maxCycles)) {
            try {
                await this.runCycle();
                await new Promise(resolve => setTimeout(resolve, 100));
            } catch (error) {
                console.error('Error during cycle execution:', error);
                this.stop();
                return;
            }
        }

        if (this.isRunning) {
            console.log(`Reached maximum cycle count (${maxCycles}). Stopping system.`);
            this.stop();
        }
    }

    stop() {
        this.isRunning = false;
        console.log(`System stopped after ${this.cycleCount} cycles.`);
    }

    async addTasks(tasks) {
        await this._ensureInitialized();
        const tasksToAdd = Array.isArray(tasks) ? tasks : [tasks];
        await this._bootstrapTerms(tasksToAdd);
        this.memory.addTasks(tasksToAdd);
        console.log(`Added ${tasksToAdd.length} tasks to system memory.`);
    }
}

module.exports = System;