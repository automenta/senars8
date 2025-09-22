class BaseStrategy {
    selectCombinations(tasks, arity) {
        throw new Error('Method "selectCombinations" must be implemented by subclasses');
    }
}

export default BaseStrategy;
