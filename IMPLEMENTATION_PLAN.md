# Implementation Plan: High-Impact Refactorings

This document outlines concrete steps for implementing the highest-impact refactorings identified in the SeNARS codebase.

## 1. Standardize Error Handling (High Impact, Low Effort)

### Current Issues
- Mixed usage of `createModuleErrorHandler` and direct error handling functions
- Direct `try/catch` blocks that could use `safeAsync`/`safeSync`
- Inconsistent error context formatting

### Implementation Steps

#### Step 1: Standardize Module Error Handlers
```javascript
// Before (mixed approaches)
import {handleErrorWithDefault} from '../utils/errorHandler.js';
import {createModuleErrorHandler} from '../utils/errorHandler.js';

// After (consistent approach)
import {createModuleErrorHandler} from '../utils/errorHandler.js';
const errorHandler = createModuleErrorHandler('ModuleName');
```

#### Step 2: Replace Direct Try/Catch with Safe Wrappers
```javascript
// Before
try {
  await operation();
} catch (error) {
  logError('Operation failed:', error);
  return defaultValue;
}

// After
return await safeAsync(async () => {
  return await operation();
}, 'Operation context', defaultValue);
```

### Files to Update
- `src/agent/Agent.js`
- `src/lm/ProactiveEnricher.js`
- `src/lm/QAService.js`
- `src/lm/PlanRepairer.js`
- `src/reasoner/Reasoner.js`
- `src/reasoner/TemporalReasoner.js`
- `src/system/ActionExecutor.js`
- `src/system/Cycle.js`
- `src/system/Perception.js`
- `src/system/Planner.js`
- `src/system/System.js`
- `src/system/SystemFactory.js`

## 2. Consolidate Utility Functions (High Impact, Low Effort)

### Current Issues
- Duplicated utility patterns across multiple files
- Performance comments indicate manual optimization needs
- Inconsistent array/object processing

### Implementation Steps

#### Step 1: Create Enhanced Helpers
```javascript
// src/utils/helpers.js
const normalizeToArray = input => (Array.isArray(input) ? input : [input]);

const isNonEmptyArray = input => Array.isArray(input) && input.length > 0;

const isNonEmptyObject = input => 
  input && typeof input === 'object' && !Array.isArray(input) && Object.keys(input).length > 0;

const safeGet = (obj, path, defaultValue = null) => {
  const keys = path.split('.');
  let current = obj;
  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key];
    } else {
      return defaultValue;
    }
  }
  return current;
};

export {
    normalizeToArray,
    isNonEmptyArray,
    isNonEmptyObject,
    safeGet
};
```

#### Step 2: Replace Duplicated Patterns
```javascript
// Before (duplicated in multiple files)
const result = [];
for (let i = 0; i < tasks.length; i++) {
    if (tasks[i]?.punctuation === type) {
        result.push(tasks[i]);
    }
}
return result;

// After (using utility function)
import {filterByProperty} from '../utils/arrayUtils.js';
return filterByProperty(tasks, 'punctuation', type);
```

### Files to Update
- `src/utils/helpers.js` (enhance)
- `src/utils/arrayUtils.js` (create new)
- `src/utils/objectUtils.js` (create new)
- `src/core/Task.js`
- `src/core/Term.js`
- `src/utils/task-utils.js`
- `src/memory/Memory.js`
- `src/reasoner/Reasoner.js`

## 3. Standardize ID Generation (High Impact, Low Effort)

### Current Issues
- Mixed usage of `generateOptimizedId` and UUID library
- Inconsistent ID generation patterns

### Implementation Steps

#### Step 1: Replace UUID Usage
```javascript
// Before
import {v4 as uuidv4} from 'uuid';
const actionId = uuidv4();

// After
import {generateOptimizedId} from '../utils/IdGenerator.js';
const actionId = generateOptimizedId(`action-${actionName}`);
```

#### Step 2: Create ID Generation Utilities
```javascript
// src/utils/IdGenerator.js
function generateActionId(actionName) {
    return generateOptimizedId(`action-${actionName}`);
}

function generatePlanId(goalKey) {
    return generateOptimizedId(`plan-${goalKey}`);
}

export {
    generateSequentialId,
    generateHashId,
    generateOptimizedId,
    generateActionId,
    generatePlanId
};
```

### Files to Update
- `src/utils/IdGenerator.js` (enhance)
- `src/system/ActionExecutor.js`
- `src/system/Plan.js`
- `src/core/Task.js`

## 4. Consolidate Validation Logic (Medium Impact, Medium Effort)

### Current Issues
- Duplicated validation in `Task.js`
- Unused `validation.js` file
- Inconsistent validation approaches

### Implementation Steps

