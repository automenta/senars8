class Rules {
    constructor(core) {
        this.core = core;
        this.rules = [];
        this.index = new Map(); // Index rules by type for fast lookup
    }

    addRule(rule) {
        if (!rule) return null;

        const id = rule.id || `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        rule.id = id;

        // Index by type for efficient filtering
        const type = rule.type || 'general';
        if (!this.index.has(type)) {
            this.index.set(type, []);
        }
        this.index.get(type).push(rule);

        this.rules.push(rule);
        return id;
    }

    // Winnow instead of exhaustive evaluation
    evaluate(context) {
        const results = [];

        // Get relevant rule types from context
        const relevantTypes = this._getRelevantTypes(context);

        for (const type of relevantTypes) {
            const typeRules = this.index.get(type) || [];

            // Winnow rules: filter by conditions first, then execute
            const matchingRules = this._winnowRules(typeRules, context);

            for (const rule of matchingRules) {
                const result = this._executeRule(rule, context);
                if (result) {
                    results.push(result);

                    // Short-circuit if rule says to halt evaluation
                    if (rule.haltOnMatch) {
                        break;
                    }
                }
            }
        }

        return results;
    }

    _winnowRules(rules, context) {
        return rules.filter(rule => this._matchesConditions(rule, context));
    }

    _matchesConditions(rule, context) {
        if (!rule.conditions || rule.conditions.length === 0) return true;

        return rule.conditions.every(condition => {
            try {
                return condition(context);
            } catch (e) {
                console.error(`Condition evaluation failed:`, e);
                return false;
            }
        });
    }

    _executeRule(rule, context) {
        if (typeof rule.action === 'function') {
            try {
                return rule.action(context, this.core);
            } catch (e) {
                console.error(`Rule execution failed:`, e);
                return null;
            }
        }
        return null;
    }

    _getRelevantTypes(context) {
        const types = new Set(['general']);

        if (context && context.type) types.add(context.type);
        if (context && context.punctuation) types.add(context.punctuation);
        if (context && context.task) types.add('task');
        if (context && context.belief) types.add('belief');

        return Array.from(types);
    }

    removeRule(id) {
        if (!id) return;

        this.rules = this.rules.filter(rule => rule.id !== id);

        for (const [type, rules] of this.index) {
            this.index.set(type, rules.filter(rule => rule.id !== id));
        }
    }

    getStats() {
        return {
            totalRules: this.rules.length,
            indexedTypes: Array.from(this.index.keys()),
            rulesByType: Object.fromEntries(
                Array.from(this.index.entries()).map(([type, rules]) => [type, rules.length])
            )
        };
    }
}

export default Rules;