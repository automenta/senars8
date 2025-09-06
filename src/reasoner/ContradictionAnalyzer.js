const CONTRADICTION_SEVERITY_WEIGHTS = {
    direct_negation: 1.0,
    inheritance_conflict: 0.8,
    implication_conflict: 0.8,
    transitive_inheritance_conflict: 0.7,
    equivalence_conflict: 0.7,
    set_conflict: 0.7,
    conjunction_conflict: 0.65,
    disjunction_conflict: 0.65,
    intensional_set_conflict: 0.65,
    variable_conflict: 0.6,
    temporal_conflict: 0.6,
    goal_conflict: 0.6,
    frequency_conflict: 0.55
};

class ContradictionAnalyzer {
    analyze(task1, task2, parsed1, parsed2) {
        const analysisMethods = [
            this._analyzeDirectNegation, this._analyzeInheritanceConflict,
            this._analyzeImplicationConflict, this._analyzeEquivalenceConflict,
            this._analyzeSetConflict, this._analyzeConjunctionConflict,
            this._analyzeDisjunctionConflict, this._analyzeIntensionalSetConflict,
            this._analyzeGoalConflict, this._analyzeFrequencyConflict
        ];
        for (const method of analysisMethods) {
            const result = method.call(this, task1, task2, parsed1, parsed2);
            if (result) return result;
        }
        return null;
    }

    _analyzeDirectNegation(task1, task2, parsed1, parsed2) {
        const check = (p1, p2, t1, t2) => {
            if (p1.type !== 'Negation') return null;
            const innerTermKey = p1.key.substring(p1.key.indexOf(',') + 1, p1.key.length - 1).trim();
            if (innerTermKey === t2.termKey) {
                return {
                    type: 'direct_negation',
                    details: `Direct negation: "${t1.termKey}" vs "${t2.termKey}"`
                };
            }
            return null;
        };
        return check(parsed1, parsed2, task1, task2) || check(parsed2, parsed1, task2, task1);
    }

    _analyzeBinaryStatementConflict(task1, task2, parsed1, parsed2, statementType) {
        if (parsed1.type !== statementType || parsed2.type !== statementType || parsed1.subject.key !== parsed2.subject.key) {
            return null;
        }
        const pred1 = parsed1.predicate;
        const pred2 = parsed2.predicate;
        const check = (p1, p2) => p1.type === 'Negation' && p1.term.key === p2.key;
        if (check(pred1, pred2) || check(pred2, pred1)) {
            return {
                type: `${statementType.toLowerCase()}_conflict`,
                details: `${statementType} conflict: "${task1.termKey}" vs "${task2.termKey}"`
            };
        }
        return null;
    }

    _analyzeInheritanceConflict(task1, task2, parsed1, parsed2) {
        return this._analyzeBinaryStatementConflict(task1, task2, parsed1, parsed2, 'Inheritance');
    }

    _analyzeImplicationConflict(task1, task2, parsed1, parsed2) {
        return this._analyzeBinaryStatementConflict(task1, task2, parsed1, parsed2, 'Implication');
    }

    _analyzeEquivalenceConflict(task1, task2, parsed1, parsed2) {
        return this._analyzeBinaryStatementConflict(task1, task2, parsed1, parsed2, 'Equivalence');
    }

    _analyzeSetConflict(task1, task2, parsed1, parsed2) {
        if (parsed1.type !== 'ExtensionalSet' || parsed2.type !== 'ExtensionalSet') return null;
        const terms1 = new Set((parsed1.terms || []).map(t => t.key));
        const terms2 = (parsed2.terms || []).map(t => t.key);

        for (const termKey of terms2) {
            if (terms1.has(`(--,${termKey})`)) {
                return {
                    type: 'set_conflict',
                    details: `Set conflict on element ${termKey}`
                };
            }
        }
        return null;
    }

    _analyzeCompoundTermConflict(task1, task2, parsed1, parsed2, expectedType, conflictType) {
        if (parsed1.type !== expectedType || parsed2.type !== expectedType) return null;
        const terms1 = new Map((parsed1.terms || []).map(t => [t.key.replace('--', ''), t]));
        const terms2 = new Map((parsed2.terms || []).map(t => [t.key.replace('--', ''), t]));

        for (const [key, term1] of terms1.entries()) {
            const term2 = terms2.get(key);
            if (term2 && term1.type !== term2.type) {
                return {
                    type: conflictType,
                    details: `${expectedType} conflict on element ${key}`
                };
            }
        }
        return null;
    }

    _analyzeConjunctionConflict(task1, task2, parsed1, parsed2) {
        return this._analyzeCompoundTermConflict(task1, task2, parsed1, parsed2, 'Conjunction', 'conjunction_conflict');
    }

    _analyzeDisjunctionConflict(task1, task2, parsed1, parsed2) {
        return this._analyzeCompoundTermConflict(task1, task2, parsed1, parsed2, 'Disjunction', 'disjunction_conflict');
    }

    _analyzeIntensionalSetConflict(task1, task2, parsed1, parsed2) {
        if (parsed1.type !== 'IntensionalSet' || parsed2.type !== 'IntensionalSet') return null;
        const terms1 = new Set((parsed1.terms || []).map(t => t.key));
        const terms2 = (parsed2.terms || []).map(t => t.key);

        for (const termKey of terms2) {
            if (terms1.has(`(--,${termKey})`)) {
                return {
                    type: 'intensional_set_conflict',
                    details: `Intensional set conflict on element ${termKey}`
                };
            }
        }
        return null;
    }

    _analyzeFrequencyConflict(task1, task2) {
        const freqConflict = Math.abs(task1.state.truthValue.frequency - task2.state.truthValue.frequency) > 0.8;
        const highConfidence = task1.state.truthValue.confidence > 0.8 && task2.state.truthValue.confidence > 0.8;
        if (freqConflict && highConfidence) {
            return {
                type: 'frequency_conflict',
                details: `High confidence frequency conflict for "${task1.termKey}"`
            };
        }
        return null;
    }

    _analyzeGoalConflict(task1, task2, parsed1, parsed2) {
        if (task1.punctuation !== '!' || task2.punctuation !== '!') return null;
        return this._analyzeDirectNegation(task1, task2, parsed1, parsed2) ? {
            type: 'goal_conflict',
            details: `Direct goal conflict: "${task1.termKey}" vs "${task2.termKey}"`
        } : null;
    }

    calculateSeverity(contradictionType, task1, task2) {
        const c1 = task1.state.truthValue.confidence;
        const c2 = task2.state.truthValue.confidence;
        const typeWeight = CONTRADICTION_SEVERITY_WEIGHTS[contradictionType.type] || 0.5;
        return Math.min(1.0, typeWeight * (c1 + c2) / 2);
    }
}

module.exports = ContradictionAnalyzer;