#### Step 1: Enhance Validation Utilities
```javascript
// src/utils/validation.js
function validateTerm(term, name = 'Term') {
    if (!term) {
        throw new Error(`${name} is required`);
    }
    if (typeof term === 'string') {
        if (term.length === 0) {
            throw new Error(`${name} must be a non-empty string`);
        }
    } else if (typeof term === 'object') {
        if (!term.key || typeof term.key !== 'string' || term.key.length === 0) {
            throw new Error(`${name} must have a valid key property`);
        }
    } else {
        throw new Error(`${name} must be a string or object`);
    }
}

function validatePunctuation(punctuation, name = 'Punctuation') {
    const validPunctuation = ['.', '!', '?'];
    if (!validPunctuation.includes(punctuation)) {
        throw new Error(`${name} must be one of: ${validPunctuation.join(', ')}`);
    }
}

function validateTruthValue(truthValue, name = 'TruthValue') {
    if (!truthValue || typeof truthValue !== 'object') {
        throw new Error(`${name} must be an object`);
    }
    if (typeof truthValue.frequency !== 'number' || 
        truthValue.frequency < 0 || truthValue.frequency > 1) {
        throw new Error(`${name}.frequency must be a number between 0 and 1`);
    }
    if (typeof truthValue.confidence !== 'number' || 
        truthValue.confidence < 0 || truthValue.confidence > 1) {
        throw new Error(`${name}.confidence must be a number between 0 and 1`);
    }
}

export {
    validateString,
    validateNonEmptyArray,
    validateArray,
    validateObject,
    validateTask,
    validateTerm,
    validatePunctuation,
    validateTruthValue
};
```

#### Step 2: Replace Duplicated Validation
```javascript
// Before (in Task.js)
#isValidTerm(term) {
    if (!term) {
        return false;
    }
    if (typeof term === 'string') {
        return term.length > 0;
    }
    if (typeof term === 'object') {
        return term.key && typeof term.key === 'string' && term.key.length > 0;
    }
    return false;
}

// After (using validation utility)
import {validateTerm} from '../utils/validation.js';

constructor(term, punctuation, truthValue = {}, stamp = {}) {
    // Validate inputs
    validateTerm(term, 'Task term');
    validatePunctuation(punctuation, 'Task punctuation');
    // ... rest of constructor
}
```

### Files to Update
- `src/utils/validation.js` (enhance)
- `src/core/Task.js`
- `src/core/Term.js` (if needed)

## 5. Create Base Entity Class (High Impact, High Effort)

### Current Issues
- Duplicated patterns in `Task` and `Term` classes
- Similar caching, equality, cloning, and serialization methods
- Inconsistent method implementations

### Implementation Steps

#### Step 1: Create BaseEntity Class
```javascript
// src/core/BaseEntity.js
class BaseEntity {
    constructor() {
        this._toStringCache = null;
    }

    // Caching for toString
    toString() {
        if (!this._toStringCache) {
            this._toStringCache = this.formatString();
        }
        return this._toStringCache;
    }

    // To be implemented by subclasses
    formatString() {
        throw new Error('formatString must be implemented by subclass');
    }

    // Equality checking
    equals(other) {
        if (!other || this.constructor !== other.constructor) {
            return false;
        }
        return this.getId() === other.getId();
    }

    // To be implemented by subclasses
    getId() {
        throw new Error('getId must be implemented by subclass');
    }

    // Cloning
    clone() {
        const cloned = Object.create(Object.getPrototypeOf(this));
        Object.assign(cloned, this);
        cloned._toStringCache = null;
        return cloned;
    }

    // JSON serialization
    toJSON() {
        throw new Error('toJSON must be implemented by subclass');
    }
}

export default BaseEntity;
```

#### Step 2: Refactor Task and Term to Extend BaseEntity
```javascript
// src/core/Task.js
import BaseEntity from './BaseEntity.js';

class Task extends BaseEntity {
    // ... existing properties

    constructor(term, punctuation, truthValue = {}, stamp = {}) {
        super();
        // ... existing constructor logic
    }

    formatString() {
        const frequency = this.#state.truthValue.frequency.toFixed(3);
        const confidence = this.#state.truthValue.confidence.toFixed(3);
        return `${this.#termKey}${this.#punctuation} (f: ${frequency}, c: ${confidence})`;
    }

    getId() {
        return this.#id;
    }

    toJSON() {
        return {
            id: this.#id,
            termKey: this.#termKey,
            punctuation: this.#punctuation,
            state: {
                ...this.#state
            }
        };
    }
}
```

### Files to Create/Update
- `src/core/BaseEntity.js` (create new)
- `src/core/Task.js` (refactor to extend BaseEntity)
- `src/core/Term.js` (refactor to extend BaseEntity)

## Implementation Timeline

### Week 1: Quick Wins
- Standardize error handling approaches
- Consolidate utility functions
- Standardize ID generation

### Week 2: Medium Impact
- Consolidate validation logic
- Enhance configuration management
- Standardize logging patterns

### Week 3: High Impact
- Create base entity class
- Refactor Task and Term classes
- Optimize memory management structures

## Testing Strategy

1. **Unit Tests**: Ensure all existing tests pass after each refactoring
2. **Integration Tests**: Verify component interactions remain intact
3. **Performance Tests**: Confirm optimizations provide expected benefits
4. **Regression Tests**: Run full test suite to ensure no functionality is broken

## Risk Mitigation

1. **Incremental Implementation**: Make changes in small, testable increments
2. **Backup Strategy**: Keep original implementations as reference during refactoring
3. **Performance Monitoring**: Measure impact of changes on system performance
4. **Code Reviews**: Have team members review changes before merging