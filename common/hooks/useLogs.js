import { useState, useEffect } from 'react';

/**
 * A "headless" React hook to manage and access agent logs.
 * It subscribes to log events from an agent service and provides the log history.
 *
 * @param {ApiService} agentService - An instance of ApiService or a compatible service.
 * @returns {string[]} An array of log messages.
 */
const useLogs = (agentService) => {
    const [logs, setLogs] = useState([]);

    useEffect(() => {
        if (!agentService) {
            return;
        }

        const handleLog = (logMessage) => {
            setLogs((prevLogs) => [...prevLogs, logMessage]);
        };

        // Subscribe to log events
        agentService.on('log', handleLog);

        // Cleanup subscription on unmount
        return () => {
            agentService.off('log', handleLog);
        };
    }, [agentService]);

    return logs;
};

export default useLogs;