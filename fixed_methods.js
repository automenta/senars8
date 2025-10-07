/**
 * Track temporal caching effectiveness
 * @param {boolean} hit - Whether the cache was hit
 */
trackCaching(hit)
{
    if (hit) {
        this.cachingStats.hits++;
    } else {
        this.cachingStats.misses++;
    }
    this.cachingStats.totalRequests++;
}

/**
 * Get temporal caching statistics
 * @returns {object} Caching statistics
 */
getCachingStats()
{
    const effectiveness = this.cachingStats.totalRequests > 0 ?
        this.cachingStats.hits / this.cachingStats.totalRequests : 0;
    return {
        ...this.cachingStats,
        effectiveness
    };
}
}

export default TemporalReasoner;