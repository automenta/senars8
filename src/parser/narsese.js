// Generated automatically by nearley, version 2.20.1
// http://github.com/Hardmath123/nearley
(function () {
    function id(x) {
        return x[0];
    }

    const lexer = require('./lexer');
    var grammar = {
        Lexer: lexer,
        ParserRules: [
            {"name": "main", "symbols": ["term"]},
            {"name": "term", "symbols": ["atomic"]},
            {"name": "term", "symbols": ["compound"]},
            {"name": "term", "symbols": [{"literal": "("}, "term", {"literal": ")"}]},
            {"name": "atomic", "symbols": [(lexer.has("identifier") ? {type: "identifier"} : identifier)]},
            {"name": "compound", "symbols": ["inheritance"]},
            {"name": "compound", "symbols": ["implication"]},
            {"name": "compound", "symbols": ["instance"]},
            {"name": "compound", "symbols": ["property"]},
            {"name": "compound", "symbols": ["negation"]},
            {"name": "compound", "symbols": ["conjunction"]},
            {"name": "compound", "symbols": ["disjunction"]},
            {"name": "compound", "symbols": ["extensionalDifference"]},
            {"name": "compound", "symbols": ["intensionalDifference"]},
            {
                "name": "inheritance",
                "symbols": [{"literal": "("}, "term", {"literal": "-->"}, "term", {"literal": ")"}]
            },
            {
                "name": "implication",
                "symbols": [{"literal": "("}, "term", {"literal": "==>"}, "term", {"literal": ")"}]
            },
            {"name": "instance", "symbols": [{"literal": "("}, "term", {"literal": "{--"}, "term", {"literal": ")"}]},
            {"name": "property", "symbols": [{"literal": "("}, "term", {"literal": "--}"}, "term", {"literal": ")"}]},
            {"name": "negation", "symbols": [{"literal": "("}, {"literal": "--,"}, "term", {"literal": ")"}]},
            {"name": "conjunction", "symbols": [{"literal": "("}, {"literal": "&,"}, "term_list", {"literal": ")"}]},
            {"name": "disjunction", "symbols": [{"literal": "("}, {"literal": "||,"}, "term_list", {"literal": ")"}]},
            {
                "name": "extensionalDifference",
                "symbols": [{"literal": "("}, {"literal": "#,"}, "term_list", {"literal": ")"}]
            },
            {
                "name": "intensionalDifference",
                "symbols": [{"literal": "("}, {"literal": "\\\\,"}, "term_list", {"literal": ")"}]
            },
            {"name": "term_list", "symbols": ["term"]},
            {"name": "term_list", "symbols": ["term", {"literal": ","}, "term_list"]}
        ]
        , ParserStart: "main"
    }
    if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
        module.exports = grammar;
    } else {
        window.grammar = grammar;
    }
})();
