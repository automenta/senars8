class PatternDetector {
    async detectAdvancedPatterns(eventStream) {
        if (eventStream.length <= 5) { return []; }
        const temporalPatterns = this.detectComplexTemporalPatterns(eventStream);
        const causalPatterns = await this.detectCausalPatterns(eventStream);
        const hierarchicalPatterns = this.detectHierarchicalPatterns(eventStream);
        return [...temporalPatterns, ...causalPatterns, ...hierarchicalPatterns];
    }

    detectComplexTemporalPatterns(eventStream) {
        const eventGroups = eventStream.reduce((groups, event) => {
            const type = event.type || 'unknown';
            const timeBucket = Math.floor((event.timestamp || Date.now()) / 10000);
            const key = `${type}_${timeBucket}`;
            if (!groups[key]) { groups[key] = []; }
            groups[key].push(event);
            return groups;
        }, {});

        return Object.entries(eventGroups)
            .filter(([, events]) => events.length > 5)
            .map(([key, events]) => ({
                type: 'temporal_burst',
                id: key,
                confidence: Math.min(1.0, events.length / 10),
                events
            }));
    }

    async detectCausalPatterns(eventStream) {
        const eventTypes = [...new Set(eventStream.map(e => e.type || 'unknown'))];
        const patterns = [];
        for (const type1 of eventTypes) {
            for (const type2 of eventTypes) {
                if (type1 === type2) { continue; }
                const events1 = eventStream.filter(e => (e.type || 'unknown') === type1);
                const events2 = eventStream.filter(e => (e.type || 'unknown') === type2);
                if (events1.length === 0) { continue; }

                const causalCount = events1.reduce((count, e1) =>
                    count + events2.filter(e2 => {
                        const timeDiff = (e2.timestamp || Date.now()) - (e1.timestamp || Date.now());
                        return timeDiff > 0 && timeDiff < 5000;
                    }).length, 0);

                const causalStrength = causalCount / events1.length;
                if (causalStrength > 0.5) {
                    patterns.push({
                        type: 'causal_relationship',
                        id: `${type1}_causes_${type2}`,
                        confidence: causalStrength,
                        relationship: {
                            cause: type1,
                            effect: type2
                        }
                    });
                }
            }
        }
        return patterns;
    }

    detectHierarchicalPatterns(eventStream) {
        const clusters = eventStream.reduce((cls, event) => {
            const key = event.category || event.type || 'unknown';
            if (!cls[key]) { cls[key] = []; }
            cls[key].push(event);
            return cls;
        }, {});

        return Object.entries(clusters)
            .filter(([, events]) => events.length > 3)
            .map(([category, events]) => ({
                type: 'hierarchical_cluster',
                id: category,
                confidence: Math.min(1.0, events.length / 10),
                category,
                count: events.length
            }));
    }

    detectPeriodicPatterns(eventStream) {
        const patterns = [];

        if (eventStream.length > 10) {
            const eventGroups = {};
            for (const event of eventStream) {
                const type = event.type || 'unknown';
                if (!eventGroups[type]) {
                    eventGroups[type] = [];
                }
                eventGroups[type].push(event);
            }

            for (const [type, events] of Object.entries(eventGroups)) {
                if (events.length > 3) {
                    const intervals = [];
                    for (let i = 1; i < events.length; i++) {
                        intervals.push(events[i].timestamp - events[i - 1].timestamp);
                    }

                    if (intervals.length > 2) {
                        const avgInterval = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
                        const variance = intervals.reduce((sum, val) => sum + Math.pow(val - avgInterval, 2), 0) / intervals.length;
                        const stdDev = Math.sqrt(variance);

                        if (stdDev / avgInterval < 0.3) {
                            patterns.push({
                                type,
                                period: avgInterval,
                                regularity: 1.0 - (stdDev / avgInterval)
                            });
                        }
                    }
                }
            }
        }

        return patterns;
    }

    detectCorrelations(eventStream) {
        const correlations = [];

        if (eventStream.length > 10) {
            const eventGroups = {};
            for (const event of eventStream) {
                const type = event.type || 'unknown';
                if (!eventGroups[type]) {
                    eventGroups[type] = [];
                }
                eventGroups[type].push(event);
            }

            const types = Object.keys(eventGroups);

            for (let i = 0; i < types.length; i++) {
                for (let j = i + 1; j < types.length; j++) {
                    const type1 = types[i];
                    const type2 = types[j];
                    const events1 = eventGroups[type1];
                    const events2 = eventGroups[type2];

                    let correlationStrength = 0;
                    let totalCount = 0;

                    for (const event1 of events1) {
                        for (const event2 of events2) {
                            const timeDiff = Math.abs(event1.timestamp - event2.timestamp);
                            if (timeDiff < 5000) {
                                correlationStrength += 1.0 - (timeDiff / 5000);
                                totalCount++;
                            }
                        }
                    }

                    if (totalCount > 0) {
                        const normalizedStrength = correlationStrength / (events1.length * events2.length);
                        if (normalizedStrength > 0.3) {
                            correlations.push({
                                type1,
                                type2,
                                strength: normalizedStrength
                            });
                        }
                    }
                }
            }
        }

        return correlations;
    }

    detectAnomalies(eventStream) {
        const anomalies = [];

        if (eventStream.length > 10) {
            const values = eventStream.map(e => e.value || 0);
            const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
            const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
            const stdDev = Math.sqrt(variance);

            for (let i = 0; i < eventStream.length; i++) {
                const event = eventStream[i];
                const value = event.value || 0;
                if (Math.abs(value - mean) > 2 * stdDev) {
                    anomalies.push({
                        type: 'statistical_outlier',
                        timestamp: event.timestamp || Date.now(),
                        severity: Math.min(1.0, Math.abs(value - mean) / (3 * stdDev))
                    });
                }
            }
        }

        return anomalies;
    }

    detectTrends(eventStream) {
        const trends = [];

        if (eventStream.length > 5) {
            const values = eventStream.map(e => e.value || 0);
            const times = eventStream.map(e => e.timestamp || 0);

            const n = values.length;
            let sumX = 0,
                sumY = 0,
                sumXY = 0,
                sumXX = 0;

            for (let i = 0; i < n; i++) {
                sumX += times[i];
                sumY += values[i];
                sumXY += times[i] * values[i];
                sumXX += times[i] * times[i];
            }

            const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);

            if (Math.abs(slope) > 0.001) {
                const direction = slope > 0 ? 'increasing' : 'decreasing';
                const strength = Math.min(1.0, Math.abs(slope) * 1000);

                trends.push({
                    type: 'linear_trend',
                    direction,
                    strength
                });
            }
        }

        return trends;
    }
}

export default PatternDetector;
