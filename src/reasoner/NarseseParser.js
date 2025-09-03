const REGEX_MAP = {
    implication: /^\((.+)\s==>\s(.+)\)$/,
    conjunction: /^\(&,\s(.+)\)$/,
    negation: /^\(--,\s(.+)\)$/,
    inheritance: /^\((.+)\s-->\s(.+)\)$/,
    instance: /^\((.+)\s{--\s(.+)\)$/,
    property: /^\((.+)\s--}\s(.+)\)$/,
};

function parse(termKey) {
    if (typeof termKey !== 'string') {
        return null;
    }

    for (const [type, regex] of Object.entries(REGEX_MAP)) {
        const match = termKey.match(regex);
        if (match) {
            switch (type) {
                case 'implication':
                case 'inheritance':
                case 'instance':
                case 'property':
                    return {
                        type,
                        subject: match[1].trim(),
                        predicate: match[2].trim(),
                    };
                case 'negation':
                    return {
                        type,
                        term: match[1].trim(),
                    };
                case 'conjunction':
                    return {
                        type,
                        terms: match[1].split(',').map(t => t.trim()),
                    };
            }
        }
    }

    // If no specific structure matches, it's an atomic term
    return {
        type: 'atomic',
        term: termKey,
    };
}

module.exports = { parse };
