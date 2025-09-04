function buildTermKey(parsedTerm) {
    if (!parsedTerm || !parsedTerm.type) {
        return '';
    }

    switch (parsedTerm.type) {
        case 'Atomic':
            return parsedTerm.key;
        case 'Inheritance':
            return `(${buildTermKey(parsedTerm.subject)} --> ${buildTermKey(parsedTerm.predicate)})`;
        default:
            throw new Error(`buildTermKey does not support type: ${parsedTerm.type}`);
    }
}

module.exports = {
    buildTermKey
};
