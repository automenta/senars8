const modusPonens = require('./modus-ponens');
const inheritance = require('./inheritance');
const induction = require('./induction');
const abduction = require('./abduction');
const decomposition = require('./decomposition');
const intersection = require('./intersection');
const union = require('./union');
const conversion = require('./conversion');
const contraposition = require('./contraposition');
const analogy = require('./analogy');

module.exports = [
    modusPonens,
    inheritance,
    induction,
    abduction,
    analogy,
    decomposition,
    intersection,
    union,
    conversion,
    contraposition,
];
