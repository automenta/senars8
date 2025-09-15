function calculateTemporalPriority(task, currentTime) {
    if (!task.state.stamp.occurrenceTime) {
        return 1.0;
    }

    const endTime = task.state.stamp.endTime || task.state.stamp.occurrenceTime;
    const isOngoing = task.state.stamp.occurrenceTime <= currentTime && currentTime <= endTime;
    const ongoingBoost = isOngoing ? 1.5 : 1.0;

    const timeDifference = Math.abs(currentTime - task.state.stamp.occurrenceTime);

    if (task.state.stamp.occurrenceTime > currentTime) {
        return ongoingBoost * 1.0 / (1.0 + timeDifference / 1000);
    }
    return ongoingBoost * 1.0 / (1.0 + timeDifference / 5000);
}

export {
    calculateTemporalPriority
};
