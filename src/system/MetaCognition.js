const {parseTerm} = require('../parser/narseseParser');
const ContradictionAnalyzer = require('../reasoner/ContradictionAnalyzer');
const ResolutionStrategy = require('../reasoner/strategies/ResolutionStrategy');
const {getBeliefTasks} = require('../utils/task-utils');

class MetaCognition {
    constructor() {
        this.contradictionAnalyzer = new ContradictionAnalyzer();
        this.resolutionStrategy = new ResolutionStrategy();
    }

    findContradictions(tasks) {
        const beliefTasks = getBeliefTasks(tasks);
        const parsedBeliefs = beliefTasks.map(task => ({
            task,
            parsed: parseTerm(task.termKey)
        })).filter(item => item.parsed);

        const pairwiseContradictions = parsedBeliefs.flatMap((item1, i) =>
            parsedBeliefs.slice(i + 1).map(item2 => {
                const contradictionType = this.contradictionAnalyzer.analyze(item1.task, item2.task, item1.parsed, item2.parsed);
                if (!contradictionType) return null;
                return {
                    type: contradictionType.type,
                    tasks: [item1.task, item2.task],
                    confidence: Math.min(item1.task.state.truthValue.confidence, item2.task.state.truthValue.confidence),
                    details: contradictionType.details,
                    severity: this.contradictionAnalyzer.calculateSeverity(contradictionType, item1.task, item2.task)
                };
            }).filter(Boolean)
        );

        return pairwiseContradictions;
    }

    resolve(contradiction, strategy) {
        return this.resolutionStrategy.resolve(contradiction, strategy);
    }

    generateContradictionReport(contradictions) {
        if (contradictions.length === 0) return "No contradictions found.";
        return `Contradiction Report (${contradictions.length} found):\n` +
            contradictions.map((c, i) =>
                `${i + 1}. Type: ${c.type}\n` +
                `   Confidence: ${c.confidence.toFixed(3)}\n` +
                `   Severity: ${c.severity.toFixed(3)}\n` +
                `   Details: ${c.details}\n` +
                `   Tasks:\n` +
                c.tasks.map(t => `     - ${t.termKey}${t.punctuation} (f: ${t.state.truthValue.frequency.toFixed(3)}, c: ${t.state.truthValue.confidence.toFixed(3)})`).join('\n')
            ).join('\n\n');
    }
}

module.exports = MetaCognition;