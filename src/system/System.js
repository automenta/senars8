const Memory = require('../memory/Memory');
const Reasoner = require('../reasoner/Reasoner');
const LM = require('../lm/LM');
const Cycle = require('./Cycle');
const { ActionExecutor } = require('./ActionExecutor');
const CONSTITUTION_TASKS = require('./Constitution');
const registerDefaultActions = require('./default-actions');

const config = require('../config');
const _ = require('lodash');

class System {
    constructor(userConfig = {}) {
        this.config = _.merge({}, config, userConfig);
        this.memory = new Memory();
        this.reasoner = new Reasoner();
        this.lm = new LM();
        this.actionExecutor = new ActionExecutor(this.memory);
        this.cycle = new Cycle(this.memory, this.reasoner, this.lm, this.actionExecutor, this.config);
        registerDefaultActions(this.actionExecutor);
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
        this.memory.addTasks(CONSTITUTION_TASKS);
        await this._bootstrapTerms(CONSTITUTION_TASKS);
        this.initialized = true;
    }

    async initialize() {
        await this._ensureInitialized();
    }

    async runCycle() {
        await this._ensureInitialized();
        this.cycleCount++;
        return this.cycle.runOnce();
    }

    async start(maxCycles = 0) {
        if (this.isRunning) return;
        await this._ensureInitialized();

        this.isRunning = true;
        this.cycleCount = 0;

        while (this.isRunning && (maxCycles === 0 || this.cycleCount < maxCycles)) {
            try {
                await this.runCycle();
                await new Promise(resolve => setTimeout(resolve, 100));
            } catch (error) {
                this.stop();
                throw error;
            }
        }

        if (this.isRunning) {
            this.stop();
        }
    }

    stop() {
        this.isRunning = false;
    }

    async addTasks(tasks) {
        await this._ensureInitialized();
        const tasksToAdd = Array.isArray(tasks) ? tasks : [tasks];
        await this._bootstrapTerms(tasksToAdd);
        this.memory.addTasks(tasksToAdd);
    }
}

module.exports = System;