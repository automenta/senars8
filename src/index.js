const System = require('./system/System');
const Task = require('./core/Task');
const Term = require('./core/Term');
const { parseTerm } = require('./parser/narseseParser');

module.exports = {
    System,
    Task,
    Term,
    parseTerm,
};
