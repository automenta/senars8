// Description: Shows the integration of Natural Language Processing (NLP) for parsing input.
const { runDemo } = require('./demo-utils');

async function nlpIntegrationDemo() {
    const taskDefs = [
        // Fact expressed in natural language
        {
            termKey: '(sky_is_blue --> observation)',
            punctuation: '.',
            truthValue: {
                frequency: 1.0,
                confidence: 0.9
            }
        },
        // Question expressed in natural language
        {
            termKey: '(why_sky_blue --> question)',
            punctuation: '?',
            truthValue: {
                frequency: 1.0,
                confidence: 0.9
            }
        },
        // Goal expressed in natural language
        {
            termKey: '(explain_light_scattering --> goal)',
            punctuation: '!',
            truthValue: {
                frequency: 1.0,
                confidence: 0.8
            }
        },
        // Complex statement
        {
            termKey: '((it_rains --> ground_gets_wet) --> conditional_knowledge)',
            punctuation: '.',
            truthValue: {
                frequency: 0.9,
                confidence: 0.8
            }
        },
        {
            termKey: '(it_is_raining --> current_condition)',
            punctuation: '.',
            truthValue: {
                frequency: 1.0,
                confidence: 0.9
            }
        }
    ];

    await runDemo('NLP Integration Demo', taskDefs, {
        cycleCount: 5
    });
}

module.exports = nlpIntegrationDemo;

if (require.main === module) {
    nlpIntegrationDemo().catch(console.error);
}