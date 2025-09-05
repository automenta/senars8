const modusPonens = require('./modus-ponens');
const inheritance = require('./inheritance');
const induction = require('./induction');
const abduction = require('./abduction');
const analogy = require('./analogy');
const composition = require('./composition');
const decomposition = require('./decomposition');
const intersection = require('./intersection');
const union = require('./union');
const conversion = require('./conversion');
const contraposition = require('./contraposition');

module.exports = [
    modusPonens,
    inheritance,
    induction,
    abduction,
    analogy,
    composition,
    decomposition,
    intersection,
    union,
    conversion,
    contraposition,
];
