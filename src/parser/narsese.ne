@{%
const lexer = require('./lexer');
%}

@lexer lexer

# Main entry point
main -> term

# Terms
term -> atomic
      | compound
      | "(" term ")"

# Atomic terms (identifiers)
atomic -> %identifier

# Compound terms
compound -> inheritance
          | implication
          | instance
          | property
          | negation
          | conjunction
          | disjunction
          | product
          | extensionalDifference
          | intensionalDifference

# Inheritance: (subject --> predicate)
inheritance -> "(" term "-->" term ")"

# Implication: (subject ==> predicate)
implication -> "(" term "==>" term ")"

# Instance: (instance {-- class)
instance -> "(" term "{--" term ")"

# Property: (instance --} property)
property -> "(" term "--}" term ")"

# Negation: (--, term)
negation -> "(" "--," term ")"

# Conjunction: (&, term1, term2, ...)
conjunction -> "(" "&," term_list ")"

# Disjunction: (||, term1, term2, ...)
disjunction -> "(" "||," term_list ")"

# Product: (*, term1, term2, ...)
product -> "(" "*" term_list ")"

# Extensional Difference: (#, term1, term2, ...)
extensionalDifference -> "(" "#," term_list ")"

# Intensional Difference: (\\, term1, term2, ...)
intensionalDifference -> "(" "\\\\," term_list ")"

# Term list (comma-separated terms)
term_list -> term
          | term "," term_list