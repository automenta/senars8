# Reasoning Capabilities 🧠

SeNARS implements rigorous, explainable reasoning through formal inference rules.

---

## Inference Rules

| Rule             | Structure                          | Purpose                        |
|------------------|------------------------------------|--------------------------------|
| **Deduction**    | `<M --> P>, <S --> M> ⊢ <S --> P>` | Classical logical deduction    |
| **Induction**    | `<M --> P>, <M --> S> ⊢ <S --> P>` | Evidence-based generalization  |
| **Abduction**    | `<P --> M>, <S --> M> ⊢ <S --> P>` | Hypothesis generation          |
| **Analogy**      | `<M --> P>, <M <-> S> ⊢ <S --> P>` | Structure-preserving inference |
| **Modus Ponens** | `<P ==> Q>, <P> ⊢ <Q>`             | Conditional reasoning          |

---

## Temporal Reasoning ⏰

Specialized temporal reasoning capabilities:

- **Temporal Relationship Inference**: Determine relationships between events
- **Pattern Detection**: Identify periodic and sequential patterns
- **Future Prediction**: Forecast future task occurrences
- **Anomaly Detection**: Identify temporal anomalies

### Temporal Term Types

| Type                          | Syntax              | Example                            |
|-------------------------------|---------------------|------------------------------------|
| **Predictive Implication**    | `<task1 =/> task2>` | `(see_lightning =/> hear_thunder)` |
| **Retrospective Implication** | `<task1 \> task2>`  | `(rain \> wet_streets)`            |
| **Concurrent Implication**    | `<task1 <> task2>`  | `(storm <> thunder)`               |

---

## Planning 🎯

SeNARS supports multiple planning strategies:

| Strategy      | Approach                  | Benefits                              |
|---------------|---------------------------|---------------------------------------|
| **HTN**       | Hierarchical Task Network | Structured, systematic planning       |
| **A* Search** | Graph-based pathfinding   | Optimal solutions with custom weights |

### Planning Features

- Plan cost calculation
- Task difficulty assessment
- Dynamic strategy selection
- Plan validation (check if goals already achieved)

---

## Meta-Cognition 🔍

Recursive self-improvement mechanisms:

1. **Detection**: Scan for contradictions between new conclusions and existing beliefs
2. **Analysis**: Classify conflicts and select best resolution strategy
3. **Correction**: Generate new Tasks with high priority to resolve inconsistencies

### Resolution Strategies

| Strategy               | Approach                     | Use Case                           |
|------------------------|------------------------------|------------------------------------|
| **Revision**           | Truth value revision         | Directly conflicting beliefs       |
| **Reconciliation**     | Contextual resolution        | Beliefs true in different contexts |
| **Evidence Gathering** | Generate questions           | Need more information              |
| **Temporal Analysis**  | Time-based resolution        | Temporal conflicts                 |
| **Causal Analysis**    | Examine causal relationships | Causal contradictions              |

---

## Narsese Grammar 🔤

Comprehensive Narsese expressions:

| Type                       | Syntax                     | Example                             |
|----------------------------|----------------------------|-------------------------------------|
| **Atomic Terms**           | Simple identifiers         | `cat`                               |
| **Inheritance**            | `<subject --> predicate>`  | `(cat --> mammal)`                  |
| **Implication**            | `<premise ==> conclusion>` | `(cat ==> furry)`                   |
| **Negation**               | `(--, term)`               | `(--, cat)`                         |
| **Conjunction**            | `(&, term1, term2, ...)`   | `(&, cat, dog)`                     |
| **Disjunction**            | `(\|, term1, term2, ...)`  | `(\|, cat, dog)`                    |
| **Extensional Difference** | `(-, term1, term2)`        | `(-, cat, dog)`                     |
| **Instance**               | `(term {-- class)`         | `(cat {-- animal)`                  |
| **Property**               | `(term --} property)`      | `(cat --} furry)`                   |
| **Nested Expressions**     | Complex combinations       | `(cat --> (&, furry, intelligent))` |

---

## Economic Attention Model 🎯

Pragmatic attention mechanism focusing computational resources.

### Priority Calculation Factors

| Factor               | Description                  | Impact                               |
|----------------------|------------------------------|--------------------------------------|
| **Truth Value**      | Confidence and frequency     | Higher confidence = higher priority  |
| **Complexity**       | Structural complexity        | Lower complexity = higher priority   |
| **Relevance**        | Relationship to active goals | More relevant = higher priority      |
| **Temporal Factors** | Recency and urgency          | More recent/urgent = higher priority |

---

## Contradiction Resolution ⚖️

SeNARS handles contradictions through multiple strategies:

1. **Truth Value Revision**: Update beliefs based on new evidence
2. **Contextual Resolution**: Resolve conflicts based on context
3. **Question Generation**: Create questions to gather more information
4. **Temporal Analysis**: Resolve time-based conflicts
5. **Causal Analysis**: Examine cause-effect relationships

This ensures coherent, consistent reasoning while maintaining adaptability.