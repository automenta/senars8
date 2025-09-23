// Custom Ace Editor mode for Narsese
import ace from 'ace-builds/src-noconflict/ace';

ace.define('ace/mode/narsese', ['require', 'exports', 'module', 'ace/lib/oop', 'ace/mode/text', 'ace/mode/text_highlight_rules'], function(require, exports, module) {
    const oop = require('ace/lib/oop');
    const TextMode = require('ace/mode/text').Mode;
    const TextHighlightRules = require('ace/mode/text_highlight_rules').TextHighlightRules;

    const NarseseHighlightRules = function() {
        // Define the highlighting rules for Narsese
        const keywords = (
            'IN:\\b' +
            'OUT:\\b'
        );

        const builtinConstants = (
            'true|false|null|TRUE|FALSE|NULL'
        );

        const builtinFunctions = (
            '\\(\\*|\\*\\)|<|>|\\[|\\]|\\.|\\?|\\+|\\-|\\*|\\/|:|;|,|\\(|\\)|\\{|\\}|_|\\^'
        );

        const keywordMapper = this.createKeywordMapper({
            'keyword': keywords,
            'constant.language': builtinConstants,
            'support.function': builtinFunctions
        }, 'identifier', true);

        this.$rules = {
            start: [{
                token: 'comment',
                regex: '//.*$'
            }, {
                token: 'comment.start',
                regex: '/\\*',
                next: 'comment'
            }, {
                token: 'string', // single line
                regex: '["](?:(?:\\\\.)|(?:[^"\\\\]))*?["]'
            }, {
                token: 'string', // single line
                regex: "['](?:(?:\\\\.)|(?:[^'\\\\]))*?[']"
            }, {
                token: 'constant.numeric', // hex
                regex: '0[xX][0-9a-fA-F]+\\b'
            }, {
                token: 'constant.numeric', // float
                regex: '[+-]?\\d+(?:(?:\\.\\d*)?(?:[eE][+-]?\\d+)?)?\\b'
            }, {
                token: 'keyword.operator',
                regex: '<|>|\\[|\\]|\\.|\\?|\\+|\\-|\\*|\\/|:|;|,|\\(|\\)|\\{|\\}|_|\\^|=|!|&|%|~'
            }, {
                token: 'text',
                regex: '\\s+'
            }],
            
            comment: [{
                token: 'comment.end',
                regex: '\\*/',
                next: 'start'
            }, {
                defaultToken: 'comment'
            }]
        };

        // Add specific Narsese patterns
        this.addRules({
            start: [{
                // Narsese statement patterns: <subject --> predicate>.
                token: 'narsese.statement',
                regex: '<[^>]*--[^>]*>\\s*[\\?\\.]'
            }, {
                // Narsese statement patterns: <subject <-> predicate>.
                token: 'narsese.statement',
                regex: '<[^>]*<->[^>]*>\\s*[\\?\\.]'
            }, {
                // Narsese statement patterns with connectors: (&&, ||, etc.)
                token: 'narsese.connector',
                regex: '\\(&&[^)]*\\)|\\(\\|[^)]*\\)|\\(\\^[^)]*\\)|\\(\\~[^)]*\\)'
            }, {
                // Narsese term patterns
                token: 'narsese.term',
                regex: '[a-zA-Z][a-zA-Z0-9_-]*'
            }]
        });
    };
    oop.inherits(NarseseHighlightRules, TextHighlightRules);

    const Mode = function() {
        this.HighlightRules = NarseseHighlightRules;
    };
    oop.inherits(Mode, TextMode);

    (function() {
        this.$id = 'ace/mode/narsese';
    }).call(Mode.prototype);

    exports.Mode = Mode;
});