function findTasksInTimeWindow(tasks, startTime, endTime) {
    return tasks.filter(task => {
        const {occurrenceTime} = task.state.stamp;
        if (!occurrenceTime) {
            return false;
        }

        const taskEndTime = task.state.stamp.endTime || occurrenceTime;

        return startTime <= taskEndTime && endTime >= occurrenceTime;
    });
}

function determineTemporalRelationship(task1, task2) {
    const time1 = task1.state.stamp.occurrenceTime;
    const time2 = task2.state.stamp.occurrenceTime;

    if (!time1 || !time2) {
        return null;
    }

    const end1 = task1.state.stamp.endTime || time1;
    const end2 = task2.state.stamp.endTime || time2;

    if (end1 < time2) {
        return 'before';
    }
    if (end2 < time1) {
        return 'after';
    }
    if (time1 >= time2 && end1 <= end2) {
        return 'during';
    }
    if (time2 >= time1 && end2 <= end1) {
        return 'contains';
    }
    if ((time1 <= time2 && end1 > time2) || (time2 <= time1 && end2 > time1)) {
        return 'overlaps';
    }
    if (end1 === time2) {
        return 'meets';
    }
    if (end2 === time1) {
        return 'met-by';
    }

    return null;
}

export {
    findTasksInTimeWindow,
    determineTemporalRelationship
};
