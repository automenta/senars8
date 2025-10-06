export const formatNumber = (value, precision = 2) => (value || 0).toFixed(precision);
export const formatTruthValue = (truthValue) => truthValue ?
    `TV(${formatNumber(truthValue.frequency)}, ${formatNumber(truthValue.confidence)})` : '';
export const formatConfidence = (confidence) => `${formatNumber(confidence * 100)}%`;

export const extractPunctuation = (task) => {
    if (task.punctuation) return task.punctuation;
    if (task.statement?.endsWith('!')) return '!';
    if (task.statement?.endsWith('?')) return '?';
    return '.';
};

export const getTaskDisplayData = (task) => {
    if (!task) return {
        termKey: 'Invalid Task',
        priority: formatNumber(0),
        punctuation: '.',
        truthValue: '',
    };

    return {
        termKey: task.termKey || task.statement || task.id || 'Unknown',
        priority: formatNumber(task.priority || task.state?.priority || 0),
        punctuation: extractPunctuation(task),
        truthValue: formatTruthValue(task.state?.truthValue),
    };
};

export const formatTaskForDisplay = (task) => {
    const data = getTaskDisplayData(task);
    return `${data.termKey}${data.punctuation} [${data.priority}] ${data.truthValue}`.trim();
};