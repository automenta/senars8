const {parseTerm} = require('./src/parser/TermParser');

// Test that the parser output works with the Reasoner's expectations
console.log('Testing Reasoner compatibility:');

// Test modus ponens pattern: (A ==> B), A. |- B.
console.log('\nTesting Modus Ponens pattern:');
const implication = parseTerm('(cat ==> furry)');
const belief = parseTerm('cat');

console.log('Implication:', JSON.stringify(implication, null, 2));
console.log('Belief:', JSON.stringify(belief, null, 2));

if (implication?.type === 'Implication' && belief?.type === 'Atomic') {
  if (implication.subject.type === 'Atomic' && implication.subject.key === belief.key) {
    console.log('✓ Modus Ponens pattern matched');
    console.log('Conclusion:', implication.predicate.key);
  } else {
    console.log('✗ Modus Ponens pattern not matched');
  }
} else {
  console.log('✗ Invalid term types for Modus Ponens');
}

// Test inheritance chaining pattern: (A --> B), (B --> C) |- (A --> C)
console.log('\nTesting Inheritance Chaining pattern:');
const inheritance1 = parseTerm('(cat --> mammal)');
const inheritance2 = parseTerm('(mammal --> animal)');

console.log('Inheritance 1:', JSON.stringify(inheritance1, null, 2));
console.log('Inheritance 2:', JSON.stringify(inheritance2, null, 2));

if (inheritance1?.type === 'Inheritance' && inheritance2?.type === 'Inheritance') {
  if (inheritance1.predicate.type === 'Atomic' && inheritance2.subject.type === 'Atomic' && 
      inheritance1.predicate.key === inheritance2.subject.key) {
    console.log('✓ Inheritance chaining pattern matched');
    const conclusion = `(${inheritance1.subject.key} --> ${inheritance2.predicate.key})`;
    console.log('Conclusion:', conclusion);
  } else {
    console.log('✗ Inheritance chaining pattern not matched');
  }
} else {
  console.log('✗ Invalid term types for Inheritance Chaining');
}

// Test induction pattern: (A --> B), (C --> B) |- (A --> C)
console.log('\nTesting Induction pattern:');
const inheritance3 = parseTerm('(cat --> mammal)');
const inheritance4 = parseTerm('(dog --> mammal)');

console.log('Inheritance 3:', JSON.stringify(inheritance3, null, 2));
console.log('Inheritance 4:', JSON.stringify(inheritance4, null, 2));

if (inheritance3?.type === 'Inheritance' && inheritance4?.type === 'Inheritance') {
  if (inheritance3.predicate.type === 'Atomic' && inheritance4.predicate.type === 'Atomic' && 
      inheritance3.predicate.key === inheritance4.predicate.key && 
      inheritance3.subject.key !== inheritance4.subject.key) {
    console.log('✓ Induction pattern matched');
    const conclusion = `(${inheritance3.subject.key} --> ${inheritance4.subject.key})`;
    console.log('Conclusion:', conclusion);
  } else {
    console.log('✗ Induction pattern not matched');
  }
} else {
  console.log('✗ Invalid term types for Induction');
}

// Test abduction pattern: (A --> B), (C --> B) |- (C --> A)
console.log('\nTesting Abduction pattern:');
const inheritance5 = parseTerm('(cat --> mammal)');
const inheritance6 = parseTerm('(dog --> mammal)');

console.log('Inheritance 5:', JSON.stringify(inheritance5, null, 2));
console.log('Inheritance 6:', JSON.stringify(inheritance6, null, 2));

if (inheritance5?.type === 'Inheritance' && inheritance6?.type === 'Inheritance') {
  if (inheritance5.predicate.type === 'Atomic' && inheritance6.predicate.type === 'Atomic' && 
      inheritance5.predicate.key === inheritance6.predicate.key && 
      inheritance5.subject.key !== inheritance6.subject.key) {
    console.log('✓ Abduction pattern matched');
    const conclusion = `(${inheritance6.subject.key} --> ${inheritance5.subject.key})`;
    console.log('Conclusion:', conclusion);
  } else {
    console.log('✗ Abduction pattern not matched');
  }
} else {
  console.log('✗ Invalid term types for Abduction');
}

// Test analogy pattern: (A --> B), (C --> D), (A --> C) |- (B --> D)
console.log('\nTesting Analogy pattern:');
const inheritance7 = parseTerm('(cat --> mammal)');
const inheritance8 = parseTerm('(dog --> animal)');
const inheritance9 = parseTerm('(cat --> dog)');

console.log('Inheritance 7:', JSON.stringify(inheritance7, null, 2));
console.log('Inheritance 8:', JSON.stringify(inheritance8, null, 2));
console.log('Inheritance 9:', JSON.stringify(inheritance9, null, 2));

if (inheritance7?.type === 'Inheritance' && inheritance8?.type === 'Inheritance' && inheritance9?.type === 'Inheritance') {
  // Check if we have the pattern for analogy
  // parsed1.subject === parsed3.subject && parsed2.subject === parsed3.predicate
  if (inheritance7.subject.key === inheritance9.subject.key && 
      inheritance8.subject.key === inheritance9.predicate.key) {
    console.log('✓ Analogy pattern matched');
    const conclusion = `(${inheritance7.predicate.key} --> ${inheritance8.predicate.key})`;
    console.log('Conclusion:', conclusion);
  } else {
    console.log('✗ Analogy pattern not matched');
    console.log(`  inheritance7.subject.key (${inheritance7.subject.key}) === inheritance9.subject.key (${inheritance9.subject.key}): ${inheritance7.subject.key === inheritance9.subject.key}`);
    console.log(`  inheritance8.subject.key (${inheritance8.subject.key}) === inheritance9.predicate.key (${inheritance9.predicate.key}): ${inheritance8.subject.key === inheritance9.predicate.key}`);
  }
} else {
  console.log('✗ Invalid term types for Analogy');
}