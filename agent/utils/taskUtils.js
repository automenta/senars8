export const formatTaskForBroadcast = (task) => ({
  id: task.id,
  termKey: task.termKey,
  punctuation: task.punctuation,
  priority: task.state?.priority || 0,
  truthValue: task.state?.truthValue || {frequency: 0.5, confidence: 0.5},
  occurrenceTime: task.state?.occurrenceTime || null,
  creationTime: task.state?.stamp?.creationTime || Date.now()
});

export const createTaskFilter = (filter) => {
  const filters = {
    belief: task => task.punctuation === '.',
    goal: task => task.punctuation === '!',
    question: task => task.punctuation === '?'
  };
  return filters[filter] || (() => true);
};

export const createPriorityFilter = (priority) => {
  const taskPriority = task => task.state?.priority || task.priority || 0;
  const filters = {
    high: task => taskPriority(task) >= 0.7,
    medium: task => taskPriority(task) >= 0.3 && taskPriority(task) < 0.7,
    low: task => taskPriority(task) < 0.3
  };
  return filters[priority] || (() => true);
};

export const createCompositeFilter = (...filters) => (task) =>
  filters.every(filter => filter(task));